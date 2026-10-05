/* 표지 그림 — 「같은 질문, 같은 AI. 달라진 것은 기관 전용 가드레일 하나」.
 *
 * 왜 표지에 그림을 두나
 * -------------------
 * 발표의 주장은 한 문장이다: 생성형 AI 를 쓰려면 **기관 전용** 검사대가 있어야 한다.
 * 표지에서 그것을 글로 읽히면 아무도 기억하지 않는다.  같은 장면을 두 번 보여 준다:
 *   1막 「지금」  — 기관의 질의 셋이 아무 확인 없이 국경을 넘어 외부 AI 로 들어간다.
 *   2막 「가드레일」 — 국경에 검사대가 서고, 같은 셋이 세 갈래로 갈린다
 *                    (가리고 통과 · 차단 · 그대로 통과).  답변도 돌아올 때 다시 본다.
 * 그림이 바뀌는 것은 검사대 하나뿐이다 — 그것이 메시지다.
 *
 * 마크업 그대로가 **2막의 완성 화면**이다.  모션을 끄거나 연출이 끊기면
 * 인라인 스타일만 걷어내면(settle) 결론 화면이 남는다.  그래서 색·투명도는
 * 전부 CSS 속성(style)으로만 움직이고 attr 는 건드리지 않는다 — clearProps 가
 * attr 를 되돌리지 못하기 때문이다.
 */
import { gsap } from 'gsap';

const C = {
  amber: '#f5b355', teal: '#5fcfb0', red: '#f27a6d', green: '#95cf70',
  ink: '#f4f3ef', ink2: '#c7c8ce', ink3: '#9b9da6',
  line: '#3d4250', plate: '#1c1f27', ground: '#0b0c10', ground2: '#14161c',
};

const PW = 172, PH = 54;           // 짐(질의) 카드
const GX = 384, GW = 40;           // 국경 = 검사대 자리
const START = 26;                  // 기관 안에서 출발하는 x
const STOP = GX - GW / 2 - PW - 12; // 검사대 앞에 멈추는 x
const PASS = GX + GW / 2 + 14;     // 검사대를 지난 x
const INTO = 440;                  // 1막: 국경을 막 넘은 x — 여기서 외부 AI 로 빨려 들어간다
const LANES = [196, 290, 384];     // 카드 윗변 y

/* 짐 셋 — 2막의 결말이 서로 달라야 한다(가림 · 차단 · 통과). */
const ITEMS = [
  { id: 'p0', title: '장학생 명단 정리', sub: '주민등록번호 1,204건', masked: '주민번호 가림 처리',
    end: PASS, color: C.teal, mark: 'mask' },
  { id: 'p1', title: '미공개 연구노트', sub: 'L4 · 반출 금지 등급',
    end: STOP, color: C.red, mark: 'block' },
  { id: 'p2', title: '학칙 해석 질문', sub: '일반 업무 · 공개 정보',
    end: PASS, color: C.green, mark: 'pass' },
];

function statusMark(kind, x, y) {
  if (kind === 'mask') {
    return `<g><circle cx="${x}" cy="${y}" r="13" fill="${C.teal}" fill-opacity="0.18" stroke="${C.teal}" stroke-width="1.6"/>
      <rect x="${x - 7}" y="${y - 2}" width="14" height="4" rx="2" fill="${C.teal}"/></g>`;
  }
  if (kind === 'block') {
    return `<g><circle cx="${x}" cy="${y}" r="13" fill="${C.red}" fill-opacity="0.18" stroke="${C.red}" stroke-width="1.6"/>
      <path d="M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}" stroke="${C.red}" stroke-width="2.2" stroke-linecap="round"/></g>`;
  }
  return `<g><circle cx="${x}" cy="${y}" r="13" fill="${C.green}" fill-opacity="0.18" stroke="${C.green}" stroke-width="1.6"/>
    <path d="M${x - 6} ${y} L${x - 2} ${y + 4} L${x + 6} ${y - 5}" stroke="${C.green}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function packet(it, y) {
  // 바깥 g 가 최종 위치, 안쪽 g(#id)를 x 로 움직인다 — 연출 값을 지우면 결말 자리로 돌아온다.
  const sub = it.masked
    ? `<text class="sub-orig" x="40" y="41" font-size="12.5" fill="${C.amber}" opacity="0">${it.sub}</text>
       <text class="sub-mask" x="40" y="41" font-size="12.5" fill="${C.teal}">${it.masked}</text>`
    : `<text x="40" y="41" font-size="12.5" fill="${C.ink2}">${it.sub}</text>`;
  return `
    <g transform="translate(${it.end},${y})">
      <g id="${it.id}">
        <rect class="card" width="${PW}" height="${PH}" rx="11" fill="${C.plate}"
              stroke="${it.color}" stroke-width="1.8" style="stroke:${it.color}"/>
        <path d="M14 13 h12 l6 6 v22 h-18 z" fill="none" stroke="${C.ink3}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M18 27 h10 M18 32 h10" stroke="${C.ink3}" stroke-width="1.2"/>
        <text x="40" y="23" font-size="14.5" font-weight="700" fill="${C.ink}">${it.title}</text>
        ${sub}
        <g class="stat">${statusMark(it.mark, PW + 2, 0)}</g>
      </g>
    </g>`;
}

export function buildCover(host) {
  const uid = `cv-${Math.random().toString(36).slice(2, 8)}`;
  const gateTop = 150, gateBot = 462;

  host.innerHTML = `
    <svg id="${uid}" viewBox="0 0 760 640" role="img" aria-labelledby="${uid}-t ${uid}-d"
         preserveAspectRatio="xMidYMid meet" font-family="'Noto Sans KR', system-ui, sans-serif">
      <title id="${uid}-t">같은 질문, 같은 AI — 달라진 것은 기관 전용 가드레일 하나</title>
      <desc id="${uid}-d">기관에서 나가는 생성형 AI 질의 세 건이 있다. 가드레일이 없으면 장학생 명단과 미공개 연구노트까지
        아무 확인 없이 외부 AI 로 넘어간다. 국경에 기관 전용 가드레일을 세우면 명단은 주민등록번호를 가리고 통과하고,
        연구노트는 반출 금지 등급이라 차단되며, 일반 질문은 그대로 통과한다. 돌아오는 답변도 다시 검사한다.</desc>
      <defs>
        <marker id="${uid}-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="${C.teal}"/>
        </marker>
      </defs>

      <!-- 상단 상태 알약: 1막은 빨강, 2막은 청록 -->
      <g id="pill-now" opacity="0" style="opacity:0">
        <rect x="170" y="14" width="420" height="42" rx="21" fill="${C.red}" fill-opacity="0.14" stroke="${C.red}" stroke-width="1.5"/>
        <text x="380" y="41" text-anchor="middle" font-size="17" font-weight="700" fill="${C.red}">지금 — 아무것도 확인하지 않습니다</text>
      </g>
      <g id="pill-guard">
        <rect x="150" y="14" width="460" height="42" rx="21" fill="${C.teal}" fill-opacity="0.12" stroke="${C.teal}" stroke-width="1.5"/>
        <text x="380" y="41" text-anchor="middle" font-size="17" font-weight="700" fill="${C.teal}">기관 전용 가드레일 — 확인하고 내보냅니다</text>
      </g>

      <!-- 우리 기관 -->
      <rect x="10" y="120" width="204" height="370" rx="16" fill="${C.ground2}" stroke="${C.line}" stroke-width="1.4"/>
      <text x="26" y="148" font-size="15" font-weight="700" fill="${C.ink}">우리 기관</text>
      <text x="26" y="168" font-size="12" fill="${C.ink3}">교직원 · 연구자 · 학생</text>
      <g fill="${C.ink3}" opacity="0.8">
        ${[40, 74, 108].map((x) => `<circle cx="${x}" cy="456" r="7"/>
          <path d="M${x - 9} 478 Q${x - 9} 467 ${x} 467 Q${x + 9} 467 ${x + 9} 478 Z"/>`).join('')}
      </g>

      <!-- 외부 생성형 AI -->
      <g>
        <circle cx="676" cy="296" r="72" fill="${C.plate}" stroke="#8c86c9" stroke-width="1.6"/>
        <ellipse cx="676" cy="296" rx="30" ry="72" fill="none" stroke="#8c86c9" stroke-width="1.1" stroke-opacity="0.7"/>
        <ellipse cx="676" cy="296" rx="72" ry="24" fill="none" stroke="#8c86c9" stroke-width="1.1" stroke-opacity="0.7"/>
        <text x="676" y="200" text-anchor="middle" font-size="15" font-weight="700" fill="${C.ink}">외부 생성형 AI</text>
        <text x="676" y="392" text-anchor="middle" font-size="12" fill="${C.ink3}">ChatGPT · Claude · Gemini</text>
      </g>
      <g id="leak" opacity="0" style="opacity:0">
        <text x="676" y="424" text-anchor="middle" font-size="14" font-weight="700" fill="${C.red}">그대로 반출 · 기록 없음</text>
      </g>

      <!-- 국경 -->
      <line id="border" x1="${GX}" y1="96" x2="${GX}" y2="506" stroke="${C.red}" stroke-width="2.2" stroke-dasharray="8 7"/>
      <text x="${GX}" y="524" text-anchor="middle" font-size="12.5" font-weight="700" fill="${C.red}">국경</text>

      <!-- 기관 전용 가드레일 -->
      <g id="gate">
        <rect x="${GX - GW / 2}" y="${gateTop}" width="${GW}" height="${gateBot - gateTop}" rx="12"
              fill="${C.teal}" fill-opacity="0.16" stroke="${C.teal}" stroke-width="2"/>
        ${[0, 1, 2, 3, 4].map((i) => `<line x1="${GX - 10}" x2="${GX + 10}" y1="${gateTop + 40 + i * 58}" y2="${gateTop + 40 + i * 58}"
            stroke="${C.teal}" stroke-width="1.4" stroke-opacity="0.6"/>`).join('')}
        <path d="M${GX} ${gateTop - 46} l17 7 v12 c0 11 -8 18 -17 22 c-9 -4 -17 -11 -17 -22 v-12 z"
              fill="${C.ground}" stroke="${C.teal}" stroke-width="2"/>
        <path d="M${GX - 7} ${gateTop - 26} l5 5 l9 -10" stroke="${C.teal}" stroke-width="2.2" fill="none"
              stroke-linecap="round" stroke-linejoin="round"/>
        <text x="${GX}" y="${gateTop - 58}" text-anchor="middle" font-size="15" font-weight="700" fill="${C.teal}">기관 전용 가드레일</text>
      </g>
      <rect id="scan" x="${STOP - 6}" y="${LANES[0] - 8}" width="${PW + 12}" height="${LANES[2] - LANES[0] + PH + 16}" rx="14"
            fill="${C.teal}" opacity="0" style="opacity:0"/>

      <!-- 질의 셋 -->
      ${ITEMS.map((it, i) => packet(it, LANES[i])).join('')}
      <text id="blocked" x="${STOP + PW / 2}" y="${LANES[1] + PH + 20}" text-anchor="middle" font-size="12.5"
            font-weight="700" fill="${C.red}">반출 차단 · 감사 기록</text>

      <!-- 답변도 돌아올 때 다시 -->
      <g id="ret">
        <path id="ret-line" d="M612 470 C 560 580, 270 580, 222 484" fill="none" stroke="${C.teal}"
              stroke-width="1.8" stroke-dasharray="6 6" marker-end="url(#${uid}-ar)"/>
        <text x="${GX}" y="586" text-anchor="middle" font-size="12.5" fill="${C.teal}">답변도 돌아올 때 다시 검사</text>
      </g>

      <!-- 결론 한 줄 -->
      <text id="msg" x="380" y="628" text-anchor="middle" font-size="19" font-weight="700" fill="${C.ink}">같은 질문, 같은 AI — 달라진 것은 <tspan fill="${C.teal}">기관 전용 가드레일</tspan> 하나</text>
    </svg>`;
  return host.querySelector('svg');
}

/** 두 막을 한 번 돌고, 잠시 결론을 보여 준 뒤 다시 돈다 (표지는 오래 띄워 두는 화면이다). */
export function playCover(svg) {
  const q = (s) => svg.querySelector(s);
  const pk = ITEMS.map((it) => q('#' + it.id));
  const cards = pk.map((p) => p.querySelector('.card'));
  const stats = pk.map((p) => p.querySelector('.stat'));
  const orig = q('.sub-orig');
  const mask = q('.sub-mask');
  const gate = q('#gate');
  const retLine = q('#ret-line');
  const retLen = retLine.getTotalLength();
  const dx = (i, x) => x - ITEMS[i].end; // 최종 자리 기준 상대 x

  const tl = gsap.timeline({ repeat: -1, repeatDelay: 3.2 });

  // ── 시작 상태 (반복할 때마다 다시 깐다)
  tl.set(q('#pill-now'), { opacity: 1 }, 0)
    .set([q('#pill-guard'), q('#leak'), q('#blocked'), q('#ret'), q('#msg'), q('#scan'), ...stats], { opacity: 0 }, 0)
    .set(gate, { opacity: 0, scaleY: 0, transformOrigin: `${GX}px 462px` }, 0)
    .set(pk, { opacity: 1, x: (i) => dx(i, START), y: 0, scale: 1 }, 0)
    .set(cards, { stroke: C.amber }, 0)
    .set(orig, { opacity: 1 }, 0)
    .set(mask, { opacity: 0 }, 0)
    .set(q('#border'), { opacity: 1 }, 0);

  // ── 1막: 아무 확인 없이 넘어간다
  tl.to(pk, { x: (i) => dx(i, INTO), duration: 1.7, stagger: 0.22, ease: 'power1.inOut' }, 0.5)
    .to(cards, { stroke: C.red, duration: 0.25, stagger: 0.22 }, 1.5)
    .to(q('#border'), { opacity: 0.35, duration: 0.18, yoyo: true, repeat: 3 }, 1.4)
    .to(q('#leak'), { opacity: 1, duration: 0.4 }, 3.0)
    .to(pk, { x: (i) => dx(i, 676 - PW * 0.15), y: (i) => 296 - PH * 0.15 - LANES[i], scale: 0.3,
              opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power2.in' }, 2.6);

  // ── 막 전환: 검사대가 선다
  tl.addLabel('act2', 4.3)
    .to(pk, { opacity: 0, duration: 0.35 }, 'act2')
    .to(q('#leak'), { opacity: 0, duration: 0.35 }, 'act2')
    .to(q('#pill-now'), { opacity: 0, duration: 0.3 }, 'act2')
    .to(q('#pill-guard'), { opacity: 1, duration: 0.4 }, 'act2+=0.3')
    .to(gate, { opacity: 1, scaleY: 1, duration: 0.8, ease: 'back.out(1.6)' }, 'act2+=0.3')
    .set(pk, { x: (i) => dx(i, START), y: 0, scale: 1 }, 'act2+=0.4')
    .set(cards, { stroke: C.amber }, 'act2+=0.4')
    .to(pk, { opacity: 1, duration: 0.35 }, 'act2+=0.9');

  // ── 2막: 검사대 앞에 멈추고, 세 갈래로 갈린다
  tl.to(pk, { x: (i) => dx(i, STOP), duration: 0.9, stagger: 0.15, ease: 'power2.out' }, 'act2+=1.2')
    .to(q('#scan'), { opacity: 0.16, duration: 0.25, yoyo: true, repeat: 1 }, 'act2+=2.3')
    // 명단: 주민번호를 가리고
    .to(orig, { opacity: 0, duration: 0.25 }, 'act2+=2.9')
    .to(mask, { opacity: 1, duration: 0.25 }, 'act2+=3.05')
    .to(cards[0], { stroke: C.teal, duration: 0.3 }, 'act2+=2.9')
    .to(stats[0], { opacity: 1, duration: 0.3 }, 'act2+=3.0')
    // 연구노트: 막힌다
    .to(cards[1], { stroke: C.red, duration: 0.3 }, 'act2+=3.2')
    .to(stats[1], { opacity: 1, duration: 0.3 }, 'act2+=3.2')
    .to(pk[1], { x: dx(1, STOP) - 10, duration: 0.07, yoyo: true, repeat: 5 }, 'act2+=3.3')
    .to(q('#blocked'), { opacity: 1, duration: 0.3 }, 'act2+=3.5')
    // 일반 질문: 그대로
    .to(cards[2], { stroke: C.green, duration: 0.3 }, 'act2+=3.4')
    .to(stats[2], { opacity: 1, duration: 0.3 }, 'act2+=3.4')
    // 통과하는 둘이 국경을 넘는다
    .to([pk[0], pk[2]], { x: 0, duration: 0.9, stagger: 0.12, ease: 'power2.inOut' }, 'act2+=3.8')
    // 답변이 돌아온다
    .set(retLine, { strokeDasharray: retLen, strokeDashoffset: retLen }, 'act2+=4.6')
    .to(q('#ret'), { opacity: 1, duration: 0.2 }, 'act2+=4.6')
    .to(retLine, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out' }, 'act2+=4.6')
    .set(retLine, { strokeDasharray: '6 6', strokeDashoffset: 0 }, 'act2+=5.55')
    .to(q('#msg'), { opacity: 1, duration: 0.5 }, 'act2+=5.4');

  return tl;
}

/** 연출 값을 걷어내 마크업이 가진 결론 화면으로 돌린다.
 *  타임라인은 부르는 쪽이 먼저 죽인다 — 여기서 svg 전체의 트윈을 죽이면 지구본 자전까지 멈춘다. */
export function settleCover(svg) {
  if (!svg) return;
  gsap.set(svg.querySelectorAll('[id], .card, .stat, .sub-orig, .sub-mask'), { clearProps: 'all' });
}
