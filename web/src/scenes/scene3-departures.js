/**
 * SCENE 03 · 출국층 단면 — 아이소메트릭 컷어웨이.
 *
 * 바닥 슬래브의 두께가 그대로 절단면이 되고, 먼 쪽 두 벽만 남겨 위층을 잘라
 * 낸 것처럼 보이게 한다.  컨베이어에 오른 가방이
 *   [여권·비자 확인] → [X-ray 스캐너] → [게이트 3갈래]
 * 로 흐르고, 전략물자·위조 여권이 잡히면 게이트를 건너뛰어 즉시 거부로 빠진다.
 *
 * M3 애니메이션 대상 id:
 *   #s3-bag-1 … #s3-bag-4     컨베이어 위 가방 (대기열)
 *   #s3-bag-ov                즉시 거부 연출 전용 가방
 *   #s3-belt-teeth            벨트 무늬 (흐름)
 *   #s3-beam                  X-ray 스캔 빔
 *   #s3-screen-sweep          판독 화면 주사선
 *   #s3-xray-idcard / #s3-xray-note   화면에 비친 내용물
 *   #s3-sample-allow|mask|block|override   가방마다 다른 입력 원문
 *   #s3-path-allow|mask|block 게이트 3갈래 벨트
 *   #s3-lamp-allow|mask|block 게이트 표시등
 *   #s3-path-override / #s3-override-outlet  즉시 거부 우회로
 */

import { callout, svgWrap } from './_svg.js'
import { isoSpace } from './_iso.js'
import { scene3 as t } from '../content/strings.js'

export const iso = isoSpace({ ox: 350, oy: 76, s: 1.12 })
const { at, pt, delta, box, slab, line, plane, grid, cutHatch, curve } = iso

const BELT_Z = 32 // 벨트 상면 높이
const LANES = [
  { key: 'allow', y: 60, color: '#7FBF57' },
  { key: 'mask', y: 128, color: '#F0A63A' },
  { key: 'block', y: 196, color: '#E25749' },
]

/* --------------------------------------------------------- 바닥 · 남은 벽 */

const shell = `
      ${box(-10, -10, 910, 10, 54)}
      ${box(-10, 0, 10, 300, 54)}
      ${slab(0, 0, 900, 300, 26)}
      ${grid(0, 0, 900, 300, 60)}
      ${cutHatch(0, 0, 900, 300, 26, 'l', 30)}
      ${cutHatch(0, 0, 900, 300, 26, 'r', 30)}`

/* ------------------------------------------------------------- 컨베이어 */

const beltTeeth = () => {
  const out = []
  for (let x = 38; x < 700; x += 28) {
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
  return `<g id="s3-belt-teeth">${out.join('')}</g>`
}

const BELT_FACES = { top: 'belt-top', l: 'belt-l', r: 'belt-r' }

const conveyor = `
      ${box(24, 116, 676, 48, BELT_Z, BELT_FACES)}
      ${plane(
        [
          [24, 136, BELT_Z + 0.4],
          [700, 136, BELT_Z + 0.4],
          [700, 144, BELT_Z + 0.4],
          [24, 144, BELT_Z + 0.4],
        ],
        '',
        'fill="#F0A63A" opacity="0.5"',
      )}
      ${beltTeeth()}`

/* --------------------------------------------------- 여권·비자 확인 포털 */

const passport = `
      <g id="s3-passport">
        ${box(146, 96, 14, 14, 96)}
        ${box(146, 170, 14, 14, 96)}
        ${box(146, 96, 14, 88, 14, { z: 96 })}
        ${line(
          [
            [146, 96, 110],
            [146, 184, 110],
          ],
          'gear',
        )}
        ${plane(
          [
            [153, 122, 88],
            [153, 158, 88],
            [153, 158, 70],
            [153, 122, 70],
          ],
          'gear-fill',
          'opacity="0.35"',
        )}
      </g>`

/* ------------------------------------------------------- X-ray 스캐너 */

const xrayFrame = (x0) => `
        ${box(x0, 92, 12, 12, 104)}
        ${box(x0, 180, 12, 12, 104)}
        ${box(x0, 92, 12, 100, 12, { z: 104 })}`

const xray = `
      <g id="s3-xray">
        ${xrayFrame(300)}
        ${box(312, 92, 146, 12, 12, { z: 104 })}
        ${box(312, 180, 146, 12, 12, { z: 104 })}
        ${xrayFrame(458)}
        ${line(
          [
            [300, 92, 116],
            [470, 92, 116],
          ],
          'gear',
        )}
        ${line(
          [
            [300, 192, 116],
            [470, 192, 116],
          ],
          'gear',
        )}
      </g>
      <g id="s3-beam">
        ${plane(
          [
            [380, 96, 104],
            [380, 188, 104],
            [380, 188, 0],
            [380, 96, 0],
          ],
          'gear-fill',
          'opacity="0.16"',
        )}
        ${line(
          [
            [380, 96, 104],
            [380, 188, 104],
          ],
          'gear',
        )}
      </g>`

/* ---------------------------------------------------------- 게이트 3갈래 */

const gates = `
      <g id="s3-gates">
        ${box(700, 52, 58, 196, BELT_Z, BELT_FACES)}
        ${LANES.map(
          ({ key, y, color }) => `
        ${box(758, y, 112, 44, BELT_Z, { id: `s3-path-${key}`, ...BELT_FACES })}
        ${plane(
          [
            [758, y + 18, BELT_Z + 0.4],
            [866, y + 18, BELT_Z + 0.4],
            [866, y + 26, BELT_Z + 0.4],
            [758, y + 26, BELT_Z + 0.4],
          ],
          '',
          `fill="${color}" opacity="0.75"`,
        )}
        ${box(866, y, 12, 12, 68)}
        ${box(866, y + 32, 12, 12, 68)}
        ${box(866, y, 12, 44, 12, { z: 68 })}
        <path d="M ${pt(866, y, 82)} L ${pt(866, y + 44, 82)}"
              fill="none" stroke="${color}" stroke-width="2" />
        <circle id="s3-lamp-${key}" cx="${at(872, y + 22, 92)[0]}"
                cy="${at(872, y + 22, 92)[1]}" r="8" fill="${color}" />`,
        ).join('')}
      </g>`

/* ------------------------------------------- 즉시 거부 (전략물자·위조 여권) */

const [outX, outY] = at(884, 278, 20)

const override = `
      <g id="s3-override">
        ${curve(
          [
            [470, 196, 26],
            [624, 272, 40],
            [812, 276, 22],
          ],
          'route',
          'id="s3-path-override" style="stroke:#E25749;stroke-dasharray:9 7" opacity="0.95"',
        )}
        <g id="s3-override-outlet" transform="translate(${outX} ${outY})">
          <rect x="-34" y="-26" width="68" height="52" rx="3"
                fill="none" stroke="#E25749" stroke-width="2" />
          <path d="M -13 -10 L 13 12 M 13 -10 L -13 12"
                stroke="#E25749" stroke-width="2.5" stroke-linecap="round" />
        </g>
      </g>`

/* -------------------------------------------------------------- 가방·직원 */

const bag = (id, x, y, { z = 0, w = 22, d = 15, h = 17 } = {}) => {
  const [hx, hy] = at(x, y, z + h)
  return `
      <g id="${id}">
        ${box(x - w / 2, y - d / 2, w, d, h, {
          z,
          top: 'bag-top',
          l: 'bag-l',
          r: 'bag-r',
        })}
        <path d="M ${hx - 7} ${hy - 1} C ${hx - 7} ${hy - 11} ${hx + 7} ${hy - 11} ${hx + 7} ${hy - 1}"
              fill="none" stroke="#b97a22" stroke-width="2" />
      </g>`
}

/* 사람은 부감 투영에서 뭉개지므로 심볼로 세워 둔다 (설명 다이어그램 관례). */
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

/* ---------------------------------------------------------- 판독 화면

   왼쪽은 가방 투시, 오른쪽은 실제로 들어온 입력 원문.  비유(가방)와 실물
   (프롬프트)을 한 화면에 나란히 두어야 X-ray 가 무엇을 보는 것인지 연결된다.

   컨베이어 위 가방 네 개는 서로 다른 질의다.  그래서 네 벌의 원문을 같은
   자리에 겹쳐 두고, 스캐너에 들어온 가방의 것만 켠다 (#s3-sample-<판정>).
   판정 칩과 투시 아이콘도 같이 갈아 끼운다 — 한 화면에서 네 판정이 왜
   갈리는지 보이게 하는 것이 이 장면의 목적이다. */

const PX = 400 // 패널 좌측
const PW = 940
const PY = 16
const PH = 212
const DIV = PX + 226 // 가방 투시 | 입력 원문
const DIV2 = PX + 566 // 입력 원문 | 판독 결과
/* 패널은 아래(스캐너)가 아니라 오른쪽 빈 하늘로 넓힌다 — 아래로 키우면
   설명 대상인 X-ray 장비를 제 설명 패널이 덮어 버린다. */
/** 각 칸이 쓸 수 있는 폭·줄 수 — 카피를 여기 맞춰 나눈다 (samplefit 검사기가 본다). */
export const SAMPLE_W = DIV2 - 20 - (DIV + 18)
export const READOUT_W = PX + PW - 18 - (DIV2 + 18)
export const MAX_LINES = 5
export const MAX_DETECTED = 3

const SFS = 15

/* 하이라이트 상자를 글자 위에 얹으려면 각 조각의 폭을 알아야 하는데, SVG 는
   레이아웃을 알려 주지 않으므로 폰트 어드밴스를 직접 잰다.  Noto Sans KR 기준
   대략치 — 전부 0.55em 으로 잡으면 공백·쉼표가 과대평가되어 조각 사이가
   눈에 띄게 벌어진다 (그게 예전 판독 화면의 틈이었다). */
const advance = (c) => {
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ一-鿿]/.test(c)) return 1.0
  if (c === ' ') return 0.26
  if (/[,.·:;'"]/.test(c)) return 0.28
  if (/[-–—/|]/.test(c)) return 0.36
  if (/[()[\]{}]/.test(c)) return 0.33
  if (/[ilj!.]/.test(c)) return 0.3
  return 0.56
}
const runW = (str, f) => [...str].reduce((a, c) => a + f * advance(c), 0)
const TONE3 = { hot: '#E25749', warm: '#F0A63A' }
const CHIP = { ok: '#7FBF57', warm: '#F0A63A', hot: '#E25749' }

/** 기본으로 켜 두는 판정 — 애니메이션이 없을 때(정지·reduced-motion) 보이는 화면. */
const DEFAULT_KEY = 'mask'

/* 정지 상태(애니메이션 없음·reduced-motion)에서는 기본 가방의 투시 결과만 켠다.
   둘 다 켜 두면 마스킹 가방에 '숨은 쪽지' 까지 든 것처럼 보인다. */
const xrayOff = (icon) =>
  t.screenSamples[DEFAULT_KEY].xray.includes(icon) ? '' : ' opacity="0"'

/** 라벨 칸과 값 칸의 고정 x — 값이 항상 같은 세로줄에서 시작해 눈이 따라가기 쉽다. */
const COL_LABEL = DIV + 18
const COL_VALUE_OFF = 130
export const COL_VALUE_OFFSET = COL_VALUE_OFF
const COL_VALUE = DIV + COL_VALUE_OFF

/** 강조 배경 — 글자 시작점은 고정이고 오른쪽 끝만 추정하므로 어긋나도 티가 안 난다. */
const mark = (x, y, text, color) =>
  `<rect x="${(x - 4).toFixed(1)}" y="${y - SFS + 1}" width="${(runW(text, SFS) + 8).toFixed(1)}"
                 height="${SFS + 7}" rx="2" fill="${color}" opacity="0.16" />`

/* 심각도 색 — 초록(정보)에서 빨강(치명)으로.  '탐지됨' 과 '위험함' 은 다르다는
   것이 이 화면의 요점이라, 탐지되었어도 정보 등급이면 초록으로 둔다. */
const SEV = { 정보: '#7FBF57', 보통: '#9C9B93', 높음: '#F0A63A', 치명: '#E25749' }

/* 판독 결과 칸의 세로 배치.  아래쪽 셋(구분선·점수·판정칩)은 자리를 고정해
   가방이 바뀌어도 눈이 같은 곳에서 결론을 읽게 하고, 탐지 목록만 위에서
   늘어난다.  ROW_H 는 비고 한 줄이 딸리는지로 갈린다. */
const RD_TOP = 76
const RD_RULE = 154
const RD_SCORE = 170
const RD_CHIP = 180
const rowH = (note) => (note ? 32 : 22)
export const READOUT_ROOM = RD_RULE - RD_TOP

/** 판독 결과 칸 — 무엇이 걸렸고, 얼마나 위험하고, 그래서 어떻게 판정했는지. */
const readout = (s) => {
  const x = DIV2 + 18
  const right = PX + PW - 18
  let y = PY + RD_TOP
  const rows = s.detected
    .map(([what, sev, note]) => {
      const color = SEV[sev] || '#9C9B93'
      const sw = runW(sev, 12) + 16
      const row = `
          <rect x="${right - sw}" y="${y - 12}" width="${sw.toFixed(1)}" height="17" rx="3"
                fill="${color}" opacity="0.18" />
          <text x="${right - sw / 2}" y="${y}" text-anchor="middle"
                style="font-size:12px;fill:${color}" font-weight="700">${sev}</text>
          <text x="${x}" y="${y}" style="font-size:14px;fill:#ECEAE3">${what}</text>${
            note
              ? `
          <text x="${x}" y="${y + 15}" style="font-size:12px;fill:#8A8F9C">${note}</text>`
              : ''
          }`
      y += rowH(note)
      return row
    })
    .join('')

  const tone = CHIP[s.tone]
  return `
          <text x="${x}" y="${PY + 60}" style="font-size:12px;fill:#8A8F9C"
                letter-spacing="1">${t.screenDetectedLabel}</text>
          ${rows}
          <path d="M ${x} ${PY + RD_RULE} H ${right}" stroke="#43BC9C"
                stroke-width="1" opacity="0.25" />
          <text x="${x}" y="${PY + RD_SCORE}" style="font-size:13px;fill:#9C9B93">${s.score}</text>
          <rect x="${x}" y="${PY + RD_CHIP}" width="${(runW(s.verdict, 13) + 30).toFixed(1)}"
                height="26" rx="13" fill="none" stroke="${tone}" stroke-width="1.25" opacity="0.8" />
          <text x="${x + 15}" y="${PY + RD_CHIP + 18}"
                style="font-size:13px;fill:${tone}" font-weight="700">${s.verdict}</text>`
}

const sampleBlock = (key, s) => {
  const lines = s.lines
    .map((ln, li) => {
      const y = PY + 82 + li * 24
      const color = TONE3[ln.kind]
      if (ln.label !== undefined) {
        return `
          <text x="${COL_LABEL}" y="${y}" style="font-size:${SFS}px;fill:#9C9B93">${ln.label}</text>
          ${color ? mark(COL_VALUE, y, ln.value, color) : ''}
          <text x="${COL_VALUE}" y="${y}" style="font-size:${SFS}px;fill:${
            color || '#ECEAE3'
          }" font-weight="700">${ln.value}</text>`
      }
      return `
          ${color ? mark(COL_LABEL, y, ln.text, color) : ''}
          <text x="${COL_LABEL}" y="${y}" style="font-size:${SFS}px;fill:${
            color || '#ECEAE3'
          }"${ln.kind ? ' font-weight="700"' : ''}>${ln.text}</text>`
    })
    .join('')

  // 가방에서 실물이 안 나온 경우 — 빈 화면 대신 '없음' 을 명시한다.
  // allow 와 block 이 여기서 똑같이 보이는 것이 이 장면의 요점이다
  // (같은 깨끗한 가방인데 하나는 통과하고 하나는 비자 때문에 막힌다).
  const empty = s.xray.length
    ? ''
    : `
          <text x="${PX + 112}" y="${PY + 126}" text-anchor="middle"
                style="font-size:14px;fill:#7FBF57">${t.screenNothing}</text>`

  return `
        <g id="s3-sample-${key}"${key === DEFAULT_KEY ? '' : ' opacity="0"'}>
          <text x="${DIV2 - 20}" y="${PY + 60}" text-anchor="end"
                style="font-size:12px;fill:#8A8F9C" letter-spacing="1">${
                  t.screenRoleLabel
                } · ${s.role}</text>
          ${empty}
          ${lines}
          ${readout(s)}
        </g>`
}

const samples = Object.entries(t.screenSamples)
  .map(([k, s]) => sampleBlock(k, s))
  .join('')

const screen = `
      <g id="s3-screen">
        <path class="co-leader" d="M ${PX + 180} ${PY + PH} L 581 238" />
        <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="4"
              fill="#0f1116" stroke="#43BC9C" stroke-width="1.75" />
        <path d="M ${PX} ${PY + 34} H ${PX + PW}" stroke="#43BC9C" stroke-width="1" opacity="0.6" />
        <text x="${PX + 16}" y="${PY + 24}" class="co-sub" letter-spacing="2">${t.screen}</text>
        <circle cx="${PX + PW - 22}" cy="${PY + 17}" r="4" fill="#43BC9C" opacity="0.9" />
        <rect id="s3-screen-sweep" x="${PX}" y="${PY + 40}" width="${PW}" height="2"
              fill="#43BC9C" opacity="0.45" />
        <path d="M ${DIV} ${PY + 42} V ${PY + PH - 12} M ${DIV2} ${PY + 42} V ${PY + PH - 12}"
              stroke="#43BC9C" stroke-width="1" opacity="0.3" />

        <!-- 왼쪽: 가방 투시 -->
        <text x="${PX + 16}" y="${PY + 60}" style="font-size:12px;fill:#8A8F9C"
              letter-spacing="1">${t.screenXrayLabel}</text>
        <rect x="${PX + 22}" y="${PY + 72}" width="180" height="94" rx="10"
              fill="none" stroke="#43BC9C" stroke-width="1.5" opacity="0.5" />
        <path d="M ${PX + 90} ${PY + 72} C ${PX + 90} ${PY + 60} ${PX + 134} ${PY + 60} ${PX + 134} ${PY + 72}"
              fill="none" stroke="#43BC9C" stroke-width="1.5" opacity="0.5" />
        <g id="s3-xray-idcard"${xrayOff('idcard')}>
          <rect x="${PX + 38}" y="${PY + 92}" width="52" height="34" rx="2"
                fill="none" stroke="#F0A63A" stroke-width="1.75" />
          <circle cx="${PX + 53}" cy="${PY + 106}" r="6.5" fill="none" stroke="#F0A63A" stroke-width="1.5" />
          <path d="M ${PX + 66} ${PY + 101} H ${PX + 84} M ${PX + 66} ${PY + 112} H ${PX + 80}"
                stroke="#F0A63A" stroke-width="1.5" />
          <text x="${PX + 64}" y="${PY + 152}" text-anchor="middle"
                style="font-size:13px;fill:#F0A63A">${t.screenIdCard}</text>
        </g>
        <g id="s3-xray-note"${xrayOff('note')}>
          <path d="M ${PX + 112} ${PY + 90} L ${PX + 150} ${PY + 84} L ${PX + 157} ${PY + 126} L ${PX + 119} ${PY + 132} Z"
                fill="none" stroke="#E25749" stroke-width="1.75" />
          <path d="M ${PX + 121} ${PY + 101} H ${PX + 146} M ${PX + 121} ${PY + 112} H ${PX + 142}"
                stroke="#E25749" stroke-width="1.5" />
          <text x="${PX + 142}" y="${PY + 152}" text-anchor="middle"
                style="font-size:13px;fill:#E25749">${t.screenNote}</text>
        </g>
        <!-- 가운데: 실제로 들어온 입력 / 오른쪽: 판독 결과 (둘 다 가방마다 다르다) -->
        <text x="${DIV + 18}" y="${PY + 60}" style="font-size:12px;fill:#8A8F9C"
              letter-spacing="1">${t.screenTextLabel}</text>
        ${samples}
      </g>`

/* ------------------------------------------------------------------ 조립 */

export function scene3Svg() {
  const body = `
      ${shell}
      ${conveyor}
      ${passport}
      ${bag('s3-bag-1', 60, 140, { z: BELT_Z })}
      ${bag('s3-bag-2', 160, 140, { z: BELT_Z })}
      ${bag('s3-bag-3', 260, 140, { z: BELT_Z })}
      ${xray}
      ${bag('s3-bag-4', 380, 140, { z: BELT_Z })}
      <!-- 즉시 거부 연출 전용. 정지 상태에서는 보이지 않는다. -->
      <g id="s3-bag-ov-wrap" opacity="0">${bag('s3-bag-ov', 380, 140, { z: BELT_Z })}</g>
      ${gates}
      ${figure([215, 250])}
      ${figure([610, 262])}
      ${override}
      ${screen}

      ${callout({
        n: '01',
        from: at(0, 0, 0),
        to: [300, 36],
        side: 'left',
        title: t.floor,
      })}
      ${callout({
        n: '02',
        from: at(64, 164, BELT_Z),
        to: [228, 340],
        side: 'left',
        title: t.conveyor,
        sub: t.conveyorSub,
      })}
      ${callout({
        n: '03',
        from: at(153, 138, 110),
        to: [352, 74],
        side: 'left',
        title: t.passport,
        sub: t.passportSub,
      })}
      ${callout({
        n: '04',
        from: at(464, 192, 104),
        to: [330, 486],
        side: 'left',
        title: t.xray,
        sub: t.xraySub,
      })}
      ${callout({
        n: '05',
        from: at(872, 82, 82),
        to: [1168, 448],
        side: 'right',
        title: t.gateAllow,
        cls: 'co-title--allow',
      })}
      ${callout({
        n: '06',
        from: at(872, 150, 82),
        to: [1168, 528],
        side: 'right',
        title: t.gateMask,
        cls: 'co-title--bag',
      })}
      ${callout({
        n: '07',
        from: at(872, 218, 82),
        to: [1168, 608],
        side: 'right',
        title: t.gateBlock,
        cls: 'co-title--block',
      })}
      ${callout({
        n: '08',
        from: [outX + 34, outY - 6], // 배출구 상자 오른쪽 모서리 (밖으로 벗어나 있었다)
        to: [1104, 706],
        side: 'right',
        title: t.override,
        sub: t.overrideSub,
        cls: 'co-title--block',
      })}`

  return svgWrap({
    id: 's3',
    viewBox: '0 0 1440 860',
    title: t.svgTitle,
    desc: t.svgDesc,
    body,
  })
}

/* ==========================================================================
   M3 애니메이션 — 출국층 시퀀스.

   이 장면만 pin + scrub 이다.  가방 한 개가 검사대를 통과하는 과정은 "순서"가
   핵심이라, 사용자가 스크롤 속도로 직접 되감아 볼 수 있어야 한다.

   대기열 4개가 차례로 스캐너에 들어가 네 가지 판정을 하나씩 보여 준다:
     통과 → 물건만 빼고 통과 → 탑승 거부 → (판정 생략) 즉시 거부
   ========================================================================== */

const SCAN = [380, 140, BELT_Z] // 스캐너 안 정지 위치
const JUNCTION = [724, 150, BELT_Z] // 3갈래가 갈라지는 분기점
const LANE_END = {
  allow: [856, 82, BELT_Z],
  mask: [856, 150, BELT_Z],
  block: [856, 218, BELT_Z],
}

/** 판독 화면에 겹쳐 둔 원문 네 벌의 키 — 스캔할 때마다 하나만 켠다. */
const SAMPLE_KEYS = Object.keys(t.screenSamples)

/** 대기열: [id, 최초 평면위치, 판정] — 앞의 가방이 빠지면 한 칸씩 당긴다.
 *  판정 키가 곧 그 가방의 입력 원문 키다 (t.screenSamples). */
const QUEUE = [
  ['s3-bag-4', [380, 140, BELT_Z], 'allow'],
  ['s3-bag-3', [260, 140, BELT_Z], 'mask'],
  ['s3-bag-2', [160, 140, BELT_Z], 'block'],
  ['s3-bag-1', [60, 140, BELT_Z], 'override'],
]

export function scene3Anim(root, gsap, ScrollTrigger) {
  const q = (sel) => root.querySelector(sel)
  const lamps = {
    allow: q('#s3-lamp-allow'),
    mask: q('#s3-lamp-mask'),
    block: q('#s3-lamp-block'),
  }

  // 판정 전에는 표시등이 꺼져 있고, 화면 속 내용물도 아직 안 잡혔다.
  gsap.set(Object.values(lamps).filter(Boolean), { opacity: 0.18 })
  gsap.set([q('#s3-xray-idcard'), q('#s3-xray-note')].filter(Boolean), { opacity: 0 })
  gsap.set(q('#s3-beam'), { opacity: 0 })
  gsap.set(q('#s3-override'), { opacity: 0 })

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root.closest('.scene'),
      start: 'center center',
      end: '+=2800',
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
    },
  })

  const beam = q('#s3-beam')
  const beamSweep = delta([320, 140, 0], [450, 140, 0])

  /**
   * 스캔 1회: 빔이 가방을 훑고, 판독 화면이 **그 가방의 입력 원문**으로 바뀐다.
   * 원문은 빔이 지나가기 전에 미리 갈아 끼우고(무엇을 스캔하는지 먼저 보여야
   * 한다), 투시 아이콘은 빔이 지나간 뒤에 뜬다(스캔 결과이므로).
   */
  const scan = (t0, verdict) => {
    const s = t.screenSamples[verdict] || {}
    const xray = s.xray || []
    tl.set(SAMPLE_KEYS.map((k) => q(`#s3-sample-${k}`)).filter(Boolean), { opacity: 0 }, t0)
      .set(q(`#s3-sample-${verdict}`), { opacity: 1 }, t0)
      .fromTo(beam, { opacity: 0, x: 0, y: 0 }, { opacity: 1, duration: 0.15 }, t0)
      .to(beam, { x: beamSweep.x, y: beamSweep.y, duration: 0.7 }, t0)
      .to(beam, { opacity: 0, duration: 0.15 }, t0 + 0.7)
      .fromTo(
        q('#s3-screen-sweep'),
        { attr: { y: 60 } },
        { attr: { y: 180 }, duration: 0.7 },
        t0,
      )
    if (xray.includes('idcard')) tl.to(q('#s3-xray-idcard'), { opacity: 1, duration: 0.25 }, t0 + 0.35)
    if (xray.includes('note')) tl.to(q('#s3-xray-note'), { opacity: 1, duration: 0.25 }, t0 + 0.45)
    // 다음 가방을 위해 투시 결과만 비운다 (원문은 다음 스캔에서 갈아 끼운다).
    tl.to([q('#s3-xray-idcard'), q('#s3-xray-note')], { opacity: 0, duration: 0.2 }, t0 + 1.55)
  }

  /** 판정 후 분기점을 거쳐 해당 레인 끝까지 보낸다. */
  const divert = (id, origin, verdict, t0) => {
    const el = q(`#${id}`)
    if (!el) return
    const toJunction = delta(origin, JUNCTION)
    const toLane = delta(origin, LANE_END[verdict])
    if (!lamps[verdict]) return
    tl.to(lamps[verdict], { opacity: 1, duration: 0.2 }, t0)
      .to(el, { x: toJunction.x, y: toJunction.y, duration: 0.55 }, t0)
      .to(el, { x: toLane.x, y: toLane.y, duration: 0.5 }, t0 + 0.55)
      .to(lamps[verdict], { opacity: 0.18, duration: 0.3 }, t0 + 1.2)
  }

  QUEUE.forEach(([id, origin, verdict], i) => {
    const t0 = i * 2 // 가방 하나당 두 박자: 스캔 → 판정
    scan(t0, verdict)

    if (verdict === 'override') {
      // 판정 게이트를 아예 건너뛴다. 전용 가방으로 갈아타 경로를 태운다.
      const ov = q('#s3-bag-ov')
      tl.to(q('#s3-override'), { opacity: 1, duration: 0.2 }, t0 + 0.8)
        .to(q(`#${id}`), { opacity: 0, duration: 0.15 }, t0 + 1)
        .set(q('#s3-bag-ov-wrap'), { opacity: 1 }, t0 + 1)
        .to(
          ov,
          {
            duration: 1.1,
            ease: 'power1.in',
            motionPath: {
              path: q('#s3-path-override'),
              align: q('#s3-path-override'),
              alignOrigin: [0.5, 0.9],
            },
          },
          t0 + 1,
        )
        .to(
          q('#s3-override-outlet'),
          { scale: 1.18, transformOrigin: '50% 50%', duration: 0.2, yoyo: true, repeat: 3 },
          t0 + 2,
        )
    } else {
      divert(id, origin, verdict, t0 + 0.9)
      // 뒤에 남은 가방들을 한 칸씩 당긴다.  x/y 는 최초 위치 기준 절대 변위이므로
      // '몇 칸 당겼는지' 가 아니라 '지금 몇 번 슬롯인지' 로 목표를 잡아야 한다.
      QUEUE.slice(i + 1).forEach(([nextId, nextOrigin], k) => {
        const slot = QUEUE[k][1] // k 번째 슬롯(= 앞에서 k 번째 자리)
        tl.to(
          q(`#${nextId}`),
          { ...delta(nextOrigin, slot), duration: 0.8 },
          t0 + 1.1,
        )
      })
    }
  })

  // 벨트 무늬는 스크럽과 무관하게 계속 흐른다 (설비가 살아 있다는 신호).
  const tooth = delta([0, 140, BELT_Z], [28, 140, BELT_Z])
  const beltLoop = gsap.to(q('#s3-belt-teeth'), {
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
