/**
 * 도면 대비 검사 — 밝은 타일과 어두운 타일 양쪽에서 읽히는지 본다.
 *
 *   실행:  node web/tools/check-contrast.mjs        (저장소 루트에서)
 *
 * 도면이 다크에서 라이트로 넘어오면서 생길 수 있는 사고는 하나다:
 * **바탕과 같아져서 사라지는 것**.  이 검사는 각 장면의 SVG 를 한 번 그린 뒤
 * 어트리뷰트로 직접 칠한 색을 전부 뽑아, 그 색이 놓일 바탕과의 명도 대비를 잰다.
 *
 *   · 도면 안의 흰 판독 화면 위에 놓이는 글자  → 흰색(#ffffff) 기준 4.5:1
 *   · 타일 위에 바로 놓이는 도형·선            → 밝은 타일(#ffffff)과
 *                                                어두운 타일(#272729) 양쪽 3:1
 *
 * 색 자체가 판독 화면 안에 있는지 밖에 있는지는 코드만 보고 알 수 없으므로,
 * 둘 중 **관대한 쪽** 을 통과 기준으로 삼는다 — 즉 "어느 바탕에서도 안 보이는
 * 색" 만 잡는다.  경계값을 놓치더라도 사라진 요소는 반드시 잡힌다.
 *
 * CSS 클래스로 칠하는 면(.f-top, .home-l …)은 styles/plate.css 와 tokens.css 가
 * 갖고 있어 여기서 보지 않는다. 그쪽은 3면 명도가 서로 맞물려 있어 사람이 본다.
 */
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const W = pathToFileURL(resolve(new URL('..', import.meta.url).pathname)).href

const SCENES = [
  ['scene-intro.js', 'sceneIntroSvg', '01 인트로'],
  ['scene-why.js', 'sceneWhySvg', '02 왜 검사대인가'],
  ['scene-basis.js', 'sceneBasisSvg', '03 설계 근거'],
  ['scene2-overview.js', 'scene2Svg', '04 조감도'],
  ['scene3-departures.js', 'scene3Svg', '05 출국층'],
  ['scene-runway.js', 'sceneRunwaySvg', '06 활주로'],
  ['scene-arrivals.js', 'sceneArrivalsSvg', '07 입국층'],
  ['scene-records.js', 'sceneRecordsSvg', '08 기록실'],
  ['scene-shared.js', 'sceneSharedSvg', '09 각 부서의 몫'],
  ['scene-outro.js', 'sceneOutroSvg', '10 아웃트로'],
]

/** 도면이 올라가는 바탕들. 이 중 하나에서라도 읽히면 통과. */
const GROUNDS = [
  ['흰 타일', '#ffffff'],
  ['파치먼트', '#f5f5f7'],
  ['어두운 타일', '#272729'],
]

const MIN = 3 // 도형·선의 최소 대비 (WCAG 1.4.11 비텍스트 기준)

const srgb = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => srgb(c / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/* 색이 어디에 쓰였는지 — fill=/stroke=/stop-color= 어트리뷰트와 style 안의 fill: */
const PICK = /(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{6})"|fill:\s*(#[0-9a-fA-F]{6})/g

let bad = 0

for (const [file, fn, label] of SCENES) {
  const mod = await import(`${W}/src/scenes/${file}`)
  const svg = mod[fn]()

  /* 같은 색이 여러 번 나와도 한 번만 본다 — 보고서가 길어지면 아무도 안 읽는다. */
  const seen = new Set()
  for (const m of svg.matchAll(PICK)) {
    const hex = (m[1] || m[2]).toLowerCase()
    if (hex === '#ffffff' || seen.has(hex)) continue
    seen.add(hex)
  }

  const fails = []
  for (const hex of seen) {
    const best = GROUNDS.map(([name, bg]) => [name, ratio(hex, bg)]).sort((a, b) => b[1] - a[1])[0]
    if (best[1] < MIN) fails.push([hex, best])
  }

  if (fails.length) {
    bad += fails.length
    console.log(`✗ ${label}`)
    for (const [hex, [name, r]] of fails) {
      console.log(`    ${hex}  최선의 바탕(${name})에서도 ${r.toFixed(2)}:1 — ${MIN}:1 미만`)
    }
  } else {
    console.log(`✓ ${label}  (색 ${seen.size}종)`)
  }
}

console.log(bad ? `\n대비 미달 ${bad}건` : '\n대비 문제 없음')
process.exit(bad ? 1 : 0)
