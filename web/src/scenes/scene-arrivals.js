/**
 * SCENE 06 · 입국층 단면 — 터미널 아래층.
 *
 * 출국층(SCENE 04)의 거울상이다.  흐름이 반대(-x 방향)로 흐르고, 층도 한 칸
 * 아래라 절단면이 위쪽에 남는다.  돌아온 가방은 검역대를 지나며 숨어 들어온
 * 것을 적발당하고, 제거 후 전달되거나 전량 폐기된다.
 *
 * 근거: 부록2 모델2 「외부 비인가 접근 및 악성 콘텐츠 유입 차단」
 *       (N2SF-IF-3 임베디드 데이터 삽입 차단, N2SF-IF-5 일방향 정보흐름 통제)
 *
 * M3 애니메이션 대상 id:
 *   #sa-bag-1 … #sa-bag-3    도착 가방
 *   #sa-belt-teeth           벨트 무늬
 *   #sa-gate-lamp-1…3        검역대 상인방 표시등
 *   #sa-find-1 … #sa-find-3  적발 트레이에 쌓이는 것들
 *   #sa-path-deliver / #sa-path-drop
 */

import { callout, mark, runW, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { checkpointGate } from './_places.js'
import { sceneArrivals as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 330, oy: 96, s: 1.12 })
const { at, delta, box, slab, line, plane, grid, cutHatch } = iso

const BELT_Z = 32
const BELT_FACES = { top: 'belt-top', l: 'belt-l', r: 'belt-r' }

/* --------------------------------------------------------- 바닥 · 남은 벽 */

const shell = `
      ${box(-10, -10, 910, 10, 54, { cls: 'wall' })}
      ${box(-10, 0, 10, 300, 54, { cls: 'wall' })}
      ${slab(0, 0, 900, 300, 26)}
      ${grid(0, 0, 900, 300, 60)}
      ${cutHatch(0, 0, 900, 300, 26, 'l', 30)}
      ${cutHatch(0, 0, 900, 300, 26, 'r', 30)}`

/* -------------------------------------------------------- 도착 컨베이어 */

const beltTeeth = () => {
  const out = []
  for (let x = 174; x < 840; x += 28) {
    out.push(
      line(
        [
          [x, 118, BELT_Z],
          [x, 162, BELT_Z],
        ],
        'hatch',
      ),
    )
  }
  return `<g id="sa-belt-teeth">${out.join('')}</g>`
}

const conveyor = `
      ${box(160, 116, 680, 48, BELT_Z, BELT_FACES)}
      ${plane(
        [
          [160, 136, BELT_Z + 0.4],
          [840, 136, BELT_Z + 0.4],
          [840, 144, BELT_Z + 0.4],
          [160, 144, BELT_Z + 0.4],
        ],
        '',
        'fill="#43BC9C" opacity="0.4"',
      )}
      ${beltTeeth()}`

/* -------------------------------------------------------------- 검역대

   출국층·기록실과 같은 부품(checkpointGate)을 쓴다.  장면마다 문틀을 따로
   그리던 때는 같은 장치가 장면마다 다르게 생겨서 '그 장치' 로 안 읽혔다. */

const quarantine = `
      <g id="sa-quarantine">
        ${checkpointGate(iso, {
          x: 548,
          y: 84,
          d: 112,
          t: 28,
          h: 122,
          post: 26,
          beam: 26,
          rails: 64,
          id: 'sa-gate',
        })}
      </g>`

/* --------------------------------------------------------- 적발 트레이

   검역대 옆 탁자.  가방에서 꺼낸 것이 여기 남고, 가방만 나간다. */

/* 걸려 나온 것 세 가지.  같은 동그라미를 셋 놓으면 '세 개 걸렸다' 까지만
   읽히고 무엇이 걸렸는지는 라벨을 읽어야 안다.  형태로 갈라 둔다 —
   바깥으로 나가는 화살표(유출 링크) · 꼬리표(카나리아) · 신분증(개인정보). */
const glyph = {
  link: (x, y, c) => `
          <path d="M ${x - 7} ${y + 5} h 14 v -6 M ${x + 7} ${y - 1} l -9 9"
                fill="none" stroke="${c}" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round" />`,
  tag: (x, y, c) => `
          <path d="M ${x - 8} ${y - 5} h 9 l 7 6 -7 6 h -9 z" fill="none"
                stroke="${c}" stroke-width="1.6" stroke-linejoin="round" />
          <circle cx="${x + 2}" cy="${y + 1}" r="1.6" fill="${c}" />`,
  id: (x, y, c) => `
          <rect x="${x - 8}" y="${y - 6}" width="16" height="12" rx="2" fill="none"
                stroke="${c}" stroke-width="1.6" />
          <circle cx="${x - 3.5}" cy="${y - 1}" r="2.2" fill="${c}" />
          <path d="M ${x + 1} ${y - 2.5} h 5 M ${x + 1} ${y + 1.5} h 5"
                stroke="${c}" stroke-width="1.4" stroke-linecap="round" />`,
}

/* 쌓이는 순서 = 가방이 지나가는 순서. 개인정보(치환 후 전달) → 반출 링크(폐기)
   → 카나리아(폐기). 카나리아는 시스템 프롬프트가 통째로 새어 나온 신호라
   치환으로 지울 수 있는 종류가 아니다 — 그래서 뒤 둘은 폐기로 간다. */
const FINDS = [
  { id: 'sa-find-1', x: 372, color: '#F0A63A', kind: 'id' },
  { id: 'sa-find-2', x: 404, color: '#E25749', kind: 'link' },
  { id: 'sa-find-3', x: 436, color: '#E25749', kind: 'tag' },
]

const tray = `
      <g id="sa-tray">
        ${box(352, 208, 112, 62, 22)}
        ${plane(
          [
            [358, 214, 23],
            [458, 214, 23],
            [458, 264, 23],
            [358, 264, 23],
          ],
          'f-r',
        )}
        ${FINDS.map(({ id, x, color, kind }) => {
          const [gx, gy] = at(x + 10, 236, 45)
          return `
        <g id="${id}">
          ${box(x, 226, 20, 20, 16, { z: 23 })}
          ${glyph[kind](gx, gy - 4, color)}
        </g>`
        }).join('')}
      </g>`

/* --------------------------------------------------------- 2갈래 출구 */

const LANES = [
  { key: 'deliver', y: 60, color: '#7FBF57', label: t.deliver },
  { key: 'drop', y: 196, color: '#E25749', label: t.drop },
]

const gates = `
      <g id="sa-gates">
        ${box(104, 52, 56, 196, BELT_Z, BELT_FACES)}
        ${LANES.map(
          ({ key, y, color }) => `
        ${box(0, y, 104, 44, BELT_Z, { id: `sa-path-${key}`, ...BELT_FACES })}
        ${plane(
          [
            [4, y + 18, BELT_Z + 0.4],
            [100, y + 18, BELT_Z + 0.4],
            [100, y + 26, BELT_Z + 0.4],
            [4, y + 26, BELT_Z + 0.4],
          ],
          '',
          `fill="${color}" opacity="0.75"`,
        )}
        <circle id="sa-lamp-${key}" cx="${at(24, y + 22, 58)[0]}"
                cy="${at(24, y + 22, 58)[1]}" r="8" fill="${color}" />`,
        ).join('')}
      </g>`

/* ------------------------------------------------------- 입국 판독 화면

   출국층의 판독 화면과 짝이다.  왼쪽이 돌아온 답변 원문, 오른쪽이 이용자에게
   실제로 나가는 글이다.  두 칸을 나란히 두는 것이 이 장면의 요점 — 답변을
   '검사했다' 가 아니라 **'무엇을 어떻게 바꿔서 내보냈다'** 를 글자로 보인다.

   도착 가방 세 개는 서로 다른 답변이다.  판정이 갈리는 두 벌을 같은 자리에
   겹쳐 두고 검역대에 들어온 가방의 것만 켠다 (#sa-sample-<판정>). */

const PX = 560
const PY = 16
const PW = 864
const PH = 292
const COL2 = PX + 448 // 전달본 칸 시작
const DIV_X = PX + 432 // 원문 | 전달본
const RULE_Y = PY + 196 // 위(글) / 아래(판정) 가르는 선
const FS = 15
const LINE_H = 23

/** 기본으로 켜 두는 판정 — 정지 화면(애니메이션 없음)에서 보이는 쪽. */
const DEFAULT_SAMPLE = 'deliver'

/* 조각 색.  hot/warm 은 '걸린 것', fix 는 '가드레일이 바꿔 놓은 자리',
   stop 은 '전달되지 않았다'. 강조 이유가 서로 다르므로 색도 갈라 둔다. */
const SEG = { hot: '#E25749', warm: '#F0A63A', fix: '#43BC9C', stop: '#E25749' }
const SEV = { 정보: '#7FBF57', 보통: '#9C9B93', 높음: '#F0A63A', 치명: '#E25749' }
const CHIP = { warm: '#F0A63A', hot: '#E25749' }

/** 조각 단위로 이어 그리는 한 줄 — 강조 조각은 배경을 깔고 색을 준다.
    'stop'(차단 안내문)만 예외로 색만 준다. 그건 걸린 조각이 아니라 대신 나가는
    글이라, 배경까지 깔면 세 줄이 통째로 붉어져 무엇이 걸렸는지가 묻힌다. */
const textLine = (x, y, segs) => {
  let cx = x
  return segs
    .map(([text, kind]) => {
      const color = SEG[kind]
      const out = `${color && kind !== 'stop' ? mark(cx, y, text, color, FS) : ''}
          <text x="${cx.toFixed(1)}" y="${y}" style="font-size:${FS}px;fill:${
            color || '#ECEAE3'
          }">${text}</text>`
      // SVG 는 조각 앞의 공백을 지워 버리므로 간격은 좌표로 준다.
      cx += runW(text, FS) + 5
      return out
    })
    .join('')
}

const sampleView = (key, s) => {
  const top = PY + 92
  const detTop = PY + 228

  const detected = s.detected
    .map(([what, sev, note], i) => {
      const color = SEV[sev] || '#9C9B93'
      const y = detTop + i * 22
      const sw = runW(sev, 12) + 16
      return `
          <text x="${PX + 16}" y="${y}" style="font-size:14px;fill:#ECEAE3">${what}</text>${
            note
              ? `
          <text x="${PX + 176}" y="${y}" style="font-size:12px;fill:#8A8F9C">${note}</text>`
              : ''
          }
          <rect x="${PX + 396 - sw}" y="${y - 12}" width="${sw.toFixed(1)}" height="17" rx="3"
                fill="${color}" opacity="0.18" />
          <text x="${PX + 396 - sw / 2}" y="${y}" text-anchor="middle"
                style="font-size:12px;fill:${color}" font-weight="700">${sev}</text>`
    })
    .join('')

  const chip = CHIP[s.tone]
  return `
        <g id="sa-sample-${key}"${key === DEFAULT_SAMPLE ? '' : ' opacity="0"'}>
          ${s.answer.map((segs, i) => textLine(PX + 16, top + i * LINE_H, segs)).join('')}
          ${s.delivered.map((segs, i) => textLine(COL2, top + i * LINE_H, segs)).join('')}
          <text x="${COL2}" y="${RULE_Y - 14}" style="font-size:12px;fill:#8A8F9C">${
            s.deliveredNote
          }</text>
          ${detected}
          <text x="${COL2}" y="${PY + 236}" style="font-size:13px;fill:#9C9B93">${s.score}</text>
          <rect x="${COL2}" y="${PY + 250}" width="${(runW(s.verdict, 13) + 30).toFixed(1)}"
                height="26" rx="13" fill="none" stroke="${chip}" stroke-width="1.4" />
          <text x="${COL2 + 15}" y="${PY + 268}" style="font-size:13px;fill:${chip}"
                font-weight="700">${s.verdict}</text>
        </g>`
}

const screen = `
      <g id="sa-screen">
        <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="4"
              fill="#0E0F13" stroke="#43BC9C" stroke-width="1.4" opacity="0.97" />
        <path class="hair" d="M ${PX} ${PY + 40} H ${PX + PW}" />
        <path class="hair" d="M ${PX} ${RULE_Y} H ${PX + PW}" />
        <path class="hair" d="M ${DIV_X} ${PY + 48} V ${RULE_Y - 10}" />
        <text x="${PX + 16}" y="${PY + 26}" class="co-sub" letter-spacing="2">${t.screen}</text>
        <circle cx="${PX + PW - 18}" cy="${PY + 20}" r="4" class="gear-fill" />
        <rect id="sa-screen-sweep" x="${PX}" y="${PY + 40}" width="${PW}" height="2"
              fill="#43BC9C" opacity="0.25" />
        <text x="${PX + 16}" y="${PY + 66}" style="font-size:12px;fill:#8A8F9C"
              letter-spacing="1">${t.screenAnswerLabel}</text>
        <text x="${COL2}" y="${PY + 66}" style="font-size:12px;fill:#8A8F9C"
              letter-spacing="1">${t.screenDeliverLabel}</text>
        <text x="${PX + 16}" y="${PY + 212}" style="font-size:12px;fill:#8A8F9C"
              letter-spacing="1">${t.screenDetectedLabel}</text>
        ${Object.entries(t.screenSamples)
          .map(([key, s]) => sampleView(key, s))
          .join('')}
      </g>`

/* -------------------------------------------------------------- 가방 */

const bag = (id, x, y, { z = 0, w = 22, d = 15, h = 17 } = {}) => {
  const [hx, hy] = at(x, y, z + h)
  return `
      <g id="${id}">
        ${box(x - w / 2, y - d / 2, w, d, h, {
          z,
          cls: 'bag',
          top: 'bag-top',
          l: 'bag-l',
          r: 'bag-r',
        })}
        <path d="M ${hx - 7} ${hy - 1} C ${hx - 7} ${hy - 11} ${hx + 7} ${hy - 11} ${hx + 7} ${hy - 1}"
              fill="none" stroke="#b97a22" stroke-width="2" />
      </g>`
}

/* 벨트 위 대기 슬롯 — 0번이 검역대 자리다.  앞의 가방이 빠지면 뒤가 한 칸씩
   당겨 온다.  조립과 애니메이션이 같은 배열을 봐야 어긋나지 않는다. */
const SLOTS = [
  [566, 140, BELT_Z],
  [680, 140, BELT_Z],
  [794, 140, BELT_Z],
]

const figure = (plan) => {
  const [x, y] = at(...plan)
  return `
      <g class="figure">
        <polygon points="${x - 13},${y} ${x},${y - 7} ${x + 13},${y} ${x},${y + 7}"
                 fill="#0f1116" opacity="0.5" />
        <circle class="gear-fill" cx="${x}" cy="${y - 70}" r="9.5" opacity="0.8" />
        <rect class="gear-fill" x="${x - 11}" y="${y - 52}" width="22" height="52"
              rx="10" opacity="0.8" />
      </g>`
}

/* ------------------------------------------------------------------ 조립 */

export function sceneArrivalsSvg() {
  const body = `
      ${shell}
      ${conveyor}
      ${tray}
      ${bag('sa-bag-1', SLOTS[2][0], 140, { z: BELT_Z })}
      ${bag('sa-bag-2', SLOTS[1][0], 140, { z: BELT_Z })}
      ${quarantine}
      ${bag('sa-bag-3', SLOTS[0][0], 140, { z: BELT_Z })}
      ${gates}
      ${figure([640, 250])}
      ${screen}

      ${callout({
        n: '01',
        from: at(0, 0, 0),
        to: [300, 44],
        side: 'left',
        title: t.floor,
      })}
      ${callout({
        n: '02',
        from: at(820, 164, BELT_Z),
        to: [1120, 640],
        side: 'right',
        title: t.belt,
        sub: t.beltSub,
      })}
      ${callout({
        n: '03',
        from: at(576, 140, 148),
        to: [1010, 372],
        side: 'right',
        title: t.quarantine,
        sub: t.quarantineSub,
      })}
      ${callout({
        n: '04',
        from: at(408, 266, 45),
        to: [430, 660],
        side: 'right',
        title: t.tray,
        sub: [t.traySub, ...t.found.map((f) => `· ${f}`)],
      })}
      ${callout({
        n: '05',
        from: at(24, 82, 58),
        to: [318, 386],
        side: 'right',
        title: t.deliver,
        cls: 'co-title--allow',
      })}
      ${callout({
        n: '06',
        from: at(24, 218, 58),
        to: [180, 470],
        side: 'left',
        title: t.drop,
        cls: 'co-title--block',
      })}`

  return svgWrap({
    id: 'sa',
    viewBox: '0 0 1440 812',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 — 스크롤이 진행 장치다.

   예전에는 타임라인이 혼자 돌았다.  발표 중에는 그게 제일 곤란하다 — 설명하는
   동안 화면이 먼저 가 버리고, 되돌릴 방법이 없다.  출국층(SCENE 05)과 같은
   방식으로 바꾼다: 장면을 고정(pin)하고 스크롤 진행률에 타임라인을 묶어
   (scrub), 말하는 속도대로 앞뒤로 움직일 수 있게 한다.

   가방 하나당 두 박자다 — ① 검역대에서 판독(판독 화면이 그 답변으로 바뀐다)
   ② 판정 후 2갈래 중 한 곳으로.  벨트 무늬만 스크럽과 무관하게 계속 흐른다.
   ========================================================================== */

const JUNCTION = [132, 150, BELT_Z]
const EXIT = {
  deliver: [40, 82, BELT_Z],
  drop: [40, 218, BELT_Z],
}

/** 대기열: [id, 최초 슬롯, 판정, 트레이에 남는 것]. 판정 키가 곧 판독 화면 키다. */
const QUEUE = [
  ['sa-bag-3', SLOTS[0], 'deliver', '#sa-find-1'],
  ['sa-bag-2', SLOTS[1], 'drop', '#sa-find-2'],
  ['sa-bag-1', SLOTS[2], 'drop', '#sa-find-3'],
]

const SAMPLE_KEYS = Object.keys(t.screenSamples)

export function sceneArrivalsAnim(root, gsap, ScrollTrigger) {
  const q = (sel) => root.querySelector(sel)
  gsap.set(root.querySelectorAll('[id^="sa-find-"]'), { opacity: 0 })

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root.closest('.scene'),
      start: 'center center',
      end: '+=2400',
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
    },
  })

  /** 판독 1회 — 판독 화면을 그 가방의 답변으로 갈아 끼우고 주사선을 내린다. */
  const read = (t0, verdict, findSel, first) => {
    /* 첫 가방의 판독 결과는 타임라인이 건드리지 않는다 — 마크업 기본값이 곧
       정지 화면이다.  나머지는 set() 이 아니라 짧은 tween 으로 갈아 끼운다.
       시각 0 근처의 set() 은 스크럽이 진행률 0 을 렌더할 때 '전부 끄기' 만
       적용되고 '켜기' 는 미래로 남아, 장면에 막 들어온 동안 판독 화면이 빈 채로
       보인다 — 발표 중 그 장면에 멈춰 서 있는 시간이 가장 긴데도. */
    if (!first) {
      tl.to(
        SAMPLE_KEYS.map((k) => q(`#sa-sample-${k}`)).filter(Boolean),
        { opacity: 0, duration: 0.12 },
        t0,
      ).to(q(`#sa-sample-${verdict}`), { opacity: 1, duration: 0.12 }, t0 + 0.12)
    }
    tl.fromTo(
        q('#sa-screen-sweep'),
        { attr: { y: PY + 44 }, opacity: 0.35 },
        { attr: { y: RULE_Y - 6 }, opacity: 0.1, duration: 0.8 },
        t0,
      )
      // 검역 표시등이 판정 색으로 바뀐다.
      .to(
        root.querySelectorAll('[id^="sa-gate-lamp-"]'),
        { fill: verdict === 'drop' ? '#E25749' : '#F0A63A', duration: 0.2 },
        t0 + 0.55,
      )
    if (findSel) {
      tl.fromTo(
        q(findSel),
        { opacity: 0, y: -22 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
        t0 + 0.7,
      )
    }
  }

  /** 판정 후 분기점을 거쳐 해당 레인 끝으로 내보낸다. */
  const divert = (id, origin, verdict, t0) => {
    const el = q(`#${id}`)
    if (!el) return
    tl.to(root.querySelectorAll('[id^="sa-gate-lamp-"]'), { fill: '#43BC9C', duration: 0.25 }, t0)
      .to(el, { ...delta(origin, JUNCTION), duration: 0.7 }, t0)
      .to(el, { ...delta(origin, EXIT[verdict]), duration: 0.5 }, t0 + 0.7)
      .to(el, { opacity: 0, duration: 0.25 }, t0 + 1.15)
  }

  QUEUE.forEach(([id, origin, verdict, findSel], i) => {
    const t0 = i * 2
    read(t0, verdict, findSel, i === 0)
    divert(id, origin, verdict, t0 + 1)

    /* 뒤에 남은 가방을 한 칸씩 당긴다.  x/y 는 최초 위치 기준 절대 변위라
       '몇 칸 당겼는지' 가 아니라 '지금 몇 번 슬롯인지' 로 목표를 잡는다. */
    QUEUE.slice(i + 1).forEach(([nextId, nextOrigin], k) => {
      tl.to(q(`#${nextId}`), { ...delta(nextOrigin, SLOTS[k]), duration: 0.8 }, t0 + 1.2)
    })
  })

  // 벨트 무늬는 스크럽과 무관하게 흐른다 (설비가 살아 있다는 신호).
  const tooth = delta([28, 140, BELT_Z], [0, 140, BELT_Z])
  const beltLoop = gsap.to(q('#sa-belt-teeth'), {
    x: tooth.x,
    y: tooth.y,
    duration: 1.1,
    ease: 'none',
    repeat: -1,
  })

  // 화면 밖에서는 루프를 멈춰 둔다.
  ScrollTrigger.create({
    trigger: root.closest('.scene'),
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? beltLoop.play() : beltLoop.pause()),
  })

  return tl
}
