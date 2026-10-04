/* 최종발표 슬라이드 — reveal.js 초기화 + 도식 + 연출.
 *
 * 도식은 web/ 과 같은 원칙으로 전부 인라인 SVG 직접 제작이다.
 * 아이콘 폰트·이모지·스톡 이미지를 쓰지 않는다.  다만 web/ 의 장면이
 * 아이소메트릭인 것과 달리 발표 도식은 평면으로 그린다 — 강당에서 한 번
 * 보고 알아야 하는 그림이라 단면·층을 보여 줄 시간이 없다.
 */
import Reveal from 'reveal.js';
// 발표자 노트(S 키) — 스크립트를 종이로 들고 올라가지 않기 위해 슬라이드에 심는다.
import RevealNotes from 'reveal.js/plugin/notes/notes.esm.js';
import 'reveal.js/dist/reveal.css';
import './theme.css';
import { gsap } from 'gsap';
import { ARCH_STEPS, buildArchitecture, makeArchController } from './arch.js';
import { USER_STEPS, buildUserScenario, makeUserController } from './scenario-user.js';
import { PATH_CAPTIONS, PATH_STEPS, buildPaths, makePathController } from './paths.js';
import { STACK_STEPS, buildStack, makeStackController } from './stack.js';

const C = {
  amber: '#f5b355',
  teal: '#5fcfb0',
  red: '#f27a6d',
  green: '#95cf70',
  ink: '#f4f3ef',
  ink2: '#c7c8ce',
  ink3: '#9b9da6',
  line: '#3d4250',
  plate: '#1c1f27',
  ground2: '#14161c',
};

/** 모든 SVG 는 이 헬퍼를 경유한다 — role/title/desc 를 빠뜨리지 않기 위해서. */
function svgWrap(node, { viewBox, title, desc }) {
  const uid = `svg-${Math.random().toString(36).slice(2, 9)}`;
  node.innerHTML = `
    <svg viewBox="${viewBox}" role="img" aria-labelledby="${uid}-t ${uid}-d"
         preserveAspectRatio="xMidYMid meet" font-family="'Noto Sans KR', system-ui, sans-serif">
      <title id="${uid}-t">${title}</title>
      <desc id="${uid}-d">${desc}</desc>
      ${node.dataset.body || ''}
    </svg>`;
  return node.querySelector('svg');
}

/** 등급 배지 — C/S/O 한 글자. */
function badge(x, y, letter, color, label) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="34" height="34" rx="9"
            fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-width="1.5"/>
      <text x="${x + 17}" y="${y + 23}" text-anchor="middle"
            font-size="17" font-weight="700" fill="${color}">${letter}</text>
      <text x="${x + 44}" y="${y + 23}" font-size="15" fill="${C.ink2}">${label}</text>
    </g>`;
}

/** 사람 실루엣 — 원 머리 + 라운드 몸통 (web/ 과 같은 규칙). */
function person(x, y, s = 1, color = C.ink2) {
  return `
    <g transform="translate(${x},${y}) scale(${s})" fill="${color}">
      <circle cx="0" cy="-13" r="7.5"/>
      <path d="M-9 4 Q-9 -4 0 -4 Q9 -4 9 4 L9 11 Q9 14 6 14 L-6 14 Q-9 14 -9 11 Z"/>
    </g>`;
}

/* ── 도식 1 — 등급이 갈리는 지점 ──────────────────────────── */
function diagramGrades(host) {
  const body = `
    <!-- 위치: 기관 전산망 (S) -->
    <rect x="40" y="74" width="440" height="276" rx="20"
          fill="${C.ground2}" stroke="${C.line}" stroke-width="1.5"/>
    <text x="64" y="112" font-size="16" font-weight="600" fill="${C.ink}">위치 — 기관 전산망</text>
    ${badge(386, 90, 'S', C.amber, '')}

    <!-- 주체: 이용자 단말 (S) -->
    <rect x="68" y="140" width="384" height="182" rx="16"
          fill="${C.plate}" stroke="${C.line}" stroke-width="1.5"/>
    <text x="90" y="172" font-size="15" font-weight="600" fill="${C.ink2}">주체 — 이용자 단말</text>
    ${badge(362, 150, 'S', C.amber, '')}
    ${person(136, 250, 1.5)}
    ${person(206, 250, 1.5)}
    ${person(276, 250, 1.5)}
    ${person(346, 250, 1.5)}
    <text x="241" y="306" text-anchor="middle" font-size="13" fill="${C.ink3}">교직원 · 학생 · 연구원</text>

    <!-- 질의가 나가는 화살표 -->
    <path d="M490 212 L688 212" stroke="${C.amber}" stroke-width="3"
          marker-end="url(#ar-amber)"/>
    <text x="560" y="198" font-size="14" fill="${C.amber}" font-weight="600">질의</text>

    <!-- 등급이 갈리는 경계 -->
    <line x1="700" y1="54" x2="700" y2="372" stroke="${C.red}"
          stroke-width="2.5" stroke-dasharray="9 7"/>
    <g transform="translate(700,40)">
      <rect x="-96" y="-26" width="192" height="30" rx="8"
            fill="${C.red}" fill-opacity="0.14" stroke="${C.red}" stroke-width="1.5"/>
      <text x="0" y="-5" text-anchor="middle" font-size="14" font-weight="700"
            fill="${C.red}">등급이 갈리는 지점</text>
    </g>

    <!-- 객체: 외부 생성형 AI (O) -->
    <rect x="720" y="74" width="440" height="276" rx="20"
          fill="${C.ground2}" stroke="${C.line}" stroke-width="1.5"/>
    <text x="744" y="112" font-size="16" font-weight="600" fill="${C.ink}">객체 — 외부 생성형 AI</text>
    ${badge(1066, 90, 'O', C.teal, '')}
    <g transform="translate(940,228)">
      <circle r="66" fill="none" stroke="${C.ink3}" stroke-width="1.8"/>
      <ellipse rx="66" ry="25" fill="none" stroke="${C.ink3}" stroke-width="1.3"/>
      <ellipse rx="26" ry="66" fill="none" stroke="${C.ink3}" stroke-width="1.3"/>
      <line x1="-66" y1="0" x2="66" y2="0" stroke="${C.ink3}" stroke-width="1.3"/>
    </g>
    <text x="940" y="322" text-anchor="middle" font-size="13" fill="${C.ink3}">국경 밖 · 우리 관제 밖</text>

    <defs>
      <marker id="ar-amber" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.amber}"/>
      </marker>
    </defs>`;
  host.dataset.body = body;
  svgWrap(host, {
    viewBox: '0 0 1200 400',
    title: '위치·주체·객체의 등급 — 객체에서 등급이 갈린다',
    desc: '기관 전산망(위치 S) 안의 이용자 단말(주체 S)에서 나간 질의가 외부 생성형 AI(객체 O)로 넘어가며 등급이 S에서 O로 갈린다. 그 경계가 통제 지점이다.',
  });
}

/* ── 도식 2 — 양방향 검사대 ───────────────────────────────── */
function diagramGate(host) {
  const gate = (x, label, sub, color) => `
    <g>
      <rect x="${x}" y="118" width="178" height="164" rx="16"
            fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="2"/>
      <text x="${x + 89}" y="160" text-anchor="middle" font-size="17"
            font-weight="700" fill="${color}">${label}</text>
      <text x="${x + 89}" y="186" text-anchor="middle" font-size="13" fill="${C.ink2}">${sub}</text>
      <!-- 검사 슬릿 -->
      ${[0, 1, 2].map((i) => `<rect x="${x + 36 + i * 38}" y="206" width="22" height="52"
            rx="5" fill="none" stroke="${color}" stroke-width="1.6" stroke-opacity="0.65"/>`).join('')}
    </g>`;

  const body = `
    <!-- 캠퍼스 -->
    <text x="78" y="126" text-anchor="middle" font-size="14" font-weight="600" fill="${C.ink2}">캠퍼스</text>
    ${person(78, 200, 1.7, C.amber)}
    <text x="78" y="246" text-anchor="middle" font-size="12" fill="${C.ink3}">구성원</text>

    <!-- 나가는 길 -->
    <path d="M128 182 L218 182" stroke="${C.amber}" stroke-width="3" marker-end="url(#ar-a)"/>
    <text x="173" y="170" text-anchor="middle" font-size="13" fill="${C.amber}" font-weight="600">질의</text>
    ${gate(228, '출국 검사', '질의 필터 · 1차', C.teal)}
    <path d="M418 182 L516 182" stroke="${C.amber}" stroke-width="3" marker-end="url(#ar-a)"/>

    <!-- 국경 밖 -->
    <g transform="translate(600,200)">
      <circle r="52" fill="none" stroke="${C.ink3}" stroke-width="1.8"/>
      <ellipse rx="52" ry="19" fill="none" stroke="${C.ink3}" stroke-width="1.2"/>
      <ellipse rx="20" ry="52" fill="none" stroke="${C.ink3}" stroke-width="1.2"/>
      <line x1="-52" y1="0" x2="52" y2="0" stroke="${C.ink3}" stroke-width="1.2"/>
    </g>
    <text x="600" y="284" text-anchor="middle" font-size="13" fill="${C.ink3}">외부 생성형 AI</text>
    <text x="600" y="126" text-anchor="middle" font-size="14" font-weight="600" fill="${C.ink2}">국경 밖</text>

    <!-- 돌아오는 길 -->
    <path d="M684 218 L782 218" stroke="${C.green}" stroke-width="3" marker-end="url(#ar-g)"/>
    ${gate(794, '입국 검사', '답변 필터 · 2차', C.teal)}
    <path d="M984 218 L1074 218" stroke="${C.green}" stroke-width="3" marker-end="url(#ar-g)"/>
    <text x="1029" y="206" text-anchor="middle" font-size="13" fill="${C.green}" font-weight="600">답변</text>
    ${person(1124, 200, 1.7, C.green)}
    <text x="1124" y="246" text-anchor="middle" font-size="12" fill="${C.ink3}">구성원</text>

    <!-- 기록실 -->
    <g transform="translate(600,340)">
      <rect x="-128" y="-24" width="256" height="48" rx="12"
            fill="${C.plate}" stroke="${C.line}" stroke-width="1.5"/>
      <text x="0" y="6" text-anchor="middle" font-size="13" fill="${C.ink2}">
        감사 기록 — 판정만, 원문은 남기지 않음
      </text>
    </g>
    <path d="M317 290 L492 318" stroke="${C.line}" stroke-width="1.4" stroke-dasharray="4 4"/>
    <path d="M883 290 L708 318" stroke="${C.line}" stroke-width="1.4" stroke-dasharray="4 4"/>

    <defs>
      <marker id="ar-a" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.amber}"/>
      </marker>
      <marker id="ar-g" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.green}"/>
      </marker>
    </defs>`;
  host.dataset.body = body;
  svgWrap(host, {
    viewBox: '0 0 1200 390',
    title: '양방향 검사대 — 나가는 질의와 돌아오는 답변을 각각 검사한다',
    desc: '구성원의 질의가 출국 검사(질의 필터)를 거쳐 외부 생성형 AI 로 나가고, 돌아온 답변이 입국 검사(답변 필터)를 거쳐 전달된다. 두 검사의 판정만 감사 기록에 남고 질의 원문은 저장하지 않는다.',
  });
}

/* ── 초기화 ───────────────────────────────────────────────── */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 등장 연출의 투명도 하한.
 *
 * 0 에서 시작하면 트윈이 어떤 이유로든 중간에 멈췄을 때 슬라이드가 통째로
 * 비어 보인다 — 발표 중에 이게 나면 복구할 방법이 없다.  실제로 헤드리스
 * 캡처에서 제목만 사라지는 것을 확인했다.  그래서 페이드를 완전히 버리는
 * 대신 하한을 둔다: 최악의 경우에도 글자는 읽힌다. */
const OPACITY_FLOOR = 0.5;

// 슬라이드를 빼고 넣는 일이 잦으므로 **항상 존재 여부를 확인하고 그린다.**
// 없는 요소에 그리려다 모듈 전체가 죽으면 화면이 통째로 하얘진다
// (「어디가 문제인가」 슬라이드를 뺐을 때 실제로 그랬다).
const gradesHost = document.getElementById('stage-grades');
if (gradesHost) diagramGrades(gradesHost);
const gateHost = document.getElementById('stage-gate');
if (gateHost) diagramGate(gateHost);

/* ══ 문장 단위 줄바꿈 ═══════════════════════════════════════
 *
 * `word-break: keep-all` 은 **어절**이 쪼개지는 것만 막는다.  그래서
 * 「… 막는 것이 없습니다. 누가 무엇을」 처럼 다음 문장의 앞 두 어절이
 * 앞 줄 꼬리에 매달린다.  읽는 사람은 줄 끝에서 한 번 더 멈춘다.
 *
 * 투사 화면에서는 **문장이 줄의 단위**여야 한다.  그래서 문장마다 블록을
 * 하나씩 만들어 준다 — 문장이 길어 한 줄에 못 들어가면 그 안에서 접히고,
 * 문장 경계에서는 반드시 줄이 바뀐다.
 *
 * 문구를 손으로 고치지 않고 런타임에서 감싸는 이유: 슬라이드를 새로
 * 넣을 때마다 같은 실수를 반복하지 않기 위해서다.  `<br>` 로 박아 두면
 * 화면 폭이 달라지는 순간 다시 어긋난다.
 */
const PROSE = [
  '.lead', '.punch', '.quote__text', '.card__body', '.card__cite',
  '.cite', '.stat__label', '.tl-note', '.b-item__sub', '.arch-caption',
];

/** 태그 **바깥**의 문장 경계에서만 자른다.
 *  `(?![^<]*>)` 가 "여는 꺾쇠 안에 있지 않다"를 뜻한다. 숫자(5.33)는
 *  마침표 뒤가 공백이 아니므로 애초에 걸리지 않는다.
 *
 *  닫는 태그는 건너뛴다 — `됩니다.</em> 가장` 처럼 강조가 문장 끝까지
 *  걸쳐 있으면 마침표 바로 뒤가 공백이 아니라서 경계를 놓친다. */
const SENTENCE_SPLIT = /(?<=[.!?](?:<\/[a-z]+>)*)\s+(?![^<]*>)/;

function splitSentences(el) {
  if (el.dataset.sw === '1') return;
  el.dataset.sw = '1';

  // 이미 <br> 로 줄을 박아 둔 곳은 작성자의 의도이므로 건드리지 않는다.
  if (el.querySelector('br')) return;

  const html = el.innerHTML.trim();
  const parts = html.split(SENTENCE_SPLIT).map((t) => t.trim()).filter(Boolean);
  if (parts.length < 2) return;

  const next = parts.map((t) => `<span class="sent">${t}</span>`).join(' ');

  // 인라인 태그가 문장 경계를 걸치고 있으면 쪼갠 결과가 깨진다.  글자가
  // 그대로인지 확인하고, 다르면 원래대로 둔다 — 깨진 화면보다 어색한
  // 줄바꿈이 낫다.
  const probe = document.createElement('div');
  probe.innerHTML = next;
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  if (norm(probe.textContent) !== norm(el.textContent)) return;

  el.innerHTML = next;
}

document.querySelectorAll(PROSE.join(',')).forEach(splitSentences);

// 슬라이드 번호 — 발표 중 "몇 장 남았나" 가 보여야 한다.
const sections = [...document.querySelectorAll('.slides > section')];
sections.forEach((s, i) => {
  const n = document.createElement('span');
  n.className = 'slide-no';
  n.textContent = `${String(i + 1).padStart(2, '0')} / ${sections.length}`;
  s.querySelector('.wrap').appendChild(n);
});

const deck = new Reveal({
  hash: true,
  // 확대 단계까지 주소에 담는다 — 발표 중 특정 단계로 바로 들어갈 수 있고,
  // 화면을 캡처해 확인할 때도 그 단계를 지정할 수 있다.
  fragmentInURL: true,
  slideNumber: false,
  controls: true,
  progress: true,
  center: false,
  transition: reduced ? 'none' : 'slide',
  transitionSpeed: 'default',
  width: 1600,
  height: 900,
  margin: 0.04,
  minScale: 0.2,
  maxScale: 1.6,
  plugins: [RevealNotes],
  // 발표자 노트(S 키)와 PDF 내보내기(?print-pdf)는 reveal 기본 기능으로 쓴다.
});

deck.on('ready', (e) => animate(e.currentSlide));

/* 연출은 셋뿐 — 올라오며 나타나기 / 숫자 세어 올리기 / 강조 칸 켜기.
   web/ 의 모션 원칙과 같다.  더 넣지 말 것.

   발표용이라 한 가지 규칙을 더 지킨다: **정지 상태는 언제나 읽을 수 있어야 한다.**
   애니메이션이 opacity 0 에서 시작하므로, 중간에 무엇이 어긋나면 슬라이드가
   통째로 비어 보인다 (web/ 의 f2419ea 회귀와 같은 종류).  그래서
   ① gsap.from 으로 쉬는 상태를 DOM 의 자연 상태로 두고
   ② 끝나면 clearProps 로 인라인 스타일을 지우고
   ③ 1.2초 뒤 무조건 보이게 만드는 감시 타이머를 건다. */
function animate(slide) {
  if (!slide || reduced) return;
  const wrap = slide.querySelector('.wrap');
  if (!wrap) return;

  const kids = [...wrap.children].filter(
    (el) => !el.classList.contains('spacer') && !el.classList.contains('slide-no'),
  );

  // gsap.from 을 쓰면 안 된다 — from 은 **현재 값**을 종료값으로 읽는다.
  // 초기화와 slidechanged 가 겹쳐 호출되면 애니메이션 중간값(opacity 0.3,
  // 심하면 0)을 종료값으로 굳혀서 제목이 영영 안 보인다.  fromTo 로 끝 상태를
  // 명시하고, 시작 전에 이전 트윈과 인라인 스타일을 지워 몇 번을 불러도
  // 같은 결과가 나오게 한다.
  gsap.killTweensOf(kids);
  gsap.set(kids, { clearProps: 'all' });
  gsap.fromTo(
    kids,
    { y: 28, opacity: OPACITY_FLOOR },
    {
      y: 0,
      opacity: 1,
      duration: 0.62,
      stagger: 0.08,
      ease: 'power3.out',
      clearProps: 'all',
    },
  );

  // 묶음 안의 낱개도 차례로 올라온다.  카드 네 장이 한 덩어리로 나타나면
  // 청중의 눈이 어디부터 볼지 정하지 못한다 — 순서를 눈으로 정해 준다.
  const inner = slide.querySelectorAll(
    '.grid > *, .tbl tr, .beyond > *, .timeline .tl-row',
  );
  if (inner.length) {
    gsap.killTweensOf(inner);
    gsap.set(inner, { clearProps: 'all' });
    gsap.fromTo(
      inner,
      { y: 14, opacity: OPACITY_FLOOR },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.055,
        delay: 0.18,
        ease: 'power3.out',
        clearProps: 'all',
      },
    );
  }

  // 큰 숫자는 살짝 눌렸다 펴진다.  숫자를 세어 올리면 중간에 **틀린 값**이
  // 보이므로(「300,000」 자리에 「11,163」) 크기만 건드린다.
  const nums = slide.querySelectorAll('.stat__num');
  if (nums.length) {
    gsap.fromTo(
      nums,
      { scale: 0.94 },
      { scale: 1, duration: 0.55, stagger: 0.07, delay: 0.24,
        ease: 'back.out(1.8)', clearProps: 'transform' },
    );
  }

  // 결론 한 줄은 왼쪽 띠가 자라면서 들어온다.
  const punch = slide.querySelector('.punch');
  if (punch) {
    gsap.fromTo(
      punch,
      { x: -10 },
      { x: 0, duration: 0.5, delay: 0.3, ease: 'power3.out', clearProps: 'transform' },
    );
  }

  // 아이브로우는 왼쪽에서 밀려 들어온다 — 장면이 바뀌었다는 신호를 가장 먼저 준다.
  const kicker = slide.querySelector('.kicker');
  if (kicker) {
    gsap.fromTo(
      kicker,
      { x: -16, letterSpacing: '0.34em' },
      { x: 0, letterSpacing: '0.17em', duration: 0.6, ease: 'power3.out',
        clearProps: 'transform,letterSpacing' },
    );
  }

  // 제목은 가려진 창에서 쓸어 올리듯 나타난다 (web/ 의 '제목은 줄 단위' 와 같은 취지).
  const head = slide.querySelector('h1, h2');
  if (head) {
    gsap.fromTo(
      head,
      { clipPath: 'inset(0 0 100% 0)', y: 16 },
      { clipPath: 'inset(0 0 -10% 0)', y: 0, duration: 0.72,
        ease: 'power3.out', clearProps: 'clipPath,transform' },
    );
  }

  // 도면 안의 선은 그려지듯 들어온다. 길이를 몰라도 되도록 getTotalLength 로 잰다.
  slide.querySelectorAll('.stage svg path[marker-end], .arch-stage svg path[marker-end]')
    .forEach((path, i) => {
      let len = 0;
      try {
        len = path.getTotalLength();
      } catch {
        return;
      }
      if (!len) return;
      gsap.fromTo(
        path,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 0.7, delay: 0.35 + i * 0.09,
          ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' },
      );
    });

  // Beyond 칸은 해당하는 둘만 켜진다.
  const hits = slide.querySelectorAll('.b-item--hit');
  if (hits.length) {
    gsap.fromTo(hits, { scale: 0.96 }, { scale: 1, duration: 0.5, stagger: 0.12, ease: 'power3.out', clearProps: 'transform' });
  }

  // 감시 타이머 — 무슨 일이 있어도 이 시점엔 완성된 화면이 남는다.
  //
  // **지우기 전에 죽여야 한다.**  clearProps 만 하면 아직 돌고 있는 트윈이
  // 다음 틱에 중간값을 다시 써서, 제목이 clip-path 중간(글자가 가로로 잘린
  // 상태)에서 굳는다.  헤드리스 캡처에서 재현했다 — 브라우저가 프레임을
  // 늦게 그리면 실제 발표 화면에서도 같은 일이 난다.
  clearTimeout(animate._guard);
  animate._guard = setTimeout(() => {
    const all = [
      ...kids,
      ...slide.querySelectorAll(
        '.grid > *, .tbl tr, .beyond > *, .timeline .tl-row, .stat__num, .punch, .b-item--hit, h1, h2, .kicker,'
        // 선 그리기도 되돌려야 한다 — dashoffset 이 길이만큼 남아 있으면
        // 선이 통째로 안 보이고 화살표 머리만 떠 있다 (구성도에서 확인).
        + ' .stage svg path[marker-end], .arch-stage svg path[marker-end]',
      ),
    ];
    gsap.killTweensOf(all);
    gsap.set(all, { clearProps: 'all' });
  }, 1500);
}

deck.on('slidechanged', (e) => animate(e.currentSlide));

/* ══ 유출 시나리오 ════════════════════════════════════════════
 *
 * 청중이 「내가 어제 한 그 행동」으로 알아보게 만드는 것이 목적이다.
 * 그래서 추상적인 상자그림이 아니라 **실제로 보는 채팅창 모양**으로 그린다.
 *
 * 단, 남의 화면을 흉내 낸 가짜 스크린샷은 만들지 않는다 — 우리가 그린
 * 도식이라는 것이 분명해야 한다.  제품 이름은 글자로만 적는다.
 *
 * 두 장면 모두 **끝난 자리가 완성된 그림**이 되도록 짰다.  모션을 끄거나
 * 중간에 멈춰도 설명이 사라지지 않는다 (web/ 과 같은 원칙).
 */

const FILE_NAME = '장학생_명단_2026.xlsx';
const PROMPT_TEXT = '이번 학기 장학금 지급 대상자 명단 좀 정리해 줘';

/* ── 장면 A — 지금 무엇을 넣고 있나 ───────────────────────── */
function scenarioInput(host) {
  const rows = [
    ['첨부파일 전체', '학생 이름·학번·주민등록번호가 든 원본 그대로'],
    ['붙여넣은 표', '내부 문서에서 긁어온 셀은 출처가 지워진 채 올라갑니다'],
    ['앞선 대화 전부', '같은 창에서 주고받은 앞의 질문과 답이 함께 갑니다'],
    ['자동으로 붙는 것', '계정·조직·접속 기록 — 내가 넣은 적 없는 것들'],
  ];

  const item = (i, y, [t, sub]) => `
    <g id="itm-${i}">
      <rect x="724" y="${y - 21}" width="13" height="13" rx="3.5" fill="${C.amber}"/>
      <text x="754" y="${y - 9}" font-size="16" font-weight="600" fill="${C.ink}">${t}</text>
      <text x="754" y="${y + 15}" font-size="13.5" fill="${C.ink2}">${sub}</text>
    </g>`;

  host.dataset.body = `
    <!-- 채팅창 -->
    <g id="win" >
      <rect x="30" y="26" width="648" height="348" rx="16"
            fill="${C.plate}" stroke="${C.line}" stroke-width="1.5"/>
      <line x1="30" y1="70" x2="678" y2="70" stroke="${C.line}" stroke-width="1.5"/>
      <circle cx="56" cy="48" r="5.5" fill="#3a3e49"/>
      <circle cx="75" cy="48" r="5.5" fill="#3a3e49"/>
      <circle cx="94" cy="48" r="5.5" fill="#3a3e49"/>
      <text x="118" y="54" font-size="14.5" font-weight="600" fill="${C.ink2}">외부 생성형 AI</text>
      <text x="238" y="54" font-size="13" fill="${C.ink3}">ChatGPT · Claude · Gemini …</text>
    </g>

    <!-- 앞선 대화 -->
    <g id="hist">
      <rect x="372" y="92" width="282" height="34" rx="10" fill="#23262f"/>
      <text x="392" y="114" font-size="13" fill="${C.ink3}">지난주 성적 산출 기준 알려 줘</text>
      <rect x="54" y="136" width="356" height="50" rx="10" fill="#1a1d25"/>
      <text x="74" y="157" font-size="13" fill="${C.ink3}">학칙 제38조에 따라 평점은…</text>
      <text x="74" y="175" font-size="13" fill="${C.ink3}">(앞선 대화도 함께 전송됩니다)</text>
    </g>

    <!-- 입력창 -->
    <g id="box">
      <rect x="54" y="204" width="600" height="148" rx="12"
            fill="${C.ground2}" stroke="${C.line}" stroke-width="1.5"/>
      <text id="tx" x="74" y="238" font-size="15" fill="${C.ink}"></text>
      <rect id="caret" x="74" y="222" width="2" height="20" fill="${C.amber}"/>

      <g id="chip">
        <rect x="74" y="258" width="286" height="34" rx="9"
              fill="${C.amber}" fill-opacity="0.13" stroke="${C.amber}" stroke-width="1.3"/>
        <path d="M92 270 v-4 a5 5 0 0 1 10 0 v10 a8 8 0 0 1 -16 0 v-9"
              fill="none" stroke="${C.amber}" stroke-width="1.6" stroke-linecap="round"/>
        <text x="112" y="280" font-size="13.5" fill="${C.amber}">${FILE_NAME}</text>
      </g>
      <g id="warn">
        <rect x="372" y="258" width="222" height="34" rx="9"
              fill="${C.red}" fill-opacity="0.15" stroke="${C.red}" stroke-width="1.3"/>
        <text x="392" y="280" font-size="13.5" font-weight="600" fill="${C.red}">주민등록번호 1,204건 포함</text>
      </g>

      <g id="send">
        <circle cx="614" cy="322" r="20" fill="${C.teal}"/>
        <path d="M605 322 h17 M614 314 l8 8 l-8 8"
              stroke="${C.ground}" stroke-width="3" fill="none"
              stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </g>

    <!-- 함께 올라가는 것 -->
    <text x="724" y="54" font-size="17" font-weight="700" fill="${C.ink}">이 질문 하나에 함께 올라가는 것</text>
    <line x1="724" y1="72" x2="1170" y2="72" stroke="${C.line}" stroke-width="1.5"/>
    ${rows.map((r, i) => item(i, 128 + i * 68, r)).join('')}`;

  svgWrap(host, {
    viewBox: '0 0 1200 400',
    title: '외부 생성형 AI 입력창 — 질문 하나에 함께 올라가는 것들',
    desc:
      '외부 생성형 AI 채팅창에 장학금 명단 정리를 요청하는 질문을 입력하고 학생 명단 엑셀 파일을 첨부한다. ' +
      '그 한 번의 전송에 첨부파일 원본, 붙여넣은 표, 앞선 대화 전부, 계정·접속 기록이 함께 올라간다.',
  });
}

function playInput(svg) {
  const $ = (id) => svg.querySelector('#' + id);
  const tx = $('tx');
  const tl = gsap.timeline();

  gsap.set([$('hist'), $('box'), $('chip'), $('warn')], { opacity: 0 });
  gsap.set(svg.querySelectorAll('[id^="itm-"]'), { opacity: 0.22 });
  $('caret').setAttribute('opacity', '1');
  tx.textContent = '';

  tl.from($('win'), { y: 18, opacity: 0, duration: 0.5, ease: 'power3.out' })
    .to($('hist'), { opacity: 1, duration: 0.4 }, '-=0.1')
    .to($('box'), { opacity: 1, duration: 0.4 }, '-=0.15');

  // 타이핑 — 글자 수를 진행도로 돌린다
  const typed = { n: 0 };
  tl.to(typed, {
    n: PROMPT_TEXT.length,
    duration: 1.5,
    ease: 'none',
    onUpdate() {
      tx.textContent = PROMPT_TEXT.slice(0, Math.round(typed.n));
      // 캐럿은 글자 끝에 붙어 간다 (실제 렌더 폭을 읽어서)
      let w = 0;
      try {
        w = tx.getComputedTextLength();
      } catch {
        w = 0;
      }
      gsap.set($('caret'), { x: w });
    },
  });

  tl.to($('chip'), { opacity: 1, duration: 0.3, ease: 'power3.out' }, '+=0.15')
    .from($('chip'), { y: 10, duration: 0.3, ease: 'power3.out' }, '<')
    .to($('warn'), { opacity: 1, duration: 0.25 }, '+=0.2')
    .from($('warn'), { scale: 0.9, transformOrigin: '483px 275px', duration: 0.3, ease: 'back.out(2)' }, '<')
    .to(svg.querySelectorAll('[id^="itm-"]'), { opacity: 1, duration: 0.35, stagger: 0.16 }, '-=0.1')
    .to($('send'), { scale: 1.12, transformOrigin: '614px 322px', duration: 0.3, yoyo: true, repeat: 3, ease: 'power2.inOut' }, '-=0.5')
    .to($('caret'), { opacity: 0, duration: 0.2 }, '<');

  return tl;
}

/* ── 장면 B — 국경을 넘은 다음 ────────────────────────────── */
function scenarioAfter(host) {
  const dests = [
    ['사업자 서버에 저장', '약관이 정한 기간만큼. 얼마나 남는지는 우리가 정하지 않습니다.'],
    ['모델 학습에 사용', '거부하지 않으면 그것이 기본값인 경우가 있습니다.'],
    ['다른 모델·제3자로 전달', '키미 요청이 Claude 로 넘어간 것처럼, 화면에는 표시되지 않습니다.'],
  ];
  const card = (i, y, [t, sub]) => `
    <g id="dst-${i}">
      <rect x="470" y="${y}" width="700" height="92" rx="14"
            fill="${C.plate}" stroke="${C.red}" stroke-width="1.4" stroke-opacity="0.5"/>
      <circle cx="506" cy="${y + 46}" r="13" fill="${C.red}" fill-opacity="0.18"
              stroke="${C.red}" stroke-width="1.4"/>
      <text x="506" y="${y + 51}" text-anchor="middle" font-size="13"
            font-weight="700" fill="${C.red}">${i + 1}</text>
      <text x="536" y="${y + 40}" font-size="17" font-weight="600" fill="${C.ink}">${t}</text>
      <text x="536" y="${y + 66}" font-size="13.5" fill="${C.ink2}">${sub}</text>
    </g>`;

  host.dataset.body = `
    <!-- 보내는 쪽 -->
    <text x="44" y="46" font-size="14" font-weight="600" fill="${C.ink2}">캠퍼스</text>
    <g id="pkt">
      <rect x="44" y="168" width="188" height="62" rx="12"
            fill="${C.amber}" fill-opacity="0.15" stroke="${C.amber}" stroke-width="1.6"/>
      <text x="64" y="194" font-size="13.5" font-weight="600" fill="${C.amber}">질의 + 첨부파일</text>
      <text x="64" y="214" font-size="12" fill="${C.ink2}">주민등록번호 1,204건</text>
    </g>

    <!-- 국경 -->
    <line x1="330" y1="24" x2="330" y2="376" stroke="${C.red}"
          stroke-width="2.5" stroke-dasharray="9 7"/>
    <text x="330" y="16" text-anchor="middle" font-size="13"
          font-weight="700" fill="${C.red}">국경</text>

    <!-- 갈라지는 길 -->
    <path id="cross" d="M240 199 L 322 199" fill="none" stroke="${C.amber}"
          stroke-width="2.4" marker-end="url(#ar-am)"/>
    <path id="ln-0" d="M330 199 C 400 199, 410 54, 470 54" fill="none"
          stroke="${C.red}" stroke-width="2" stroke-opacity="0.55"/>
    <path id="ln-1" d="M330 199 L 470 184" fill="none"
          stroke="${C.red}" stroke-width="2" stroke-opacity="0.55"/>
    <path id="ln-2" d="M330 199 C 400 199, 410 314, 470 314" fill="none"
          stroke="${C.red}" stroke-width="2" stroke-opacity="0.55"/>

    ${dests.map((d, i) => card(i, 8 + i * 130, d)).join('')}

    <!-- 되돌아오지 않는다 -->
    <g id="back">
      <text x="605" y="398" text-anchor="middle" font-size="13.5"
            font-weight="700" fill="${C.red}">되돌리는 길은 없습니다</text>
      <path d="M1150 424 L 70 424" fill="none" stroke="${C.ink3}"
            stroke-width="1.6" stroke-dasharray="6 6" marker-end="url(#ar-gr)"/>
      <g transform="translate(605,424)">
        <circle r="15" fill="${C.ground}" stroke="${C.red}" stroke-width="2"/>
        <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="${C.red}"
              stroke-width="2.4" stroke-linecap="round"/>
      </g>
    </g>
    <defs>
      <marker id="ar-am" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.amber}"/>
      </marker>
      <marker id="ar-gr" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="${C.ink3}"/>
      </marker>
    </defs>`;

  svgWrap(host, {
    viewBox: '0 0 1200 440',
    title: '국경을 넘은 질의가 가는 세 갈래',
    desc:
      '캠퍼스에서 보낸 질의와 첨부파일이 국경을 넘으면 사업자 서버 저장, 모델 학습 사용, ' +
      '다른 모델이나 제3자로 전달 세 갈래로 흩어진다. 되돌리는 경로는 없다.',
  });
}

function playAfter(svg) {
  const $ = (id) => svg.querySelector('#' + id);
  const lines = [0, 1, 2].map((i) => $('ln-' + i));
  const cards = [0, 1, 2].map((i) => $('dst-' + i));
  const tl = gsap.timeline();

  gsap.set(cards, { opacity: 0.2 });
  gsap.set($('back'), { opacity: 0 });
  tl.eventCallback('onComplete', () => gsap.set(lines, { clearProps: 'strokeDasharray,strokeDashoffset' }));
  lines.forEach((l) => {
    const len = l.getTotalLength();
    gsap.set(l, { strokeDasharray: len, strokeDashoffset: len });
  });

  tl.from($('pkt'), { x: -40, opacity: 0, duration: 0.5, ease: 'power3.out' })
    .to($('pkt'), { x: 120, duration: 0.7, ease: 'power2.in' }, '+=0.25')
    .to(lines, { strokeDashoffset: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out' }, '-=0.2')
    .to(cards, { opacity: 1, duration: 0.4, stagger: 0.18 }, '-=0.45')
    .to($('back'), { opacity: 1, duration: 0.45 }, '+=0.15');

  return tl;
}

/* ── 장면 등록 ────────────────────────────────────────────── */
const scenes = {};
const inputHost = document.getElementById('scn-input');
const afterHost = document.getElementById('scn-after');
if (inputHost) {
  scenarioInput(inputHost);
  scenes['scn-input'] = () => playInput(inputHost.querySelector('svg'));
}
if (afterHost) {
  scenarioAfter(afterHost);
  scenes['scn-after'] = () => playAfter(afterHost.querySelector('svg'));
}

let running = null;
let settleTimer = null;

/** 인라인으로 깔린 연출 값을 걷어내 **마크업이 가진 완성 상태**로 되돌린다. */
function settle(svg) {
  if (!svg) return;
  gsap.set(svg.querySelectorAll('[id]'), { clearProps: 'all' });
  // 캐럿은 완성 화면에 남을 이유가 없다 — 타이핑이 끝난 상태를 그린다.
  const caret = svg.querySelector('#caret');
  if (caret) caret.setAttribute('opacity', '0');
}

function playScenario(slide) {
  const host = slide.querySelector('.scenario');
  if (!host) return;
  const svg = host.querySelector('svg');
  if (running) running.kill();
  clearTimeout(settleTimer);
  settle(svg);

  // 모션을 끄면 마크업 그대로가 완성 화면이다. 글자만 채워 주면 된다.
  const t = svg.querySelector('#tx');
  if (t) t.textContent = PROMPT_TEXT;
  if (reduced) return;

  running = scenes[host.id]?.();

  // 감시 타이머 — 연출이 중간에 끊겨도 이 시점엔 완성 화면이 남는다.
  if (running) {
    const ms = running.duration() * 1000 + 600;
    settleTimer = setTimeout(() => {
      settle(svg);
      if (t) t.textContent = PROMPT_TEXT;
    }, ms);
  }
}

deck.on('slidechanged', (e) => playScenario(e.currentSlide));
deck.on('ready', (e) => playScenario(e.currentSlide));

/* ── 구조 흐름도 — 방향키로 단계마다 확대 ──────────────────── */
const archHost = document.getElementById('arch-stage');
let archGoto = null;
if (archHost) {
  const svg = buildArchitecture(archHost);
  archGoto = makeArchController(svg, document.getElementById('arch-caption'), reduced);
  archGoto(0);
}

/* ── 기술 스택 구성도 — 같은 방식으로 단계마다 확대 ───────── */
const stackHost = document.getElementById('stack-stage');
let stackGoto = null;
if (stackHost) {
  const svg = buildStack(stackHost);
  stackGoto = makeStackController(svg, document.getElementById('stack-caption'), reduced);
  stackGoto(0);
}

function stackStep(slide) {
  if (!stackGoto || !slide || slide.id !== 'slide-stack') return;
  const shown = slide.querySelectorAll('.fragment[data-stack].visible').length;
  stackGoto(Math.min(shown, STACK_STEPS.length - 1));
}

/** 이 슬라이드에서 몇 번째 단계인지 = 보인 fragment 수. */
function archStep(slide) {
  if (!archGoto || !slide || slide.id !== 'slide-arch') return;
  const shown = slide.querySelectorAll('.fragment[data-arch].visible').length;
  archGoto(Math.min(shown, ARCH_STEPS.length - 1));
}

/* ── 사용자 시점 시나리오 — 같은 방식으로 방향키가 장면을 넘긴다 ── */
const userHost = document.getElementById('user-stage');
let userGoto = null;
if (userHost) {
  const svg = buildUserScenario(userHost);
  userGoto = makeUserController(svg, reduced);
}
const USER_CAPTIONS = [
  '평소처럼 주소를 칩니다. <b>연결이 끊깁니다</b> — 복호화하는 것이 아니라 끊는 것입니다.',
  '대신 <b>안내가 뜹니다.</b> 막기만 하고 대안을 주지 않으면 사람들은 주머니에서 폰을 꺼냅니다.',
  '포털에는 <b>이미 로그인돼 있습니다.</b> 교내 SSO 가 권한 등급까지 함께 정합니다.',
  '평소와 <b>똑같이</b> 묻고 똑같이 첨부합니다. 그 사이 첨부파일에서 주민등록번호 1,204건이 걸립니다.',
  '답이 옵니다. 돌아온 답변도 다시 검사하지만 <b>기다린 느낌은 없습니다</b> — 합쳐서 5.3 ms 입니다.',
  '<b>사용자가 의식한 것은 주소가 바뀐 것 하나뿐입니다.</b> 좋은 검사대는 줄을 세우지 않습니다.',
];

/* ── 세 갈래 — 같은 방식으로 방향키가 줄을 하나씩 밝힌다 ── */
const pathHost = document.getElementById('paths-stage');
let pathGoto = null;
if (pathHost) {
  pathGoto = makePathController(buildPaths(pathHost), reduced);
}

function pathStep(slide) {
  if (!pathGoto || !slide || slide.id !== 'slide-paths') return;
  const shown = slide.querySelectorAll('.fragment[data-paths].visible').length;
  const i = Math.min(shown, PATH_STEPS - 1);
  pathGoto(i);
  const cap = document.getElementById('paths-caption');
  if (cap) cap.innerHTML = PATH_CAPTIONS[i];
}

function userStep(slide) {
  if (!userGoto || !slide || slide.id !== 'slide-user') return;
  const shown = slide.querySelectorAll('.fragment[data-user].visible').length;
  const i = Math.min(shown, USER_STEPS - 1);
  userGoto(i);
  const cap = document.getElementById('user-caption');
  if (cap) cap.innerHTML = USER_CAPTIONS[i];
}

deck.on('fragmentshown', (e) => {
  const sec = e.fragment.closest('section');
  archStep(sec);
  stackStep(sec);
  userStep(sec);
  pathStep(sec);
});
deck.on('fragmenthidden', (e) => {
  const sec = e.fragment.closest('section');
  archStep(sec);
  stackStep(sec);
  userStep(sec);
  pathStep(sec);
});
deck.on('slidechanged', (e) => {
  archStep(e.currentSlide);
  stackStep(e.currentSlide);
  userStep(e.currentSlide);
  pathStep(e.currentSlide);
});
deck.on('ready', (e) => {
  archStep(e.currentSlide);
  stackStep(e.currentSlide);
  userStep(e.currentSlide);
  pathStep(e.currentSlide);
  spinGlobes();
});

/** 지구본의 세로 타원만 천천히 돌려 자전처럼 보이게 한다.
 *  전체를 돌리면 가로선까지 기울어져 어지럽다. */
function spinGlobes() {
  if (reduced) return;
  document.querySelectorAll('svg ellipse[rx][ry]').forEach((el) => {
    const rx = parseFloat(el.getAttribute('rx'));
    const ry = parseFloat(el.getAttribute('ry'));
    if (!(rx < ry)) return; // 세로로 긴 타원만
    gsap.to(el, {
      attr: { rx: rx * 0.12 },
      duration: 3.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  });
}

// initialize() 는 **모든 on() 등록이 끝난 뒤**에 불러야 한다.
// 먼저 부르면 'ready' 가 등록 전에 지나가 버려서, 그 슬라이드로 바로 들어왔을 때
// 장면이 한 번도 재생되지 않는다 (8·9페이지가 비어 보이던 원인).
deck.initialize();

/* ══ 넘침 자가 검사 (?audit=1) ═════════════════════════════
 *
 * 슬라이드가 아래로 넘치면 맺음 문장이나 출처 줄이 화면 밖으로 밀려
 * 나간다.  발표장에서야 알게 되는 종류의 사고다 — 실제로 세 번 겪었다.
 * 문구를 한 줄 고칠 때마다 32장을 눈으로 확인할 수는 없으므로
 * **기계가 재게 한다.**
 *
 * 한 장씩 실제로 띄워 가며 재는 이유: reveal 은 현재 슬라이드만 그리고
 * 나머지는 display:none 이라 숨은 채로는 높이를 잴 수 없다.
 *
 * 결과는 document.title 에 JSON 으로 싣는다. 헤드리스에서 --dump-dom 으로
 * 꺼내 쓴다 (tools/check-overflow.mjs).
 */
if (location.search.includes('audit')) {
  const rows = [];
  const step = (i) => {
    if (i >= sections.length) {
      document.title = `AUDIT ${JSON.stringify(rows)}`;
      document.body.setAttribute('data-audit-done', '1');
      return;
    }
    deck.slide(i);
    requestAnimationFrame(() => {
      const sec = sections[i];
      const wrap = sec.querySelector('.wrap');
      const kicker = sec.querySelector('.kicker');
      const over = Math.round(wrap.scrollHeight - wrap.clientHeight);
      rows.push({
        i: i + 1,
        name: sec.dataset.s,
        label: kicker ? kicker.textContent.trim() : '(표지)',
        over,
      });
      requestAnimationFrame(() => step(i + 1));
    });
  };
  requestAnimationFrame(() => step(0));
}
