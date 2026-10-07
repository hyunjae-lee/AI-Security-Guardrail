/* 표지 그림 — 「같은 질문, 같은 AI. 달라진 것은 기관 전용 가드레일 하나」.
 *
 * 왜 표지에 그림을 두나
 * -------------------
 * 발표의 주장은 한 문장이다: 생성형 AI 를 쓰려면 **기관 전용** 검사대가 있어야 한다.
 * 표지에서 그것을 글로 읽히면 아무도 기억하지 않는다.  같은 장면을 두 번 보여 준다:
 *   1막 「지금」  — 기관의 질의 셋이 아무 확인 없이 국경을 넘어 외부 AI 로 들어가고,
 *                  돌아오는 답변도 확인 없이 들어온다.
 *   2막 「가드레일」 — 국경에 검사대가 선다.  나가는 셋은 가림 · 차단 · 통과로 갈리고,
 *                    돌아오는 답변은 숨은 링크를 걷어낸 뒤에야 들어온다.
 * 그림이 바뀌는 것은 검사대 하나뿐이다 — 그것이 메시지다.  **나갈 때와 들어올 때
 * 양쪽**을 보여야 한다(「나갈 때 깨끗했어도 돌아올 때 깨끗하다는 보장은 없다」).
 *
 * 마크업 그대로가 **2막의 완성 화면**이다.  모션을 끄거나 연출이 끊기면
 * 인라인 스타일만 걷어내면(settle) 결론 화면이 남는다.  그래서 색·투명도는
 * 전부 CSS 속성(style)으로만 움직이고 attr 는 건드리지 않는다 — clearProps 가
 * attr 를 되돌리지 못하기 때문이다.
 */
import { paperize } from './paper.js';
import { gsap } from 'gsap';

const C = {
  amber: '#f5b355', teal: '#5fcfb0', red: '#f27a6d', green: '#95cf70',
  ink: '#f4f3ef', ink2: '#c7c8ce', ink3: '#9b9da6',
  line: '#3d4250', plate: '#1c1f27', ground: '#0b0c10', ground2: '#14161c',
};
paperize(C);

/* 발표장에서 따라 읽을 수 있는 속도. 처음 만든 것보다 1.5 배 느리다(「50% 더 느리게」). */
const SPEED = 1 / 1.5;

const PW = 172, PH = 54;            // 짐(질의·답변) 카드
const GX = 384, GW = 40;            // 국경 = 검사대 자리
const START = 26;                   // 기관 안쪽 x
const STOP = GX - GW / 2 - PW - 12; // 검사대 왼쪽(나가기 전)에 멈추는 x
const PASS = GX + GW / 2 + 14;      // 검사대 오른쪽 x
const INTO = 440;                   // 1막: 국경을 막 넘은 x — 여기서 외부 AI 로 빨려 들어간다
const FROM = 548;                   // 답변이 외부 AI 에서 나오는 x
const LANES = [190, 272, 354];      // 나가는 카드 윗변 y
const IN_Y = 470;                   // 들어오는 카드 윗변 y
const GLOBE = { x: 676, y: 300, r: 72 };

/* 나가는 셋 — 2막의 결말이 서로 달라야 한다(가림 · 차단 · 통과).
 * subs 가 둘이면 [1막·검사 전, 2막·검사 후] 이다. */
const OUT = [
  { id: 'p0', title: '장학생 명단 정리', subs: [['주민등록번호 1,204건', C.amber], ['주민번호 가림 처리', C.teal]],
    end: PASS, color: C.teal, mark: 'mask' },
  { id: 'p1', title: '미공개 연구노트', subs: [['L4 · 반출 금지 등급', C.ink2], ['반출 차단 · 감사 기록', C.red]],
    end: STOP, color: C.red, mark: 'block' },
  { id: 'p2', title: '학칙 해석 질문', subs: [['일반 업무 · 공개 정보', C.ink2]],
    end: PASS, color: C.green, mark: 'pass' },
];
/* 들어오는 답변 — 숨은 링크·지시가 섞여 돌아온다. */
const IN = { id: 'a0', title: 'AI 답변', subs: [['유출 링크 · 숨은 지시', C.red], ['링크 제거 후 전달', C.teal]],
  end: START, color: C.teal, mark: 'mask', icon: 'reply' };

function statusMark(kind, x, y) {
  const col = kind === 'block' ? C.red : kind === 'pass' ? C.green : C.teal;
  const glyph = kind === 'mask'
    ? `<rect x="${x - 7}" y="${y - 2}" width="14" height="4" rx="2" fill="${col}"/>`
    : kind === 'block'
      ? `<path d="M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`
      : `<path d="M${x - 6} ${y} L${x - 2} ${y + 4} L${x + 6} ${y - 5}" stroke="${col}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<circle cx="${x}" cy="${y}" r="13" fill="${C.ground}" stroke="${col}" stroke-width="1.6"/>
    <circle cx="${x}" cy="${y}" r="13" fill="${col}" fill-opacity="0.18"/>${glyph}`;
}

function card(it, y) {
  // 바깥 g 가 최종 위치, 안쪽 g(#id)를 x 로 움직인다 — 연출 값을 지우면 결말 자리로 돌아온다.
  const [first, last] = it.subs;
  const sub = last
    ? `<text class="sub-a" x="40" y="41" font-size="12.5" fill="${first[1]}" opacity="0">${first[0]}</text>
       <text class="sub-b" x="40" y="41" font-size="12.5" fill="${last[1]}">${last[0]}</text>`
    : `<text x="40" y="41" font-size="12.5" fill="${first[1]}">${first[0]}</text>`;
  const icon = it.icon === 'reply'
    ? `<path d="M13 15 h20 a3 3 0 0 1 3 3 v12 a3 3 0 0 1 -3 3 h-11 l-6 6 v-6 h-3 a3 3 0 0 1 -3 -3 v-12 a3 3 0 0 1 3 -3 z"
             fill="none" stroke="${C.ink3}" stroke-width="1.4" stroke-linejoin="round"/>`
    : `<path d="M14 13 h12 l6 6 v22 h-18 z" fill="none" stroke="${C.ink3}" stroke-width="1.4" stroke-linejoin="round"/>
       <path d="M18 27 h10 M18 32 h10" stroke="${C.ink3}" stroke-width="1.2"/>`;
  return `
    <g transform="translate(${it.end},${y})">
      <g id="${it.id}">
        <rect class="card" width="${PW}" height="${PH}" rx="11" fill="${C.plate}"
              stroke="${it.color}" stroke-width="1.8" style="stroke:${it.color}"/>
        ${icon}
        <text x="40" y="23" font-size="14.5" font-weight="700" fill="${C.ink}">${it.title}</text>
        ${sub}
        <g class="stat">${statusMark(it.mark, PW + 2, 0)}</g>
      </g>
    </g>`;
}

export function buildCover(host) {
  const uid = `cv-${Math.random().toString(36).slice(2, 8)}`;
  const gateTop = 160, gateBot = 560;
  const people = [44, 78, 112];

  host.innerHTML = `
    <svg id="${uid}" viewBox="0 0 760 680" role="img" aria-labelledby="${uid}-t ${uid}-d"
         preserveAspectRatio="xMidYMid meet" font-family="'Noto Sans KR', system-ui, sans-serif">
      <title id="${uid}-t">같은 질문, 같은 AI — 달라진 것은 기관 전용 가드레일 하나</title>
      <desc id="${uid}-d">기관에서 나가는 생성형 AI 질의 세 건과 돌아오는 답변 한 건이 있다. 가드레일이 없으면
        장학생 명단과 미공개 연구노트까지 아무 확인 없이 외부 AI 로 넘어가고, 유출 링크와 숨은 지시가 든 답변도
        그대로 들어온다. 국경에 기관 전용 가드레일을 세우면 명단은 주민등록번호를 가리고 통과하고, 연구노트는
        반출 금지 등급이라 차단되며, 일반 질문은 그대로 통과한다. 돌아오는 답변은 링크를 걷어낸 뒤에 들어온다.</desc>

      <!-- 상단 상태 알약: 1막은 빨강, 2막은 청록 -->
      <g id="pill-now" opacity="0" style="opacity:0">
        <rect x="100" y="14" width="560" height="42" rx="21" fill="${C.red}" fill-opacity="0.14" stroke="${C.red}" stroke-width="1.5"/>
        <text x="380" y="41" text-anchor="middle" font-size="17" font-weight="700" fill="${C.red}">지금 — 나갈 때도, 들어올 때도 확인하지 않습니다</text>
      </g>
      <g id="pill-guard">
        <rect x="80" y="14" width="600" height="42" rx="21" fill="${C.teal}" fill-opacity="0.12" stroke="${C.teal}" stroke-width="1.5"/>
        <text x="380" y="41" text-anchor="middle" font-size="17" font-weight="700" fill="${C.teal}">기관 전용 가드레일 — 나갈 때도, 들어올 때도 확인합니다</text>
      </g>

      <!-- 우리 기관 -->
      <rect x="10" y="110" width="204" height="470" rx="16" fill="${C.ground2}" stroke="${C.line}" stroke-width="1.4"/>
      <text x="26" y="138" font-size="15" font-weight="700" fill="${C.ink}">우리 기관</text>
      <text x="26" y="158" font-size="12" fill="${C.ink3}">교직원 · 연구자 · 학생</text>
      <g fill="${C.ink3}" opacity="0.8">
        ${people.map((x) => `<circle cx="${x}" cy="548" r="7"/>
          <path d="M${x - 9} 570 Q${x - 9} 559 ${x} 559 Q${x + 9} 559 ${x + 9} 570 Z"/>`).join('')}
      </g>

      <!-- 방향 표시 -->
      <text x="${PASS}" y="178" font-size="12.5" font-weight="600" fill="${C.ink3}">나가는 질문 →</text>
      <text x="${PASS}" y="458" font-size="12.5" font-weight="600" fill="${C.ink3}">← 들어오는 답변</text>

      <!-- 외부 생성형 AI -->
      <g>
        <circle cx="${GLOBE.x}" cy="${GLOBE.y}" r="${GLOBE.r}" fill="${C.plate}" stroke="#8c86c9" stroke-width="1.6"/>
        <ellipse cx="${GLOBE.x}" cy="${GLOBE.y}" rx="30" ry="${GLOBE.r}" fill="none" stroke="#8c86c9" stroke-width="1.1" stroke-opacity="0.7"/>
        <ellipse cx="${GLOBE.x}" cy="${GLOBE.y}" rx="${GLOBE.r}" ry="24" fill="none" stroke="#8c86c9" stroke-width="1.1" stroke-opacity="0.7"/>
        <text x="${GLOBE.x}" y="${GLOBE.y - GLOBE.r - 14}" text-anchor="middle" font-size="15" font-weight="700" fill="${C.ink}">외부 생성형 AI</text>
        <text x="${GLOBE.x}" y="${GLOBE.y + GLOBE.r + 22}" text-anchor="middle" font-size="12" fill="${C.ink3}">ChatGPT · Claude · Gemini</text>
      </g>
      <text id="leak" x="${GLOBE.x}" y="${GLOBE.y + GLOBE.r + 46}" text-anchor="middle" font-size="13.5" font-weight="700"
            fill="${C.red}" opacity="0" style="opacity:0">그대로 반출 · 기록 없음</text>
      <text id="leak-in" x="112" y="${IN_Y - 12}" text-anchor="middle" font-size="13" font-weight="700"
            fill="${C.red}" opacity="0" style="opacity:0">확인 없이 유입</text>

      <!-- 국경 -->
      <line id="border" x1="${GX}" y1="116" x2="${GX}" y2="588" stroke="${C.red}" stroke-width="2.2" stroke-dasharray="8 7"/>
      <text x="${GX}" y="606" text-anchor="middle" font-size="12.5" font-weight="700" fill="${C.red}">국경</text>

      <!-- 기관 전용 가드레일 -->
      <g id="gate">
        <rect x="${GX - GW / 2}" y="${gateTop}" width="${GW}" height="${gateBot - gateTop}" rx="12"
              fill="${C.teal}" fill-opacity="0.16" stroke="${C.teal}" stroke-width="2"/>
        ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${GX - 10}" x2="${GX + 10}" y1="${gateTop + 40 + i * 64}" y2="${gateTop + 40 + i * 64}"
            stroke="${C.teal}" stroke-width="1.4" stroke-opacity="0.6"/>`).join('')}
        <path d="M${GX} ${gateTop - 46} l17 7 v12 c0 11 -8 18 -17 22 c-9 -4 -17 -11 -17 -22 v-12 z"
              fill="${C.ground}" stroke="${C.teal}" stroke-width="2"/>
        <path d="M${GX - 7} ${gateTop - 26} l5 5 l9 -10" stroke="${C.teal}" stroke-width="2.2" fill="none"
              stroke-linecap="round" stroke-linejoin="round"/>
        <text x="${GX}" y="${gateTop - 62}" text-anchor="middle" font-size="15" font-weight="700" fill="${C.teal}">기관 전용 가드레일</text>
      </g>
      <rect id="scan-out" x="${STOP - 6}" y="${LANES[0] - 8}" width="${PW + 12}" height="${LANES[2] - LANES[0] + PH + 16}" rx="14"
            fill="${C.teal}" opacity="0" style="opacity:0"/>
      <rect id="scan-in" x="${PASS - 6}" y="${IN_Y - 8}" width="${PW + 12}" height="${PH + 16}" rx="14"
            fill="${C.teal}" opacity="0" style="opacity:0"/>

      <!-- 나가는 질의 셋 · 들어오는 답변 하나 -->
      ${OUT.map((it, i) => card(it, LANES[i])).join('')}
      ${card(IN, IN_Y)}

      <!-- 결론 한 줄 -->
      <text id="msg" x="380" y="660" text-anchor="middle" font-size="19" font-weight="700" fill="${C.ink}">같은 질문, 같은 AI — 달라진 것은 <tspan fill="${C.teal}">기관 전용 가드레일</tspan> 하나</text>
    </svg>`;
  return host.querySelector('svg');
}

/** 표지 그림 조종기.
 *
 * 처음에는 한 바퀴를 자동으로 반복했는데, 「바로 지나가 버려서 설명하기 어렵다」는
 * 지적을 받았다.  그래서 **발표자가 막을 고른다**:
 *   0 = 대기 — 질의 셋이 기관 안에 있고 검사대는 없다
 *   1 = 「지금」  — 나갈 때도 들어올 때도 확인 없이 넘어간다. 끝 장면에서 멈춘다.
 *   2 = 「기관 전용 가드레일」 — 검사대가 서고 갈린다. 끝 장면(결론)에서 멈춘다.
 * 같은 막을 다시 고르면 처음부터 다시 돈다.  모션을 끄면 끝 장면으로 바로 간다.
 *
 * go(step, play) — play 가 false 면 애니메이션 없이 그 막의 끝 장면을 놓는다
 * (뒤 슬라이드에서 돌아왔을 때). */
export function makeCoverController(svg, reduced) {
  const q = (s) => svg.querySelector(s);
  const pk = OUT.map((it) => q('#' + it.id));
  const ans = q('#' + IN.id);
  const cards = pk.map((p) => p.querySelector('.card'));
  const ansCard = ans.querySelector('.card');
  const stats = [...pk, ans].map((p) => p.querySelector('.stat'));
  const subA = svg.querySelectorAll('.sub-a');   // 검사 전 문구
  const subB = svg.querySelectorAll('.sub-b');   // 검사 후 문구
  const [p0a, p1a, ansA] = subA;
  const [p0b, p1b, ansB] = subB;
  const gate = q('#gate');
  const dx = (i, x) => x - OUT[i].end;           // 최종 자리 기준 상대 x
  const ax = (x) => x - IN.end;
  let tl = null;

  /** 대기 장면 — 두 막이 모두 여기서 출발한다. */
  const idle = (t) => t
    .set([q('#pill-now'), q('#pill-guard'), q('#leak'), q('#leak-in'), q('#msg'),
          q('#scan-out'), q('#scan-in'), ...stats], { opacity: 0 }, 0)
    .set(gate, { opacity: 0, scaleY: 0, transformOrigin: `${GX}px 560px` }, 0)
    .set(pk, { opacity: 1, x: (i) => dx(i, START), y: 0, scale: 1 }, 0)
    .set(ans, { opacity: 0, x: ax(FROM) }, 0)
    .set([...cards, ansCard], { stroke: C.amber }, 0)
    .set(subA, { opacity: 1 }, 0)
    .set(subB, { opacity: 0 }, 0)
    .set(q('#border'), { opacity: 1 }, 0);

  /* 1막: 나갈 때도 들어올 때도 아무 확인이 없다 */
  const act1 = () => idle(gsap.timeline({ paused: true }))
    .to(q('#pill-now'), { opacity: 1, duration: 0.4 }, 0.1)
    .to(pk, { x: (i) => dx(i, INTO), duration: 1.7, stagger: 0.22, ease: 'power1.inOut' }, 0.5)
    .to(cards, { stroke: C.red, duration: 0.25, stagger: 0.22 }, 1.5)
    .to(q('#border'), { opacity: 0.35, duration: 0.18, yoyo: true, repeat: 3 }, 1.4)
    .to(pk, { x: (i) => dx(i, GLOBE.x - PW * 0.15), y: (i) => GLOBE.y - PH * 0.15 - LANES[i], scale: 0.3,
              opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power2.in' }, 2.6)
    .to(q('#leak'), { opacity: 1, duration: 0.4 }, 3.0)
    .to(ans, { opacity: 1, duration: 0.3 }, 3.4)
    .to(ans, { x: 0, duration: 1.7, ease: 'power1.inOut' }, 3.6)
    .to(ansCard, { stroke: C.red, duration: 0.25 }, 4.3)
    .to(q('#leak-in'), { opacity: 1, duration: 0.4 }, 5.1);

  /* 2막: 검사대가 서고, 나갈 때와 들어올 때 각각 멈춘다 */
  const act2 = () => idle(gsap.timeline({ paused: true }))
    .to(q('#pill-guard'), { opacity: 1, duration: 0.4 }, 0.1)
    .to(gate, { opacity: 1, scaleY: 1, duration: 0.8, ease: 'back.out(1.6)' }, 0.2)
    // ① 나갈 때 — 검사대 앞에 멈추고 세 갈래로 갈린다
    .to(pk, { x: (i) => dx(i, STOP), duration: 0.9, stagger: 0.15, ease: 'power2.out' }, 1.0)
    .to(q('#scan-out'), { opacity: 0.16, duration: 0.25, yoyo: true, repeat: 1 }, 2.1)
    .to(p0a, { opacity: 0, duration: 0.25 }, 2.7)
    .to(p0b, { opacity: 1, duration: 0.25 }, 2.85)
    .to(cards[0], { stroke: C.teal, duration: 0.3 }, 2.7)
    .to(stats[0], { opacity: 1, duration: 0.3 }, 2.8)
    .to(p1a, { opacity: 0, duration: 0.25 }, 3.0)
    .to(p1b, { opacity: 1, duration: 0.25 }, 3.15)
    .to(cards[1], { stroke: C.red, duration: 0.3 }, 3.0)
    .to(stats[1], { opacity: 1, duration: 0.3 }, 3.0)
    .to(pk[1], { x: dx(1, STOP) - 10, duration: 0.07, yoyo: true, repeat: 5 }, 3.1)
    .to(cards[2], { stroke: C.green, duration: 0.3 }, 3.3)
    .to(stats[2], { opacity: 1, duration: 0.3 }, 3.3)
    .to([pk[0], pk[2]], { x: 0, duration: 0.9, stagger: 0.12, ease: 'power2.inOut' }, 3.7)
    // ② 들어올 때 — 답변도 검사대 앞에 멈춘다
    .to(ans, { opacity: 1, duration: 0.3 }, 4.8)
    .to(ans, { x: ax(PASS), duration: 1.0, ease: 'power2.out' }, 4.9)
    .to(q('#scan-in'), { opacity: 0.18, duration: 0.25, yoyo: true, repeat: 1 }, 6.0)
    .to(ansA, { opacity: 0, duration: 0.25 }, 6.6)
    .to(ansB, { opacity: 1, duration: 0.25 }, 6.75)
    .to(ansCard, { stroke: C.teal, duration: 0.3 }, 6.6)
    .to(stats[3], { opacity: 1, duration: 0.3 }, 6.7)
    .to(ans, { x: 0, duration: 1.1, ease: 'power2.inOut' }, 7.2)
    .to(q('#msg'), { opacity: 1, duration: 0.5 }, 8.2);

  return function go(step, play = true) {
    if (tl) tl.kill();
    settleCover(svg);
    if (step === 0) { tl = idle(gsap.timeline()); return; }
    tl = step === 1 ? act1() : act2();
    tl.timeScale(SPEED);
    if (!play || reduced) tl.progress(1); else tl.play(0);
  };
}

/** 연출 값을 걷어내 마크업이 가진 결론 화면으로 돌린다.
 *  타임라인은 부르는 쪽이 먼저 죽인다 — 여기서 svg 전체의 트윈을 죽이면 지구본 자전까지 멈춘다. */
export function settleCover(svg) {
  if (!svg) return;
  gsap.set(svg.querySelectorAll('[id], .card, .stat, .sub-a, .sub-b'), { clearProps: 'all' });
}
