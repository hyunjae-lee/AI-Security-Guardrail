"use strict";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const state = { config: null, samples: [], canary: null, running: false, run: {} };

// --------------------------------------------------------------- word diff
// LCS-based token diff. Whitespace is kept as tokens so redaction tokens like
// [REDACTED:RRN] (no internal spaces) stay atomic and align cleanly.
function diffWords(a, b) {
  const A = (a || "").split(/(\s+)/);
  const B = (b || "").split(/(\s+)/);
  const CAP = 1600; // guard against length-bomb inputs
  if (A.length > CAP || B.length > CAP) {
    return [{ t: "eq", s: (a || "").slice(0, 400) + " …(생략)" }];
  }
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) out.push({ t: "eq", s: A[i++] }), j++;
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ t: "del", s: A[i++] });
    else out.push({ t: "ins", s: B[j++] });
  }
  while (i < n) out.push({ t: "del", s: A[i++] });
  while (j < m) out.push({ t: "ins", s: B[j++] });
  return out;
}

// Full diff for the guarded side (deletions struck, insertions highlighted).
function renderDiff(parts) {
  return parts
    .map((p) =>
      p.t === "eq" ? esc(p.s) : p.t === "del" ? `<del>${esc(p.s)}</del>` : `<ins>${esc(p.s)}</ins>`
    )
    .join("");
}

// Original text as the unguarded lane sent it — the parts the guardrail *would*
// have removed are marked as raw exposure.
function renderOriginalWithExposure(parts) {
  return parts
    .filter((p) => p.t !== "ins")
    .map((p) => (p.t === "del" ? `<span class="danger-tok">${esc(p.s)}</span>` : esc(p.s)))
    .join("");
}

function redactionSummary(parts) {
  const counts = {};
  for (const p of parts) {
    if (p.t !== "ins") continue;
    const m = p.s.match(/\[REDACTED:(\w+)\]/);
    if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  return Object.entries(counts).map(([k, v]) => `${k}×${v}`);
}

const ACTION_META = {
  block: { label: "차단", cls: "v-block" },
  sanitize: { label: "가리고 전달", cls: "v-sanitize" },
  flag: { label: "전달 + 기록에 표시", cls: "v-flag" },
  allow: { label: "그대로 통과", cls: "v-allow" },
};
const ACTION_SHORT = { block: "차단", sanitize: "가림", flag: "표시", allow: "통과" };

// 엔진의 검사기 이름 → 화면용 쉬운 이름과 「무엇을 묻는가」.
// 엔진 문자열(app/guardrail/)은 그대로 두고 화면에서만 바꾼다 — 발표 덱의 표현과 맞춘다.
const STAGE_LABEL = {
  normalizer: ["정규화", "숨기거나 꼬아 쓴 글자를 펼쳐 봅니다"],
  anomaly: ["이상 탐지", "너무 길거나 같은 말이 반복되나"],
  secrets: ["자격증명", "비밀번호·API 키가 섞였나"],
  pii: ["개인정보", "주민·카드번호 등 — 있으면 가립니다"],
  presidio_pii: ["한국어 이름·주소", "사람 이름·주소가 있나 (AI 모델)"],
  injection: ["인젝션", "「규칙 무시」 같은 조작 시도인가"],
  pi_model: ["ML 인젝션 분류기", "측정 후 기본 꺼짐"],
  nemo_rails: ["NeMo 레일", "외부 안전 규칙"],
  harmful: ["유해 요청", "무기·해킹을 만들어 달라는가"],
  rag_access: ["권한·등급", "내 권한으로 볼 수 있는 자료인가"],
  data_classifier: ["데이터 등급", "5등급 중 어디에 해당하나"],
  canary: ["카나리아", "AI 에 숨긴 표식이 답에 나왔나"],
  secrets_leak: ["자격증명", "답에 비밀번호·키가 섞였나"],
  pii_leak: ["개인정보", "가린 정보가 답에서 되살아났나"],
  exfil: ["반출 링크", "링크·이미지에 정보를 실어 보내나"],
  harmful_output: ["응답 유해성", "위험한 내용을 답했나"],
  refusal_consistency: ["거절 확인", "막아야 할 질문에 AI 가 답했나 — 기록만 합니다"],
};
const SEV_LABEL = { critical: "심각", high: "높음", medium: "중간", low: "낮음", info: "참고" };

// ---------------------------------------------------------------- bootstrap
async function boot() {
  wireTabs();
  wireRun();
  try {
    const [cfg, samples] = await Promise.all([
      fetch("/api/config").then((r) => r.json()),
      fetch("/api/samples").then((r) => r.json()),
    ]);
    state.config = cfg;
    state.samples = samples.samples || [];
    populateSelectors(cfg, samples);
    renderIntegrations(cfg.integrations || {});
  } catch (e) {
    console.error(e);
  }
}

function populateSelectors(cfg, samples) {
  const profileSel = $("#profile");
  profileSel.innerHTML = "";
  (cfg.profiles || []).forEach((p) => {
    const o = document.createElement("option");
    o.value = p.name;
    o.textContent = p.label;
    o.title = p.description;
    if (p.name === (cfg.defaults?.profile || "balanced")) o.selected = true;
    profileSel.appendChild(o);
  });

  const backendSel = $("#backend");
  backendSel.innerHTML = "";
  (cfg.backends || []).forEach((b) => {
    const o = document.createElement("option");
    o.value = b.id;
    o.textContent = b.label + (b.available ? "" : " — 확장 필요 (기관 API 키)");
    o.disabled = !b.available;
    o.title = b.description;
    backendSel.appendChild(o);
  });

  const clrSel = $("#clearance");
  if (clrSel) {
    clrSel.innerHTML = "";
    (cfg.clearances || []).forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.label;
      if (c.id === (cfg.defaults?.clearance || "student")) o.selected = true;
      clrSel.appendChild(o);
    });
  }

  const scoreSel = $("#scoring");
  if (scoreSel) {
    scoreSel.innerHTML = "";
    (cfg.scoring_modes || []).forEach((s) => {
      const o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.label;
      if (s.id === (cfg.defaults?.scoring || "worst_decay")) o.selected = true;
      scoreSel.appendChild(o);
    });
  }

  const sampleSel = $("#sample");
  const cats = {};
  (samples.categories || []).forEach((c) => (cats[c.id] = c.label));
  samples.samples.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = `[${cats[s.category] || s.category}] ${s.label}`;
    sampleSel.appendChild(o);
  });
  sampleSel.addEventListener("change", () => {
    const s = state.samples.find((x) => x.id === sampleSel.value);
    if (!s) return;
    $("#prompt").value = s.prompt;
    // Selecting a role-scoped sample sets the requester clearance so the
    // RAG access-control demo reflects that role.
    if (s.clearance && $("#clearance")) {
      const opt = Array.from($("#clearance").options).find((o) => o.value === s.clearance);
      if (opt) $("#clearance").value = s.clearance;
    }
  });
}

function renderIntegrations(integ) {
  const box = $("#integrations");
  const items = [
    { id: "presidio", label: "한국어 이름·주소 인식 (Presidio)", status: integ.presidio_status },
    { id: "nemo", label: "NVIDIA NeMo Guardrails", status: integ.nemo_status },
  ];
  box.innerHTML = items
    .map((i) => {
      const on = !!integ[i.id];
      const st = i.status && i.status !== "off" ? ` · ${esc(i.status)}` : "";
      return `<span class="integ-chip ${on ? "on" : ""}">${on ? "켜짐 · " : "꺼짐 · "}${esc(
        i.label
      )}${st}</span>`;
    })
    .join("");
}

function wireTabs() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      $$(".view").forEach((v) => v.classList.remove("active"));
      tab.classList.add("active");
      $("#view-" + tab.dataset.view).classList.add("active");
      if (tab.dataset.view === "audit") loadAudit();
    });
  });
}

// ---------------------------------------------------------------- run demo
function wireRun() {
  $("#run").addEventListener("click", runDemo);
}

function resetLanes() {
  $("#ug-response").textContent = "실행 중…";
  $("#ug-response").className = "response";
  $("#ug-leaks").innerHTML = "";
  $("#ug-ai").classList.remove("leaking");
  $("#g-delivered").textContent = "실행 중…";
  $("#g-delivered").className = "response";
  $("#stages-input").innerHTML = "";
  $("#stages-output").innerHTML = "";
  $("#findings").innerHTML = "";
  $("#verdict").className = "verdict hidden";
  ["g-input", "g-output"].forEach((id) => {
    const el = $("#" + id);
    el.classList.remove("active", "blocked", "passed");
  });
  $$(".arrow").forEach((a) => a.classList.remove("flowing"));
  ["di-ug", "di-g", "do-ug", "do-g"].forEach((id) => {
    $("#" + id).innerHTML = "대기 중…";
    $("#" + id).className = "diff-text muted";
  });
  $("#di-note").innerHTML = "";
  $("#do-note").innerHTML = "";
}

function renderDiffs() {
  const g = state.run.guarded;
  const u = state.run.unguarded;
  if (!g) return;

  // ---- ① input payload: 사용자 → AI ----
  if (g.blocked_at === "input") {
    $("#di-ug").className = "diff-text";
    $("#di-ug").innerHTML = renderOriginalWithExposure(diffWords(g.original_prompt, g.forwarded_prompt || ""));
    $("#di-g").className = "diff-text";
    $("#di-g").innerHTML = `<span class="danger-tok">나갈 때 검사에서 차단 — AI 에 전달되지 않음</span>`;
    $("#di-note").innerHTML =
      `<b>가드레일이 없으면</b> 위 질문이 <b>그대로</b> AI 에 전달됩니다. ` +
      `가드레일은 AI 에 닿기 전에 요청 자체를 막았습니다.`;
  } else if (g.forwarded_prompt != null) {
    const parts = diffWords(g.original_prompt, g.forwarded_prompt);
    $("#di-ug").className = "diff-text";
    $("#di-ug").innerHTML = renderOriginalWithExposure(parts);
    $("#di-g").className = "diff-text";
    $("#di-g").innerHTML = renderDiff(parts) || esc(g.forwarded_prompt);
    const red = redactionSummary(parts);
    $("#di-note").innerHTML = g.input_modified
      ? `가드레일이 AI 에 보내기 전에 민감정보 <b>${red.join(", ") || "일부"}</b>를 가렸습니다. ` +
        `가드레일이 없으면 <b>빨간 부분이 원본 그대로</b> AI 에 전달됩니다.`
      : `가릴 민감정보가 없어 <b>원문 그대로</b> 전달됐습니다(위험 신호는 따로 탐지합니다).`;
  }

  // ---- ② response: AI → 사용자 ----
  if (u) {
    const r = u.response || {};
    const txt = r.refused ? "(AI 가 스스로 거절했습니다)" : r.error ? "오류: " + r.error : r.text || "(빈 응답)";
    $("#do-ug").className = "diff-text";
    $("#do-ug").innerHTML = highlightResponse(txt, state.canary);
  }
  if (g.blocked_at === "output") {
    $("#do-g").className = "diff-text";
    $("#do-g").innerHTML = `<span class="danger-tok">들어올 때 검사에서 차단 — 사용자에게 전달되지 않음</span>`;
    $("#do-note").innerHTML =
      `AI 답변에 정책 위반(예: 숨긴 표식·내부 설정 유출)이 있었지만 ` +
      `<b>들어올 때 검사가 전달을 막았습니다</b>. 가드레일이 없으면 그대로 노출됩니다.`;
  } else if (g.blocked_at === "input") {
    $("#do-g").className = "diff-text";
    $("#do-g").innerHTML = `<span class="danger-tok">나갈 때 차단되어 답변 자체가 만들어지지 않음</span>`;
  } else if (g.raw_response != null) {
    const parts = diffWords(g.raw_response, g.delivered_text);
    $("#do-g").className = "diff-text";
    $("#do-g").innerHTML = renderDiff(parts) || esc(g.delivered_text);
    const red = redactionSummary(parts);
    $("#do-note").innerHTML = g.output_modified
      ? `AI 답변에서 <b>${red.join(", ") || "민감정보"}</b>를 가린 뒤 전달했습니다.`
      : `AI 답변에 문제가 없어 <b>그대로</b> 전달됐습니다.`;
  }
}

function stageEl(s) {
  const div = document.createElement("div");
  const hits = s.findings.length;
  const cls = s.action === "block" ? "block" : hits ? "hit" : "clean";
  div.className = `stage ${cls}`;
  const [name, ask] = STAGE_LABEL[s.detector] || [s.title, ""];
  div.title = s.title;
  div.innerHTML = `<span class="s-dot"></span><span class="s-name">${esc(name)}</span>` +
    `<span class="s-count">${s.action === "block" ? "차단" : hits ? hits + "건" : "이상 없음"}</span>` +
    (ask ? `<span class="s-ask">${esc(ask)}</span>` : "");
  requestAnimationFrame(() => div.classList.add("done"));
  return div;
}

function renderFindings(findings, stageLabel) {
  const box = $("#findings");
  if (box.querySelector(".muted")) box.innerHTML = "";
  findings.forEach((f) => {
    const div = document.createElement("div");
    div.className = `finding sev-${f.severity}`;
    div.innerHTML =
      `<span class="sev-badge">${esc(SEV_LABEL[f.severity] || f.severity)}</span>` +
      `<div class="f-body"><div class="f-msg">${esc(f.message)}</div>` +
      `<div class="f-meta"><span class="f-cat">${esc(f.category)}</span>` +
      (f.evidence ? ` · 근거 <span class="f-evidence">${esc(f.evidence)}</span>` : "") +
      ` · <span class="f-stage">${esc(stageLabel)}</span></div></div>` +
      `<div class="f-score">${f.score}</div>`;
    box.appendChild(div);
  });
}

function highlightResponse(text, canary) {
  let html = esc(text);
  if (canary) {
    html = html.replaceAll(esc(canary), `<span class="canary">${esc(canary)}</span>`);
  }
  html = html.replace(/(!\[[^\]]*\]\([^)]*\))/g, '<span class="exfil">$1</span>');
  return html;
}

async function runDemo() {
  if (state.running) return;
  const prompt = $("#prompt").value.trim();
  if (!prompt) return;
  state.running = true;
  state.run = {};
  $("#run").disabled = true;
  $("#conn").textContent = "실행 중";
  resetLanes();

  const body = {
    prompt,
    profile: $("#profile").value,
    backend: $("#backend").value,
    clearance: ($("#clearance") || {}).value || "student",
    scoring: ($("#scoring") || {}).value || "worst_decay",
    compare: true,
    animate: true,
  };

  try {
    const resp = await fetch("/api/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const chunks = buf.split("\n\n");
      buf = chunks.pop();
      for (const chunk of chunks) handleEvent(chunk);
    }
  } catch (e) {
    console.error(e);
    $("#conn").textContent = "오류";
  } finally {
    state.running = false;
    $("#run").disabled = false;
  }
}

function handleEvent(chunk) {
  const lines = chunk.split("\n");
  let event = "message";
  let data = "";
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!data) return;
  let payload;
  try {
    payload = JSON.parse(data);
  } catch {
    return;
  }
  dispatch(event, payload);
}

function dispatch(event, d) {
  switch (event) {
    case "meta":
      state.canary = d.canary;
      break;
    case "unguarded_start":
      $("#ug-arrow-1").classList.add("flowing");
      break;
    case "unguarded_done": {
      $("#ug-arrow-1").classList.remove("flowing");
      const r = d.response || {};
      const txt = r.refused ? "(AI 가 스스로 거절했습니다)" : r.error ? "오류: " + r.error : r.text || "(빈 응답)";
      $("#ug-response").innerHTML = highlightResponse(txt, state.canary);
      if (d.leak_count > 0) {
        $("#ug-response").classList.add("danger");
        $("#ug-ai").classList.add("leaking");
      }
      const leaks = d.leaked || [];
      $("#ug-leaks").innerHTML = leaks
        .map((f) => `<div class="leak-item">${esc(f.message)} <b>${esc(f.category)}</b></div>`)
        .join("");
      state.run.unguarded = d;
      renderDiffs();
      break;
    }
    case "guarded_start":
      $("#g-input").classList.add("active");
      break;
    case "stage": {
      // 실제 검사 시간 = 엔진이 잰 단계별 시간의 합. 화면 연출용 대기(step delay)는 빠진다.
      state.run.engineMs = (state.run.engineMs || 0) + (d.duration_ms || 0);
      const target = d.phase === "input" ? "#stages-input" : "#stages-output";
      $(target).appendChild(stageEl(d));
      if (d.findings?.length) renderFindings(d.findings, d.phase === "input" ? "나갈 때" : "들어올 때");
      if (d.phase === "output") {
        $("#g-input").classList.remove("active");
        $("#g-input").classList.add("passed");
        $("#g-output").classList.add("active");
      }
      break;
    }
    case "input_verdict": {
      const res = d.result;
      if (res.blocked) {
        $("#g-input").classList.remove("active");
        $("#g-input").classList.add("blocked");
      } else {
        $("#g-arrow-model").classList.add("flowing");
      }
      break;
    }
    case "guarded_model_start":
      break;
    case "guarded_model":
      $("#g-arrow-model").classList.remove("flowing");
      $("#g-arrow-out").classList.add("flowing");
      break;
    case "guarded_done": {
      $("#g-arrow-out").classList.remove("flowing");
      $("#g-output").classList.remove("active");
      if (d.blocked_at === "input") {
        $("#g-input").classList.add("blocked");
        $("#g-delivered").textContent = "나갈 때 검사에서 차단되어 AI 에 전달되지 않았습니다.";
        $("#g-delivered").classList.add("danger");
      } else if (d.blocked_at === "output") {
        $("#g-output").classList.add("blocked");
        $("#g-delivered").textContent = "AI 답변에서 정책 위반이 발견되어 전달을 막았습니다.";
        $("#g-delivered").classList.add("danger");
      } else {
        $("#g-output").classList.add("passed");
        $("#g-delivered").innerHTML = highlightResponse(d.delivered_text || "(빈 응답)", null);
      }
      state.run.guarded = d;
      renderDiffs();
      break;
    }
    case "summary":
      showVerdict(d);
      break;
    case "done":
      $("#conn").textContent = "완료";
      break;
    case "error":
      $("#conn").textContent = "오류: " + (d.message || "");
      break;
  }
}

const GRADE_CLS = { 1: "g1", 2: "g2", 3: "g3", 4: "g4", 5: "g5" };

function showVerdict(s) {
  const meta = ACTION_META[s.final_action] || ACTION_META.allow;
  const v = $("#verdict");
  v.className = "verdict " + meta.cls;
  const prevented = s.prevented
    ? `<b class="ok">가드레일이 없었다면 새었을 내용을 막았습니다.</b> `
    : "";
  const grade =
    s.data_grade && s.data_grade_label
      ? `<span class="grade-badge ${GRADE_CLS[s.data_grade] || "g1"}">데이터 ${esc(
          s.data_grade_label
        )}</span>`
      : "";
  const rag =
    (s.rag_denied || []).length > 0
      ? `<span class="grade-badge g4">권한 밖 자료 ${s.rag_denied.length}건 제외</span>`
      : "";
  v.innerHTML =
    `<span class="v-dot"></span>` +
    `<div><div class="v-main">최종 판정 — ${meta.label} ${grade} ${rag}</div>` +
    `<div class="v-detail">${prevented}` +
    `가드레일 없을 때 유출 ${s.unguarded_leak_count}건 · 탐지 ${s.finding_count}건 · ` +
    `점수 나갈 때 ${s.input_score} / 들어올 때 ${s.output_score} · ` +
    `실제 검사 시간 ${(state.run.engineMs || 0).toFixed(2)} ms ` +
    `<span class="muted">(화면 연출 지연 포함 처리 시간 ${Math.round(s.guardrail_overhead_ms)} ms)</span></div></div>`;
}

// ---------------------------------------------------------------- audit
async function loadAudit() {
  try {
    const [stats, audit] = await Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/audit?limit=50").then((r) => r.json()),
    ]);
    renderStats(stats);
    renderAuditRows(audit.entries || []);
  } catch (e) {
    console.error(e);
  }
}

function renderStats(s) {
  const grid = $("#stat-grid");
  const byAction = s.by_action || {};
  const cards = [
    { v: s.total || 0, l: "전체 요청" },
    { v: byAction.block || 0, l: "차단", cls: "danger" },
    { v: (byAction.sanitize || 0) + (byAction.flag || 0), l: "가림 · 기록 표시" },
    { v: byAction.allow || 0, l: "그대로 통과" },
    { v: s.leaks_prevented || 0, l: "막은 유출", cls: "accent" },
    { v: Math.round(s.avg_latency_ms || 0) + " ms", l: "평균 처리 시간 (화면 연출 지연 포함)" },
  ];
  let html = cards
    .map(
      (c) =>
        `<div class="stat-card ${c.cls || ""}"><div class="stat-value">${esc(c.v)}</div>` +
        `<div class="stat-label">${esc(c.l)}</div></div>`
    )
    .join("");

  const top = s.top_categories || [];
  if (top.length) {
    const max = Math.max(...top.map((t) => t.count));
    html +=
      `<div class="stat-card" style="grid-column:1/-1"><div class="stat-label" style="margin-bottom:8px">탐지 유형 분포</div><div class="cat-bars">` +
      top
        .map(
          (t) =>
            `<div class="cat-bar"><span class="f-cat">${esc(t.category)}</span>` +
            `<span class="bar" style="width:${(t.count / max) * 100}%"></span>` +
            `<span>${t.count}</span></div>`
        )
        .join("") +
      `</div></div>`;
  }
  grid.innerHTML = html;
}

function renderAuditRows(rows) {
  const tbody = $("#audit-rows");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">아직 기록이 없습니다. 시뮬레이션을 실행해 보세요.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map((r) => {
      const t = (r.created_at || "").replace("T", " ").replace(/(\+.*|Z)$/, "");
      const cats = (r.categories || []).slice(0, 3).map((c) => `<span class="f-cat">${esc(c)}</span>`).join(", ");
      return (
        `<tr><td>${esc(t)}</td><td>${esc(r.profile)}</td><td>${esc(r.backend)}</td>` +
        `<td><span class="act-badge act-${r.final_action}">${esc(ACTION_SHORT[r.final_action] || r.final_action)}</span></td>` +
        `<td>${r.input_score ?? "-"} / ${r.output_score ?? "-"}</td>` +
        `<td>${cats || "-"}</td>` +
        `<td class="prompt-cell">원문 미저장${r.prompt_length != null ? " · " + r.prompt_length + "자" : ""}</td></tr>`
      );
    })
    .join("");
}

boot();
