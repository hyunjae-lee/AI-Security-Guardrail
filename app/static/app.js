"use strict";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const state = { config: null, samples: [], canary: null, running: false };

const ACTION_META = {
  block: { icon: "⛔", label: "차단됨 (BLOCK)", cls: "v-block" },
  sanitize: { icon: "🧼", label: "치환 후 전달 (SANITIZE)", cls: "v-sanitize" },
  flag: { icon: "🚩", label: "전달 + 검토 표시 (FLAG)", cls: "v-flag" },
  allow: { icon: "✅", label: "정상 통과 (ALLOW)", cls: "v-allow" },
};

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
    o.textContent = b.label + (b.available ? "" : " (미설정)");
    o.disabled = !b.available;
    o.title = b.description;
    backendSel.appendChild(o);
  });

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
    if (s) $("#prompt").value = s.prompt;
  });
}

function renderIntegrations(integ) {
  const box = $("#integrations");
  const items = [
    { id: "presidio", label: "Microsoft Presidio (PII/NER)" },
    { id: "nemo", label: "NVIDIA NeMo Guardrails" },
  ];
  box.innerHTML = items
    .map(
      (i) =>
        `<span class="integ-chip ${integ[i.id] ? "on" : ""}">${integ[i.id] ? "● " : "○ "}${esc(
          i.label
        )}</span>`
    )
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
}

function stageEl(s) {
  const div = document.createElement("div");
  const hits = s.findings.length;
  const cls = s.action === "block" ? "block" : hits ? "hit" : "clean";
  div.className = `stage ${cls}`;
  div.innerHTML = `<span class="s-dot"></span><span class="s-name">${esc(s.title)}</span>` +
    `<span class="s-count">${hits ? hits + "건" : "이상 없음"}</span>`;
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
      `<span class="sev-badge">${esc(f.severity)}</span>` +
      `<div class="f-body"><div class="f-msg">${esc(f.message)}</div>` +
      `<div class="f-meta"><span class="f-cat">${esc(f.category)}</span>` +
      (f.evidence ? ` · 근거: <span class="f-evidence">${esc(f.evidence)}</span>` : "") +
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
  $("#run").disabled = true;
  $("#conn").textContent = "● 연결됨 (SSE)";
  resetLanes();

  const body = {
    prompt,
    profile: $("#profile").value,
    backend: $("#backend").value,
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
    $("#conn").textContent = "● 오류";
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
      const txt = r.refused ? "🛑 (모델이 자체적으로 거절함)" : r.error ? "오류: " + r.error : r.text || "(빈 응답)";
      $("#ug-response").innerHTML = highlightResponse(txt, state.canary);
      if (d.leak_count > 0) {
        $("#ug-response").classList.add("danger");
        $("#ug-ai").classList.add("leaking");
      }
      const leaks = d.leaked || [];
      $("#ug-leaks").innerHTML = leaks
        .map((f) => `<div class="leak-item">⚠️ ${esc(f.message)} <b>[${esc(f.category)}]</b></div>`)
        .join("");
      break;
    }
    case "guarded_start":
      $("#g-input").classList.add("active");
      break;
    case "stage": {
      const target = d.phase === "input" ? "#stages-input" : "#stages-output";
      $(target).appendChild(stageEl(d));
      if (d.findings?.length) renderFindings(d.findings, d.phase === "input" ? "입력검사" : "출력검사");
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
        $("#g-delivered").textContent = "⛔ 입력 파이프라인에서 차단되어 AI에 전달되지 않았습니다.";
        $("#g-delivered").classList.add("danger");
      } else if (d.blocked_at === "output") {
        $("#g-output").classList.add("blocked");
        $("#g-delivered").textContent = "⛔ AI 응답에서 정책 위반이 감지되어 사용자 전달이 차단되었습니다.";
        $("#g-delivered").classList.add("danger");
      } else {
        $("#g-output").classList.add("passed");
        $("#g-delivered").innerHTML = highlightResponse(d.delivered_text || "(빈 응답)", null);
      }
      break;
    }
    case "summary":
      showVerdict(d);
      break;
    case "done":
      $("#conn").textContent = "● 완료";
      break;
    case "error":
      $("#conn").textContent = "● 오류: " + (d.message || "");
      break;
  }
}

function showVerdict(s) {
  const meta = ACTION_META[s.final_action] || ACTION_META.allow;
  const v = $("#verdict");
  v.className = "verdict " + meta.cls;
  const prevented = s.prevented
    ? `<b style="color:var(--safe)">가드레일이 실제 유출을 차단했습니다.</b> `
    : "";
  v.innerHTML =
    `<span class="v-icon">${meta.icon}</span>` +
    `<div><div>가드레일 최종 판정: ${meta.label}</div>` +
    `<div class="v-detail">${prevented}` +
    `무방비 경로 유출 ${s.unguarded_leak_count}건 · 탐지 ${s.finding_count}건 · ` +
    `입력점수 ${s.input_score} / 출력점수 ${s.output_score} · ` +
    `가드레일 오버헤드 ${s.guardrail_overhead_ms}ms</div></div>`;
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
    { v: s.total || 0, l: "총 요청" },
    { v: byAction.block || 0, l: "차단(BLOCK)", cls: "danger" },
    { v: (byAction.sanitize || 0) + (byAction.flag || 0), l: "치환·검토" },
    { v: byAction.allow || 0, l: "정상 통과" },
    { v: s.leaks_prevented || 0, l: "유출 방지", cls: "accent" },
    { v: (s.avg_latency_ms || 0) + "ms", l: "평균 오버헤드" },
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
      `<div class="stat-card" style="grid-column:1/-1"><div class="stat-label" style="margin-bottom:8px">탐지 카테고리 분포</div><div class="cat-bars">` +
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
    tbody.innerHTML = `<tr><td colspan="7" class="muted">아직 기록이 없습니다. 데모를 실행해 보세요.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map((r) => {
      const t = (r.created_at || "").replace("T", " ").replace(/(\+.*|Z)$/, "");
      const cats = (r.categories || []).slice(0, 3).map((c) => `<span class="f-cat">${esc(c)}</span>`).join(", ");
      return (
        `<tr><td>${esc(t)}</td><td>${esc(r.profile)}</td><td>${esc(r.backend)}</td>` +
        `<td><span class="act-badge act-${r.final_action}">${esc(r.final_action)}</span></td>` +
        `<td>${r.input_score ?? "-"} / ${r.output_score ?? "-"}</td>` +
        `<td>${cats || "-"}</td>` +
        `<td class="prompt-cell">${esc(r.prompt_preview || "")}</td></tr>`
      );
    })
    .join("");
}

boot();
