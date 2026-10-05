/* 사용자 시점 시나리오 — 왼쪽은 보이는 화면, 오른쪽은 실제로 일어나는 일.
 *
 * 왜 둘로 나누나
 * -------------
 * 이 프로젝트의 결론은 「안 보일 뿐 그대로 돕니다」다.  그 말을 글로 하면
 * 와닿지 않는다.  **같은 순간에 사용자가 보는 것과 시스템이 하는 일을 나란히
 * 놓으면** 그 격차가 그림으로 보인다 — 왼쪽은 계속 단순하고, 오른쪽만 바쁘다.
 *
 * 발표자가 방향키로 넘긴다 (구조 흐름도와 같은 방식).
 */
import { paperize } from './paper.js';
import { gsap } from 'gsap';

const C = {
  amber: '#f5b355', teal: '#5fcfb0', red: '#f27a6d', green: '#95cf70',
  ink: '#f4f3ef', ink2: '#c7c8ce', ink3: '#9b9da6',
  line: '#3d4250', plate: '#1c1f27', ground2: '#14161c',
};
paperize(C);

/* 채팅 앱 화면은 **흰색 기본 테마**로 그린다 — ChatGPT·Claude 를 처음 여는 사람이
 * 보는 모습이 그것이라 청중이 「내가 쓰는 그 화면」으로 바로 알아본다.
 * 바탕이 흰색이므로 강조색은 web/ 의 잉크 단계(흰 바탕에서 4.5:1 이상)를 쓴다.
 * 시스템 쪽(방화벽·검사 단계) 패널은 화면이 아니므로 어두운 채로 둔다. */
const L = {
  amber: '#8A5A06', teal: '#0D7A63', red: '#B3251A', green: '#3F7A24',
  ink: '#1d1d1f', ink2: '#3c3c43', ink3: '#6e6e73',
  line: '#dcdce2', plate: '#ffffff', ground2: '#f4f4f6', ground: '#ffffff',
  dot: '#d1d1d6', hover: '#ececf1', bubble: '#f0f0f3',
};

const LX = 40, LW = 790, RX = 872, RW = 688, TOP = 72, BODY = 476;
const SB = 176;                       // 사이드바 너비
const MX = LX + SB, MW = LW - SB;     // 본문 영역

/* ── 채팅 앱 껍데기 ──────────────────────────────────────────
 * ChatGPT·Claude 가 공유하는 모양을 그린다 — 왼쪽 대화 목록, 가운데 메시지,
 * 아래 입력줄, 위 모델 선택.  **가짜 스크린샷이 아니다.** 우리가 그린 도식이고
 * 제품 이름은 글자로만 적는다. 청중이 「내가 쓰는 그 화면」으로 알아보면 된다.
 */
function chatShell({ url, urlColor, accent, sidebar = true, dim = false, main = '' }) {
  const o = dim ? 0.3 : 1;
  const convo = ['장학금 지급 기준 정리', '연구비 정산 서류', '학칙 제38조 해석'];
  return `
    <rect x="${LX}" y="${TOP}" width="${LW}" height="${BODY}" rx="14"
          fill="${L.plate}" stroke="${L.line}" stroke-width="1.5"/>
    <!-- 창 상단 -->
    <line x1="${LX}" y1="${TOP + 46}" x2="${LX + LW}" y2="${TOP + 46}" stroke="${L.line}"/>
    <circle cx="${LX + 24}" cy="${TOP + 23}" r="4.5" fill="${L.dot}"/>
    <circle cx="${LX + 40}" cy="${TOP + 23}" r="4.5" fill="${L.dot}"/>
    <circle cx="${LX + 56}" cy="${TOP + 23}" r="4.5" fill="${L.dot}"/>
    <rect x="${LX + 78}" y="${TOP + 11}" width="${LW - 110}" height="24" rx="12"
          fill="${L.ground2}" stroke="${L.line}"/>
    <text x="${LX + 94}" y="${TOP + 28}" font-size="13.5" fill="${urlColor}">${url}</text>

    ${sidebar ? `
    <g opacity="${o}">
      <rect x="${LX}" y="${TOP + 46}" width="${SB}" height="${BODY - 46}"
            fill="${L.ground2}"/>
      <line x1="${MX}" y1="${TOP + 46}" x2="${MX}" y2="${TOP + BODY}" stroke="${L.line}"/>
      <rect x="${LX + 16}" y="${TOP + 64}" width="${SB - 32}" height="34" rx="9"
            fill="${accent}" fill-opacity="0.14" stroke="${accent}" stroke-width="1.2"/>
      <path d="M${LX + 34} ${TOP + 81} h14 M${LX + 41} ${TOP + 74} v14"
            stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/>
      <text x="${LX + 58}" y="${TOP + 86}" font-size="13" font-weight="600" fill="${accent}">새 대화</text>
      <text x="${LX + 18}" y="${TOP + 128}" font-size="11.5" fill="${L.ink3}"
            letter-spacing="1">최근</text>
      ${convo.map((t, i) => `
        <g>
          <rect x="${LX + 12}" y="${TOP + 140 + i * 34}" width="${SB - 24}" height="28" rx="7"
                fill="${i === 0 ? L.hover : 'none'}"/>
          <text x="${LX + 24}" y="${TOP + 159 + i * 34}" font-size="12"
                fill="${i === 0 ? L.ink2 : L.ink3}">${t}</text>
        </g>`).join('')}
      <circle cx="${LX + 30}" cy="${TOP + BODY - 32}" r="12" fill="${accent}" fill-opacity="0.2"/>
      <text x="${LX + 30}" y="${TOP + BODY - 27}" text-anchor="middle" font-size="11"
            font-weight="700" fill="${accent}">김</text>
      <text x="${LX + 50}" y="${TOP + BODY - 28}" font-size="12" fill="${L.ink2}">김○○ · 행정팀</text>
    </g>` : ''}
    ${main}`;
}

/** 모델 선택 알약 — 이 화면이 AI 챗이라는 가장 빠른 신호다. */
function modelPill(label, accent) {
  return `
    <rect x="${MX + 20}" y="${TOP + 60}" width="196" height="28" rx="14"
          fill="${L.ground2}" stroke="${L.line}"/>
    <circle cx="${MX + 36}" cy="${TOP + 74}" r="4" fill="${accent}"/>
    <text x="${MX + 48}" y="${TOP + 79}" font-size="12.5" fill="${L.ink2}">${label}</text>
    <path d="M${MX + 198} ${TOP + 71} l5 5 l5 -5" stroke="${L.ink3}" stroke-width="1.4"
          fill="none" stroke-linecap="round"/>`;
}

function userMsg(y, text, w = 430) {
  const x = MX + MW - 24 - w;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="44" rx="12" fill="${L.bubble}"/>
    <text x="${x + 18}" y="${y + 28}" font-size="14" fill="${L.ink}">${text}</text>`;
}

function aiMsg(y, lines, accent, idBase = '') {
  return `
    <rect x="${MX + 24}" y="${y}" width="26" height="26" rx="7"
          fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="1.1"/>
    <circle cx="${MX + 37}" cy="${y + 13}" r="4.5" fill="${accent}"/>
    ${lines.map((l, i) => `<text ${idBase ? `id="${idBase}${i}"` : ''}
          x="${MX + 62}" y="${y + 19 + i * 24}" font-size="14"
          fill="${L.ink2}">${l}</text>`).join('')}`;
}

/** 입력줄 — 첨부 클립과 보내기 단추까지 그린다.
 *  첨부가 있으면 실제 챗 UI 처럼 **입력 칸 위에 한 줄을 더** 만든다.
 *  같은 줄에 두면 클립 아이콘과 칩이 겹친다. */
function inputBar(placeholder, accent, chip = '', type = null) {
  const h = chip ? 116 : 72;
  const y = TOP + BODY - 24 - h;
  const row = chip ? y + 76 : y + 36;   // 글자·단추가 놓이는 줄
  return `
    <rect x="${MX + 24}" y="${y}" width="${MW - 48}" height="${h}" rx="14"
          fill="${L.ground2}" stroke="${L.line}" stroke-width="1.3"/>
    ${chip ? chip(MX + 44, y + 12) : ''}
    <path d="M${MX + 48} ${row - 4} v-6 a7 7 0 0 1 14 0 v14 a11 11 0 0 1 -22 0 v-12"
          fill="none" stroke="${L.ink3}" stroke-width="1.5" stroke-linecap="round"/>
    ${type
      ? `<text id="${type.typeId}" x="${MX + 76}" y="${row}" font-size="13.5" fill="${L.ink}"></text>
         <rect id="${type.cursorId}" x="${MX + 76}" y="${row - 14}" width="2.5" height="18"
               fill="${accent}" opacity="0"/>`
      : `<text x="${MX + 76}" y="${row}" font-size="13.5" fill="${L.ink3}">${placeholder}</text>`}
    <circle cx="${MX + MW - 52}" cy="${row - 4}" r="16" fill="${accent}"/>
    <path d="M${MX + MW - 60} ${row - 4} h14 M${MX + MW - 52} ${row - 11} l7 7 l-7 7"
          stroke="${L.ground}" stroke-width="2.4" fill="none"
          stroke-linecap="round" stroke-linejoin="round"/>`;
}

function fileChip(x, y, name) {
  return `
    <rect x="${x}" y="${y}" width="262" height="32" rx="8"
          fill="${L.amber}" fill-opacity="0.13" stroke="${L.amber}" stroke-width="1.2"/>
    <path d="M${x + 20} ${y + 20} v-5 a5 5 0 0 1 10 0 v10 a8 8 0 0 1 -16 0 v-9"
          fill="none" stroke="${L.amber}" stroke-width="1.4" stroke-linecap="round"/>
    <text x="${x + 40} " y="${y + 21}" font-size="13" fill="${L.amber}">${name}</text>`;
}

/** 오른쪽 — 그 순간 시스템이 하는 일. */
function behind(title, color, rows) {
  return `
    <rect x="${RX}" y="${TOP}" width="${RW}" height="${BODY}" rx="14"
          fill="${C.ground2}" stroke="${color}" stroke-width="1.4" stroke-opacity="0.6"/>
    <text x="${RX + 26}" y="${TOP + 36}" font-size="16" font-weight="700" fill="${color}">${title}</text>
    <line x1="${RX + 26}" y1="${TOP + 52}" x2="${RX + RW - 26}" y2="${TOP + 52}" stroke="${C.line}"/>
    ${rows.map((r, i) => {
      const [label, detail, mark] = r;
      const y = TOP + 96 + i * 66;
      return `
        <g>
          <circle cx="${RX + 42}" cy="${y - 6}" r="12"
                  fill="${mark === 'x' ? C.red : color}" fill-opacity="0.16"
                  stroke="${mark === 'x' ? C.red : color}" stroke-width="1.3"/>
          <text x="${RX + 42}" y="${y - 1}" text-anchor="middle" font-size="12"
                font-weight="700" fill="${mark === 'x' ? C.red : color}">${mark === 'x' ? '✕' : i + 1}</text>
          <text x="${RX + 70}" y="${y - 2}" font-size="15.5" font-weight="600" fill="${C.ink}">${label}</text>
          <text x="${RX + 70}" y="${y + 21}" font-size="13.5" fill="${C.ink2}">${detail}</text>
        </g>`;
    }).join('')}`;
}

/** 여섯 장면. [왼쪽 — 사용자가 보는 화면, 오른쪽 — 실제로 일어나는 일] */
const SCENES = [
  // 1 — 평소 쓰던 그 화면을 연다
  [
    chatShell({
      url: 'chatgpt.com', urlColor: L.ink2, accent: L.ink3, dim: true,
      main: `
        <g opacity="0.35">
          ${modelPill('GPT-5', L.ink3)}
          ${aiMsg(TOP + 140, ['무엇을 도와드릴까요?'], L.ink3)}
        </g>
        <text x="${MX + 24}" y="${TOP + 250}" font-size="18" fill="${L.ink2}">연결하는 중…</text>
        <text x="${MX + 24}" y="${TOP + 282}" font-size="14" fill="${L.ink3}">평소 쓰던 그 화면을 열었습니다.</text>`,
    }),
    behind('캠퍼스 방화벽', C.red, [
      ['TLS 핸드셰이크 시작', 'ClientHello 의 SNI = chatgpt.com'],
      ['차단 목록과 대조', '알려진 생성형 AI 도메인', 'x'],
      ['연결 거부', '복호화하지 않습니다 — 끊을 뿐입니다', 'x'],
    ]),
  ],
  // 2 — 안내가 뜬다
  [
    chatShell({
      url: 'chatgpt.com', urlColor: L.red, accent: L.ink3, dim: true,
      main: `
        <rect x="${MX + 28}" y="${TOP + 110}" width="${MW - 56}" height="212" rx="14"
              fill="rgba(179,37,26,.06)" stroke="${L.red}" stroke-width="1.5"/>
        <circle cx="${MX + 64}" cy="${TOP + 152}" r="15" fill="none" stroke="${L.red}" stroke-width="1.8"/>
        <path d="M${MX + 57} ${TOP + 145} l14 14 M${MX + 71} ${TOP + 145} l-14 14"
              stroke="${L.red}" stroke-width="2" stroke-linecap="round"/>
        <text x="${MX + 92}" y="${TOP + 158}" font-size="17" font-weight="700"
              fill="${L.red}">외부 생성형 AI 직접 접속은 차단돼 있습니다</text>
        <text x="${MX + 54}" y="${TOP + 198}" font-size="14.5" fill="${L.ink2}">교내 AI 포털에서 같은 모델을 쓸 수 있습니다.</text>
        <text x="${MX + 54}" y="${TOP + 224}" font-size="14.5" fill="${L.ink2}">학교 계정으로 바로 들어가고, 비용은 기관이 부담합니다.</text>
        <rect x="${MX + 54}" y="${TOP + 250}" width="216" height="46" rx="11"
              fill="${L.teal}" fill-opacity="0.18" stroke="${L.teal}" stroke-width="1.5"/>
        <text x="${MX + 162}" y="${TOP + 279}" text-anchor="middle" font-size="15"
              font-weight="700" fill="${L.teal}">교내 AI 포털 열기</text>`,
    }),
    behind('안내 서버', C.amber, [
      ['DNS 싱크홀', '교내 안내 서버로 보냅니다'],
      ['왜 안내가 필요한가', '그냥 끊으면 「인터넷 고장났다」고 전산실에 전화합니다'],
      ['대안을 같은 화면에서', '막기만 하면 사람들은 폰을 꺼냅니다'],
    ]),
  ],
  // 3 — 포털. 이미 로그인돼 있다
  [
    chatShell({
      url: 'aiportal.kaist.ac.kr', urlColor: L.teal, accent: L.teal,
      main: `
        ${modelPill('Claude Sonnet 5', L.teal)}
        ${aiMsg(TOP + 130, ['안녕하세요 김○○ 님. 무엇을 도와드릴까요?',
                            '학칙·연구비 규정은 교내 자료에서 바로 찾아 드립니다.'], L.teal)}
        ${inputBar('메시지를 입력하세요…', L.teal)}`,
    }),
    behind('포털 · 인증', C.teal, [
      ['교내 SSO 로 로그인', '계정을 새로 만들지 않습니다 — 이미 로그인돼 있습니다'],
      ['권한 등급 확인', '행정팀 → CLR-2. 같은 질문도 등급에 따라 다른 답이 나옵니다'],
      ['교내 자료 연동', '「우리 학과 졸업요건」에 외부 AI 는 답할 수 없습니다'],
    ]),
  ],
  // 4 — 평소처럼 묻고 평소처럼 첨부한다
  [
    chatShell({
      url: 'aiportal.kaist.ac.kr', urlColor: L.teal, accent: L.teal,
      main: `
        ${modelPill('Claude Sonnet 5', L.teal)}
        ${aiMsg(TOP + 118, ['안녕하세요 김○○ 님. 무엇을 도와드릴까요?'], L.teal)}
        ${inputBar('', L.teal, (x, y) => fileChip(x, y, '장학생_명단_2026.xlsx'), {
          typeId: 'type-q', cursorId: 'cur-q',
        })}`,
    }),
    behind('출국 검사 — 사용자는 못 봅니다', C.amber, [
      ['첨부파일을 훑습니다', '주민등록번호 1,204건 발견'],
      ['판정 = SANITIZE', '가방째 압수하지 않습니다 — 금지 물건만 뺍니다'],
      ['마스킹 후 전달', '외부 AI 는 900101-******* 만 받습니다'],
    ]),
  ],
  // 5 — 답이 온다
  [
    chatShell({
      url: 'aiportal.kaist.ac.kr', urlColor: L.teal, accent: L.teal,
      main: `
        ${modelPill('Claude Sonnet 5', L.teal)}
        ${userMsg(TOP + 110, '이번 학기 장학금 지급 대상자 명단 정리해 줘', 440)}
        ${aiMsg(TOP + 174, ['', '', ''], L.teal, 'type-a')}
        <rect id="cur-a" x="${MX + 62}" y="${TOP + 177}" width="2.5" height="19"
              fill="${L.teal}" opacity="0"/>
        ${inputBar('메시지를 입력하세요…', L.teal)}`,
    }),
    behind('입국 검사 — 흐르는 중에', C.green, [
      ['꼬리를 붙잡고 흘려보냅니다', '끝에서 240자는 내보내지 않습니다'],
      ['왜 붙잡나', '그냥 흘리면 카나리아가 화면에 뜬 뒤에 걸립니다'],
      ['감사 기록', '시각·유형·판정만. 원문은 저장하지 않습니다'],
    ]),
  ],
  // 6 — 결론
  [
    chatShell({
      url: 'aiportal.kaist.ac.kr', urlColor: L.teal, accent: L.teal,
      main: `
        ${modelPill('Claude Sonnet 5', L.teal)}
        <text x="${MX + 28}" y="${TOP + 182}" font-size="23" font-weight="700" fill="${L.ink}">사용자가 의식한 것은</text>
        <text x="${MX + 28}" y="${TOP + 222}" font-size="23" font-weight="700" fill="${L.teal}">주소가 바뀐 것 하나뿐입니다.</text>
        <text x="${MX + 28}" y="${TOP + 274}" font-size="15" fill="${L.ink2}">여권을 꺼낼 일도, 가방을 열어 보일 일도 없었습니다.</text>
        <text x="${MX + 28}" y="${TOP + 302}" font-size="15" fill="${L.ink2}">검사대가 있다는 것조차 몰랐습니다.</text>
        ${inputBar('메시지를 입력하세요…', L.teal)}`,
    }),
    behind('그 사이 시스템이 한 일', C.teal, [
      ['출국 검사 8단계', '정규화 · 이상 · 자격증명 · 개인정보 · NER · 인젝션 · 유해 · 등급'],
      ['판정과 마스킹', '주민등록번호 1,204건을 치환해 내보냈습니다'],
      ['입국 검사 6단계 + 기록', '합쳐서 약 6 ms. AI 회사가 첫 응답을 주기도 전에 끝났습니다'],
    ]),
  ],
];

export const USER_STEPS = SCENES.length;

export function buildUserScenario(host) {
  const uid = 'user-svg';
  host.innerHTML = `
    <svg id="${uid}" viewBox="0 0 1600 600" role="img" aria-labelledby="${uid}-t ${uid}-d"
         preserveAspectRatio="xMidYMid meet" font-family="'Noto Sans KR', system-ui, sans-serif">
      <title id="${uid}-t">사용자 시점 시나리오 — 보이는 화면과 실제로 일어나는 일</title>
      <desc id="${uid}-d">교직원이 평소처럼 외부 생성형 AI 주소를 열면 차단되고 안내 페이지가 뜬다.
        교내 포털에서 학교 계정으로 들어가 평소와 똑같이 묻고 파일을 첨부하면, 보이지 않는 곳에서
        출국 검사가 주민등록번호를 치환해 내보내고 돌아온 답변을 다시 검사한다.
        사용자가 의식한 것은 주소가 바뀐 것 하나뿐이다.</desc>
      <text x="${LX}" y="52" font-size="14.5" font-weight="700" fill="${C.ink3}"
            letter-spacing="1.4">사용자가 보는 화면</text>
      <text x="${RX}" y="52" font-size="14.5" font-weight="700" fill="${C.ink3}"
            letter-spacing="1.4">그 순간 실제로 일어나는 일</text>
      ${SCENES.map((sc, i) => `<g id="us-${i}" opacity="${i === 0 ? 1 : 0}">${sc[0]}${sc[1]}</g>`).join('')}
    </svg>`;
  return host.querySelector('svg');
}

export const Q_TEXT = '이번 학기 장학금 지급 대상자 명단 정리해 줘';
export const A_LINES = [
  '요청하신 명단을 기준별로 정리했습니다.',
  '성적 우수 32명 · 가계 곤란 18명 · 특기자 7명.',
  '지급액 합계는 1억 8,400만 원입니다.',
];

/** 글자를 한 자씩 찍고 커서를 끝에 붙여 간다. */
function typeInto(el, cursor, text, duration, delay = 0) {
  const o = { n: 0 };
  el.textContent = '';
  if (cursor) gsap.set(cursor, { opacity: 1, x: 0 });
  return gsap.to(o, {
    n: text.length,
    duration,
    delay,
    ease: 'none',
    onUpdate() {
      el.textContent = text.slice(0, Math.round(o.n));
      if (!cursor) return;
      let w = 0;
      try {
        w = el.getComputedTextLength();
      } catch {
        w = 0;
      }
      gsap.set(cursor, { x: w });
    },
  });
}

/** 커서 깜빡임 — 멈춰 있을 때만 깜빡인다. */
function blink(cursor) {
  return gsap.to(cursor, {
    opacity: 0, duration: 0.5, repeat: -1, yoyo: true, ease: 'steps(1)',
  });
}

export function makeUserController(svg, reduced) {
  const groups = SCENES.map((_, i) => svg.querySelector(`#us-${i}`));
  const $ = (id) => svg.querySelector('#' + id);
  let running = null;

  /** 타이핑·스트리밍이 있는 장면은 들어올 때마다 다시 재생한다. */
  function play(i) {
    if (running) running.kill();
    running = null;
    const qEl = $('type-q'), qCur = $('cur-q');
    const aEls = [0, 1, 2].map((k) => $('type-a' + k));
    const aCur = $('cur-a');

    if (reduced) {
      // 모션을 끄면 완성된 화면이 남는다 — 커서는 지운다.
      if (qEl) qEl.textContent = Q_TEXT;
      aEls.forEach((el, k) => el && (el.textContent = A_LINES[k]));
      [qCur, aCur].forEach((c) => c && gsap.set(c, { opacity: 0 }));
      return;
    }

    if (i === 3 && qEl) {
      // 사용자가 입력창에 묻는 중
      const tl = gsap.timeline();
      tl.add(typeInto(qEl, qCur, Q_TEXT, 1.6, 0.3));
      tl.add(blink(qCur));
      running = tl;
    } else if (i === 4 && aEls[0]) {
      // 답변이 흘러나온다 — 줄이 끝나면 커서가 다음 줄로 내려간다
      const tl = gsap.timeline();
      aEls.forEach((el, k) => {
        if (!el) return;
        tl.call(() => {
          if (aCur) gsap.set(aCur, { y: k * 24, opacity: 1 });
        });
        tl.add(typeInto(el, aCur, A_LINES[k], 0.75 + k * 0.1, k === 0 ? 0.35 : 0.1));
      });
      tl.to(aCur, { opacity: 0, duration: 0.3 });
      running = tl;
    } else {
      // 다른 장면으로 가면 흔적을 지운다
      if (qEl) qEl.textContent = '';
      aEls.forEach((el) => el && (el.textContent = ''));
      [qCur, aCur].forEach((c) => c && gsap.set(c, { opacity: 0 }));
    }
  }

  return function goto(index) {
    const n = Math.max(0, Math.min(index, groups.length - 1));
    groups.forEach((g, i) => {
      const on = i === n;
      if (reduced) {
        gsap.set(g, { opacity: on ? 1 : 0 });
        return;
      }
      gsap.to(g, { opacity: on ? 1 : 0, duration: 0.34, overwrite: true });
      if (on) {
        gsap.fromTo(g, { y: 10 }, { y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'transform' });
      }
    });
    play(n);
  };
}
