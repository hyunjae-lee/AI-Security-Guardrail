/**
 * 도면 미리보기 — 장면 SVG 를 PNG 로 굽는다.
 *
 *   실행:  node web/tools/render-scenes.mjs              (저장소 루트에서, 10장 전부)
 *          node web/tools/render-scenes.mjs runway outro (장면 id 만 골라서)
 *          OUT=/tmp/shots node web/tools/render-scenes.mjs
 *          WIDTH=2000 node web/tools/render-scenes.mjs   (기본 1400px)
 *
 * 왜 있나
 * -------
 * 이 저장소가 도는 호스트에는 브라우저가 없다.  도면 색을 고칠 때마다
 * "바탕과 같아져서 사라진 것" 은 좌표 검사(check-physics)로도, 대비 검사
 * (check-contrast)로도 안 잡힌다 — 실제로 그려 봐야 보인다.  이 도구가 그 눈이다.
 *
 * 브라우저와 같은 그림이 나오게 하려면 두 가지를 흉내 내야 한다.
 *
 *   1) CSS 변수.  resvg 는 var() 를 풀지 못하므로 tokens.css 에서 값을 읽어
 *      plate.css 와 인라인 style 의 var() 를 **미리 치환**한 뒤 넘긴다.
 *   2) 바탕색.  도면은 장면마다 다른 타일 위에 앉고, 어두운 타일에서는
 *      파치먼트 판 위에 올라간다.  그 값은 scenes/_tone.js 가 갖는다.
 *
 * 한계 — 이것으로 확인되지 않는 것
 * --------------------------------
 *   · 애니메이션 (GSAP 은 브라우저에서만 돈다. 여기 나오는 것은 '그린 그대로' 의
 *     정지 상태다 — 즉 '동작 줄이기' 로 보는 화면과 같다)
 *   · 서체.  SF Pro / Noto Sans KR 가 없는 호스트에서는 시스템 서체로 떨어져
 *     글자 폭이 실제와 조금 다르다. 색과 배치를 보는 용도로 쓸 것.
 *   · 지면(page) 쪽 레이아웃. 여기서 굽는 것은 도면 하나뿐이다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve as resolvePath } from 'node:path'

/* 이 파일 기준 ../src — 어느 디렉터리에서 실행하든 같은 곳을 본다. */
const W = pathToFileURL(resolvePath(new URL('..', import.meta.url).pathname)).href
const SRC = `${W}/src`
const OUT = process.env.OUT || resolvePath(new URL('..', import.meta.url).pathname, 'tools/.out')
const WIDTH = Number(process.env.WIDTH || 1400)

const SCENES = [
  ['intro', 'scene-intro.js', 'sceneIntroSvg', '01 인트로'],
  ['why', 'scene-why.js', 'sceneWhySvg', '02 왜 검사대인가'],
  ['basis', 'scene-basis.js', 'sceneBasisSvg', '03 설계 근거'],
  ['overview', 'scene2-overview.js', 'scene2Svg', '04 조감도'],
  ['departures', 'scene3-departures.js', 'scene3Svg', '05 출국층'],
  ['runway', 'scene-runway.js', 'sceneRunwaySvg', '06 활주로'],
  ['arrivals', 'scene-arrivals.js', 'sceneArrivalsSvg', '07 입국층'],
  ['records', 'scene-records.js', 'sceneRecordsSvg', '08 기록실'],
  ['shared', 'scene-shared.js', 'sceneSharedSvg', '09 각 부서의 몫'],
  ['outro', 'scene-outro.js', 'sceneOutroSvg', '10 아웃트로'],
]

let Resvg
try {
  ;({ Resvg } = await import('@resvg/resvg-js'))
} catch {
  console.error(
    '@resvg/resvg-js 가 없다.  cd web && npm ci  로 devDependencies 를 설치할 것.\n' +
      '(이 도구만 이 패키지를 쓴다 — 사이트 번들에는 들어가지 않는다.)',
  )
  process.exit(1)
}

const { stageGround } = await import(`${SRC}/scenes/_tone.js`)

/* --- tokens.css 의 변수를 읽어 map 으로 -------------------------------- */
const cssPath = (name) => resolvePath(new URL('..', import.meta.url).pathname, 'src/styles', name)
const tokens = readFileSync(cssPath('tokens.css'), 'utf8')
const plate = readFileSync(cssPath('plate.css'), 'utf8')

const vars = {}
for (const m of tokens.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim()

/** 도면이 앉는 판의 색. 콜아웃 번호 배지가 이 색으로 채워진다. */
const withTile = (ground) => ({ ...vars, '--tile': ground })

const MISSING = '#ff00ff' // 값을 못 찾으면 형광 마젠타로 튀게 해서 바로 알아채게 한다

const deVar = (text, map, depth = 0) =>
  depth > 8
    ? text
    : text.replace(/var\((--[a-z0-9-]+)\)/g, (_, name) =>
        deVar(map[name] ?? MISSING, map, depth + 1),
      )

const pick = process.argv.slice(2)
const wanted = SCENES.filter(([id]) => !pick.length || pick.includes(id))

if (!wanted.length) {
  console.error(`그런 장면이 없다: ${pick.join(', ')}`)
  console.error(`고를 수 있는 것: ${SCENES.map(([id]) => id).join(' ')}`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

for (const [id, file, fn, label] of wanted) {
  const mod = await import(`${SRC}/scenes/${file}`)
  const ground = stageGround(id)
  const map = withTile(ground)

  /* plate.css 를 SVG 안에 넣는다 — .illus 접두사는 걷는다(여기서는 <svg> 가 곧 루트다). */
  const css = deVar(plate, map)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\.illus\s*\{[^}]*\}/g, '')
    .replace(/\.illus\s+/g, '')

  const svg = deVar(mod[fn](), map).replace(
    /<svg([^>]*)>/,
    `<svg$1 xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
      `<style>${css}</style>` +
      /* 뷰박스 전체를 덮는 바탕 — 도면이 실제로 앉는 타일/판 색이다. */
      `<rect x="-99999" y="-99999" width="999999" height="999999" fill="${ground}"/>`,
  )

  const png = new Resvg(svg, { background: ground, fitTo: { mode: 'width', value: WIDTH } })
    .render()
    .asPng()

  const path = `${OUT}/${id}.png`
  writeFileSync(path, png)
  console.log(`✓ ${label}  ${path}  (${(png.length / 1024).toFixed(0)} kB, 바탕 ${ground})`)
}

console.log(`\n${wanted.length}장 구웠다 — ${OUT}`)
