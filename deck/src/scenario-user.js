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
import { gsap } from 'gsap';

const C = {
  amber: '#f0a63a', teal: '#43bc9c', red: '#e25749', green: '#7fbf57',
  ink: '#f4f3ef', ink2: '#a8a9b0', ink3: '#70737d',
  line: '#2e323d', plate: '#1c1f27', ground2: '#14161c',
};

const LX = 48, LW = 700, RX = 840, RW = 712, TOP = 72, BODY = 470;

/** 브라우저 창 — 주소줄 + 본문. */
function browser(url, urlColor, inner) {
  return `
    <rect x="${LX}" y="${TOP}" width="${LW}" height="${BODY}" rx="14"
          fill="${C.plate}" stroke="${C.line}" stroke-width="1.5"/>
    <line x1="${LX}" y1="${TOP + 52}" x2="${LX + LW}" y2="${TOP + 52}" stroke="${C.line}"/>
    <circle cx="${LX + 26}" cy="${TOP + 26}" r="5" fill="#3a3e49"/>
    <circle cx="${LX + 44}" cy="${TOP + 26}" r="5" fill="#3a3e49"/>
    <circle cx="${LX + 62}" cy="${TOP + 26}" r="5" fill="#3a3e49"/>
    <rect x="${LX + 86}" y="${TOP + 13}" width="${LW - 120}" height="26" rx="13"
          fill="${C.ground2}" stroke="${C.line}"/>
    <text x="${LX + 102}" y="${TOP + 31}" font-size="13" fill="${urlColor}">${url}</text>
    ${inner}`;
}

/** 오른쪽 — 그 순간 시스템이 하는 일. */
function behind(title, color, rows) {
  return `
    <rect x="${RX}" y="${TOP}" width="${RW}" height="${BODY}" rx="14"
          fill="${C.ground2}" stroke="${color}" stroke-width="1.4" stroke-opacity="0.6"/>
    <text x="${RX + 26}" y="${TOP + 36}" font-size="15" font-weight="700" fill="${color}">${title}</text>
    <line x1="${RX + 26}" y1="${TOP + 52}" x2="${RX + RW - 26}" y2="${TOP + 52}" stroke="${C.line}"/>
    ${rows.map((r, i) => {
      const [label, detail, mark] = r;
      const y = TOP + 92 + i * 62;
      return `
        <g>
          <circle cx="${RX + 42}" cy="${y - 6}" r="11"
                  fill="${mark === 'x' ? C.red : color}" fill-opacity="0.16"
                  stroke="${mark === 'x' ? C.red : color}" stroke-width="1.3"/>
          <text x="${RX + 42}" y="${y - 1}" text-anchor="middle" font-size="11"
                font-weight="700" fill="${mark === 'x' ? C.red : color}">${mark === 'x' ? '✕' : i + 1}</text>
          <text x="${RX + 68}" y="${y - 2}" font-size="14.5" font-weight="600" fill="${C.ink}">${label}</text>
          <text x="${RX + 68}" y="${y + 20}" font-size="12.5" fill="${C.ink2}">${detail}</text>
        </g>`;
    }).join('')}`;
}

function bubble(x, y, w, h, text, mine) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="11"
          fill="${mine ? '#23262f' : '#1a1d25'}"/>
    <text x="${x + 18}" y="${y + 26}" font-size="13.5" fill="${C.ink2}">${text}</text>`;
}

/** 여섯 장면. [왼쪽, 오른쪽] */
const SCENES = [
  // 1 — 평소처럼 연다
  [
    browser('chatgpt.com', C.ink2, `
      <text x="${LX + 40}" y="${TOP + 200}" font-size="19" fill="${C.ink3}">연결하는 중…</text>
      <text x="${LX + 40}" y="${TOP + 234}" font-size="14" fill="${C.ink3}">평소처럼 주소를 쳤습니다.</text>`),
    behind('캠퍼스 방화벽', C.red, [
      ['TLS 핸드셰이크 시작', 'ClientHello 의 SNI = chatgpt.com'],
      ['차단 목록과 대조', '알려진 생성형 AI 도메인', 'x'],
      ['연결 거부', '복호화하지 않습니다 — 끊을 뿐입니다', 'x'],
    ]),
  ],
  // 2 — 안내 페이지
  [
    browser('chatgpt.com', C.red, `
      <rect x="${LX + 40}" y="${TOP + 110}" width="${LW - 80}" height="200" rx="12"
            fill="rgba(226,87,73,.08)" stroke="${C.red}" stroke-width="1.4"/>
      <text x="${LX + 64}" y="${TOP + 152}" font-size="17" font-weight="700" fill="${C.red}">외부 생성형 AI 직접 접속은 차단돼 있습니다</text>
      <text x="${LX + 64}" y="${TOP + 186}" font-size="14" fill="${C.ink2}">교내 AI 포털에서 같은 모델을 쓸 수 있습니다.</text>
      <text x="${LX + 64}" y="${TOP + 210}" font-size="14" fill="${C.ink2}">학교 계정으로 바로 들어가고, 비용은 기관이 부담합니다.</text>
      <rect x="${LX + 64}" y="${TOP + 236}" width="190" height="44" rx="10"
            fill="${C.teal}" fill-opacity="0.16" stroke="${C.teal}" stroke-width="1.4"/>
      <text x="${LX + 159}" y="${TOP + 264}" text-anchor="middle" font-size="14.5"
            font-weight="700" fill="${C.teal}">교내 AI 포털 열기</text>`),
    behind('안내 서버', C.amber, [
      ['DNS 싱크홀', '교내 안내 서버로 보냅니다'],
      ['왜 안내가 필요한가', '그냥 끊으면 「인터넷 고장났다」고 전산실에 전화합니다'],
      ['대안을 같은 화면에서', '막기만 하면 사람들은 폰을 꺼냅니다'],
    ]),
  ],
  // 3 — 포털 진입
  [
    browser('ai.kaist.ac.kr', C.teal, `
      <text x="${LX + 40}" y="${TOP + 104}" font-size="16" font-weight="700" fill="${C.teal}">KAIST AI 포털</text>
      <text x="${LX + 40}" y="${TOP + 132}" font-size="13.5" fill="${C.ink2}">김○○ 님 (행정팀) 으로 로그인됨</text>
      ${bubble(LX + 40, TOP + 170, 420, 46, '무엇을 도와드릴까요?', false)}
      <rect x="${LX + 40}" y="${TOP + 330}" width="${LW - 80}" height="86" rx="11"
            fill="${C.ground2}" stroke="${C.line}"/>
      <text x="${LX + 62}" y="${TOP + 362}" font-size="13.5" fill="${C.ink3}">메시지를 입력하세요…</text>`),
    behind('포털 · 인증', C.teal, [
      ['교내 SSO 로 로그인', '계정을 새로 만들지 않습니다 — 이미 로그인돼 있습니다'],
      ['권한 등급 확인', '행정팀 → CLR-2. 같은 질문도 등급에 따라 다른 답이 나옵니다'],
      ['모델 선택', 'Claude · GPT · Gemini — 기관 계정으로'],
    ]),
  ],
  // 4 — 평소처럼 묻는다
  [
    browser('ai.kaist.ac.kr', C.teal, `
      ${bubble(LX + 40, TOP + 110, 420, 46, '무엇을 도와드릴까요?', false)}
      ${bubble(LX + 230, TOP + 174, 470, 46, '이번 학기 장학금 지급 대상자 명단 정리해 줘', true)}
      <g>
        <rect x="${LX + 420}" y="${TOP + 232}" width="280" height="36" rx="9"
              fill="rgba(240,166,58,.12)" stroke="${C.amber}" stroke-width="1.2"/>
        <text x="${LX + 444}" y="${TOP + 255}" font-size="13" fill="${C.amber}">📎 장학생_명단_2026.xlsx</text>
      </g>
      <text x="${LX + 40}" y="${TOP + 330}" font-size="13.5" fill="${C.ink3}">평소 쓰던 것과 똑같이 묻고, 똑같이 첨부합니다.</text>`),
    behind('출국 검사 — 사용자는 못 봅니다', C.amber, [
      ['첨부파일을 훑습니다', '주민등록번호 1,204건 발견'],
      ['판정 = SANITIZE', '가방째 압수하지 않습니다 — 금지 물건만 뺍니다'],
      ['마스킹 후 전달', '외부 AI 는 900101-******* 만 받습니다'],
    ]),
  ],
  // 5 — 답이 온다
  [
    browser('ai.kaist.ac.kr', C.teal, `
      ${bubble(LX + 230, TOP + 110, 470, 46, '이번 학기 장학금 지급 대상자 명단 정리해 줘', true)}
      ${bubble(LX + 40, TOP + 174, 600, 128, '요청하신 명단을 기준별로 정리했습니다. 성적 우수 32명,', false)}
      <text x="${LX + 58}" y="${TOP + 226}" font-size="13.5" fill="${C.ink2}">가계 곤란 18명, 특기자 7명으로 분류했고 지급액 합계는…</text>
      <text x="${LX + 40}" y="${TOP + 350}" font-size="13.5" fill="${C.ink3}">그냥 답이 왔습니다. 기다린 느낌도 없었습니다.</text>`),
    behind('입국 검사 + 기록', C.green, [
      ['돌아온 답변을 다시 검사', '카나리아 · 개인정보 재노출 · 반출 링크'],
      ['검사에 걸린 시간', '나갈 때 5.0 ms · 돌아올 때 0.3 ms'],
      ['감사 기록', '시각·유형·판정만. 원문은 저장하지 않습니다'],
    ]),
  ],
  // 6 — 결론
  [
    browser('ai.kaist.ac.kr', C.teal, `
      <text x="${LX + 40}" y="${TOP + 150}" font-size="22" font-weight="700" fill="${C.ink}">사용자가 의식한 것은</text>
      <text x="${LX + 40}" y="${TOP + 190}" font-size="22" font-weight="700" fill="${C.teal}">주소가 바뀐 것 하나뿐입니다.</text>
      <text x="${LX + 40}" y="${TOP + 246}" font-size="14.5" fill="${C.ink2}">여권을 꺼낼 일도, 가방을 열어 보일 일도 없었습니다.</text>
      <text x="${LX + 40}" y="${TOP + 274}" font-size="14.5" fill="${C.ink2}">검사대가 있다는 것조차 몰랐습니다.</text>`),
    behind('그 사이 시스템이 한 일', C.teal, [
      ['출국 검사 8단계', '정규화 · 이상 · 자격증명 · 개인정보 · NER · 인젝션 · 유해 · 등급'],
      ['판정과 마스킹', '주민등록번호 1,204건을 치환해 내보냈습니다'],
      ['입국 검사 6단계 + 기록', '합쳐서 5.3 ms. 외부 AI 가 첫 글자를 내놓기 전에 끝났습니다'],
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
      <text x="${LX}" y="52" font-size="13" font-weight="700" fill="${C.ink3}"
            letter-spacing="1.4">사용자가 보는 화면</text>
      <text x="${RX}" y="52" font-size="13" font-weight="700" fill="${C.ink3}"
            letter-spacing="1.4">그 순간 실제로 일어나는 일</text>
      ${SCENES.map((sc, i) => `<g id="us-${i}" opacity="${i === 0 ? 1 : 0}">${sc[0]}${sc[1]}</g>`).join('')}
    </svg>`;
  return host.querySelector('svg');
}

export function makeUserController(svg, reduced) {
  const groups = SCENES.map((_, i) => svg.querySelector(`#us-${i}`));
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
        // 새 장면은 살짝 아래에서 올라온다 — 넘어간 것이 눈에 보이게.
        gsap.fromTo(g, { y: 10 }, { y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'transform' });
      }
    });
  };
}
