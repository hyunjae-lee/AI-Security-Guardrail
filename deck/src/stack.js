/* 데모로 만든 포털 시스템의 **배치도와 기술 스택** — 한 장에 둘 다.
 *
 * arch.js 는 「질의 하나가 파이프라인을 어떻게 지나는가」를 그린다.
 * 이 그림은 다른 질문에 답한다 — **무엇이 어디에 설치되어 있고, 각 칸이
 * 무슨 기술로 되어 있는가.**  심사에서 「그래서 뭘로 만들었나」를 묻기 때문에
 * 상자 안에 제품명과 판본을 그대로 적는다.  비유를 쓰지 않는다.
 *
 * arch.js 와 같은 이유로 **확대한다**: 전체를 한 장에 담으면 제품명이 안
 * 읽히고, 크게 그리면 전체 배치가 안 보인다.  둘 다 필요하다.
 * 확대 대상이 되는 묶음은 전부 `z-` 로 시작하는 id 를 갖는다.
 */
import { gsap } from 'gsap';

const C = {
  amber: '#f5b355', teal: '#5fcfb0', red: '#f27a6d', green: '#95cf70',
  ink: '#f4f3ef', ink2: '#c7c8ce', ink3: '#9b9da6',
  line: '#3d4250', plate: '#1c1f27', ground2: '#14161c',
};

// 그림의 실제 가장자리에 맞춘 틀.  넉넉하게 잡으면 그만큼 그림이 작아진다 —
// preserveAspectRatio 가 빈 여백까지 포함해 축소하기 때문이다.
const VB = [10, 44, 1462, 564];

/** 제품명·판본을 함께 적는 상자. 가장 아래 줄이 「무슨 기술인가」다. */
function box(x, y, w, h, title, sub, tech, accent, filled = false) {
  const subs = sub.split('\n');
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="11"
          fill="${filled ? 'rgba(95,207,176,.09)' : C.plate}"
          stroke="${accent}" stroke-width="${filled ? 2 : 1.3}"/>
    <text x="${x + w / 2}" y="${y + 27}" text-anchor="middle"
          font-size="17" font-weight="700" fill="${accent}">${title}</text>
    ${subs.map((l, i) => `<text x="${x + w / 2}" y="${y + 50 + i * 18}" text-anchor="middle"
          font-size="13.5" fill="${C.ink2}">${l}</text>`).join('')}
    ${tech ? `<text x="${x + w / 2}" y="${y + h - 12}" text-anchor="middle"
          font-size="12" font-weight="700" fill="${C.ink3}"
          font-family="ui-monospace,SFMono-Regular,Menlo,monospace">${tech}</text>` : ''}`;
}

function arrow(d, color = C.teal) {
  const head = color === C.red ? 'stk-red' : color === C.green ? 'stk-grn' : 'stk-head';
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2"
          marker-end="url(#${head})"/>`;
}

export function buildStack(host) {
  const X = 236;

  host.innerHTML = `
  <svg id="stack-svg" viewBox="${VB.join(' ')}" width="100%" height="100%"
       role="img" aria-labelledby="stk-t stk-d" preserveAspectRatio="xMidYMid meet">
    <title id="stk-t">교내 AI 포털 데모의 배치도와 기술 스택</title>
    <desc id="stk-d">단말이 교내 포털과 OpenAI 호환 API 로 들어오고, LiteLLM 프록시가
      가드레일 게이트웨이에 검사를 맡긴 뒤 캠퍼스 경계를 지나 외부 생성형 AI 로
      나갑니다. 판정은 감사 저장소에만 남고 원문은 남지 않습니다.</desc>
    <defs>
      <marker id="stk-head" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="${C.teal}"/>
      </marker>
      <marker id="stk-red" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="${C.red}"/>
      </marker>
      <marker id="stk-grn" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="${C.green}"/>
      </marker>
      <!-- 틀 밖을 가리는 창.  makeStackController 가 틀과 함께 움직인다. -->
      <clipPath id="stk-frame"><rect id="stk-frame-r"
        x="${VB[0]}" y="${VB[1]}" width="${VB[2]}" height="${VB[3]}"/></clipPath>
    </defs>
    <g clip-path="url(#stk-frame)">

    <!-- 교내 경계선 -->
    <g id="z-campus-zone">
      <rect x="${X - 20}" y="56" width="860" height="540" rx="14"
            fill="none" stroke="${C.teal}" stroke-width="1"
            stroke-dasharray="6 6" opacity=".45"/>
      <text x="${X - 4}" y="78" font-size="13" font-weight="700"
            fill="${C.teal}" letter-spacing=".12em">교내 — 이 저장소가 만든 것</text>
    </g>

    <g id="z-dev">
      ${box(24, 158, 186, 108, '구성원 단말', 'PC · 노트북\n폰 · 태블릿', '교내망 / SSO', C.amber)}
      <text x="117" y="290" text-anchor="middle" font-size="13" fill="${C.ink3}">구성원 14,000명</text>
    </g>

    <g id="z-entry">
      ${box(X, 96, 268, 112, '교내 AI 포털 (웹)', '사람이 쓰는 화면\nai.kaist.ac.kr', 'Vite 7 + GSAP 3', C.teal)}
      ${box(X, 224, 268, 112, 'OpenAI 호환 API', '앱 · 연구실 · CLI\n주소만 바꾼다', '/v1/chat/completions', C.teal)}
    </g>

    <g id="z-proxy">
      ${box(X + 316, 158, 226, 180, 'LiteLLM 프록시', '모델 라우팅\n스트리밍 중계\n이용자별 쿼터', 'litellm · 2노드 HA', C.teal)}
    </g>

    <g id="z-gate">
      ${box(X + 590, 126, 244, 244, '가드레일 게이트웨이', '출국 검사 8단\n입국 검사 6단\n판정 4갈래', 'FastAPI 0.115 · py3.12', C.teal, true)}
    </g>

    <g id="z-engine">
      ${box(X + 590, 400, 118, 116, '규칙', '정규식\n체크섬', '순수 파이썬', C.teal)}
      ${box(X + 716, 400, 118, 116, '한국어 NER', 'KoELECTRA\n-small', 'ONNX 56MB', C.amber)}
    </g>

    <g id="z-audit">
      ${box(X + 316, 400, 226, 116, '감사 저장소', '판정 · 룰 ID · 길이\n원문은 넣지 않는다', 'SQLite → PostgreSQL', C.green)}
    </g>

    <g id="z-border">
      ${box(1138, 158, 148, 180, '캠퍼스 경계', '외부 AI 직결\n차단\n이 길만 허용', '방화벽 / SNI', C.red)}
      ${box(1314, 158, 148, 180, '외부 생성형 AI', 'OpenAI\nAnthropic\nGoogle', '우리 관제 밖', C.red)}
    </g>

    <g id="z-wires">
      ${arrow(`M210,198 L${X - 6},152`)}
      ${arrow(`M210,226 L${X - 6},272`)}
      ${arrow(`M${X + 268},152 L${X + 310},222`)}
      ${arrow(`M${X + 268},280 L${X + 310},274`)}
      ${arrow(`M${X + 542},248 L${X + 584},248`)}
      ${arrow(`M${X + 708},370 L${X + 708},396`)}
      ${arrow(`M${X + 776},370 L${X + 776},396`)}
      ${arrow(`M${X + 596},372 L${X + 548},424`, C.green)}
      ${arrow(`M${X + 834},248 L1134,248`)}
      ${arrow('M1286,248 L1310,248', C.red)}
      <text x="${X + 552}" y="240" font-size="12.5" fill="${C.ink3}">검사 의뢰 · HTTP</text>
      <text x="${X + 556}" y="396" text-anchor="end" font-size="12.5" fill="${C.green}">판정만</text>
    </g>
    </g>
  </svg>`;
  return host.querySelector('#stack-svg');
}

/** 확대 단계 — [viewBox, 선명하게 둘 묶음, 캡션] */
export const STACK_STEPS = [
  [VB, null,
   '전체 배치 — 점선 안이 교내입니다. 왼쪽에서 들어와 오른쪽으로 나갑니다. <b>GPU 는 한 장도 쓰지 않습니다.</b>'],
  [[12, 84, 504, 264], ['z-dev', 'z-entry'],
   '들어오는 문은 <b>둘뿐</b>입니다. 사람은 웹 화면으로, 앱·CLI·연구실 코드는 <b>OpenAI 호환 API</b> 로 들어옵니다. 전용 API 를 새로 만들면 아무도 쓰지 않기 때문에, <b>주소만 바꾸면 되게</b> 했습니다.'],
  [[520, 130, 420, 240], ['z-proxy'],
   '<b>LiteLLM 프록시</b>가 모델을 고르고 스트리밍을 중계하며 이용자별 쿼터를 겁니다. 가드레일과 <b>HTTP 로 떼어 놓은 이유</b>는 LiteLLM 이 요구하는 pydantic 판본이 엔진과 충돌하기 때문입니다 — 떼어 두면 한쪽만 고쳐 배포할 수 있습니다.'],
  [[800, 100, 420, 300], ['z-gate'],
   '<b>가드레일 게이트웨이 — 이 저장소입니다.</b> FastAPI 한 프로세스가 출국 8단 · 입국 6단을 돌리고 네 갈래로 판정합니다. <b>이 서버가 죽으면 차단이 기본값</b>입니다 — 검사 없이 국경을 넘는 것이 바로 막으려는 상황이라, 조용히 통과시킬 수 없습니다.'],
  [[800, 380, 400, 170], ['z-engine'],
   '탐지는 두 종류입니다. <b>대부분이 규칙</b>(정규식·체크섬)이고, 기계학습은 <b>한국어 이름·지명 하나뿐</b>입니다. KoELECTRA-small 을 ONNX 로 구워 <b>56 MB · CPU 3 ms</b> — 그래서 GPU 가 필요 없습니다.'],
  [[500, 370, 420, 180], ['z-audit'],
   '남는 것은 <b>판정뿐</b>입니다. 원문 대신 길이와 소금 친 해시만 넣어, 같은 질의가 반복됐는지는 알되 내용은 되살릴 수 없게 했습니다. 레코드 한 건이 <b>434 바이트</b>라, 3년을 쌓아도 226 GB 입니다.'],
  [[1080, 130, 400, 240], ['z-border'],
   '교내에서 외부 AI 로 <b>직접 나가는 길은 막습니다.</b> 이 경로만 열어 두어야 검사가 의미를 갖습니다. 국경 너머는 우리 관제 밖입니다 — 그래서 <b>나가기 전에</b> 거르는 것입니다.'],
  [VB, null,
   '서버는 <b>가상머신 두 대</b>면 됩니다. 구성원 14,000명이 하루 40질의씩 보내도 <b>한 노드로 4.6배 여유</b>가 남습니다. 비싼 것은 장비가 아니라 운영하는 사람입니다.'],
];

/** viewBox 를 부드럽게 옮긴다. 문자열이라 gsap 이 직접 보간하지 못해 객체로 돌린다. */
export function makeStackController(svg, captionEl, reduced) {
  const state = { x: VB[0], y: VB[1], w: VB[2], h: VB[3] };
  const groups = [...svg.querySelectorAll('g[id^="z-"]')];

  const win = svg.querySelector('#stk-frame-r');
  function apply() {
    svg.setAttribute('viewBox', `${state.x} ${state.y} ${state.w} ${state.h}`);
    // 창도 같이 움직인다 — 안 그러면 확대했을 때 틀 밖이 비친다.
    if (win) {
      win.setAttribute('x', state.x);
      win.setAttribute('y', state.y);
      win.setAttribute('width', state.w);
      win.setAttribute('height', state.h);
    }
  }

  return function goto(index) {
    const step = STACK_STEPS[Math.max(0, Math.min(index, STACK_STEPS.length - 1))];
    const [[x, y, w, h], focus, caption] = step;
    if (captionEl) captionEl.innerHTML = caption;

    // 초점 밖은 흐리게. 다만 선과 경계선은 길잡이라 덜 흐리게 둔다.
    groups.forEach((g) => {
      const guide = g.id === 'z-wires' || g.id === 'z-campus-zone';
      const dim = focus && !focus.includes(g.id);
      gsap.to(g, {
        opacity: dim ? (guide ? 0.35 : 0.16) : 1,
        duration: reduced ? 0 : 0.4,
        overwrite: true,
      });
    });

    if (reduced) {
      Object.assign(state, { x, y, w, h });
      apply();
      return;
    }
    gsap.to(state, {
      x, y, w, h, duration: 0.85, ease: 'power3.inOut', overwrite: true, onUpdate: apply,
    });
  };
}
