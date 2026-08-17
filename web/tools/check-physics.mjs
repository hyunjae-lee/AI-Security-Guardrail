/**
 * 도면 물리 검사 — 물체가 허공에 떠 있거나 대지 밖으로 나가지 않았는지 본다.
 *
 *   실행:  node web/tools/check-physics.mjs        (저장소 루트에서)
 *          W=web node web/tools/check-physics.mjs  (경로를 직접 줄 때)
 *
 * 아이소메트릭은 좌표가 곧 물리라 좌표로 잡을 수 있다.  _iso.js 의 기록기
 * (globalThis.__ISO_RECORD__) 를 켜고 각 장면을 한 번 그려서, 만들어진
 * 직육면체·슬래브의 위치 관계를 검사한다.
 *
 *   1) 부양  받쳐 주는 것이 없는데 z > 0
 *   2) 이탈  대지 밖으로 귀퉁이가 나감
 *
 * 공중에 있는 것이 맞는 물체(비행기·비행 중인 가방·내려찍기 직전의 스탬프)와
 * 대지 밖에 서는 것이 맞는 구조물(컷어웨이 벽)은 scene 코드에서 cls 로 표시해
 * 두고 여기서 제외한다.  "빼먹은 것" 과 "일부러 뺀 것" 이 구분되어야 한다.
 */
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
/* 기본값: 이 파일 기준 ../src — 어느 디렉터리에서 실행하든 같은 곳을 본다. */
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
/* 공중에 있는 것이 맞는 물체 — 비행기, 비행 중인 가방, 잠긴 터미널 등. */
const AIRBORNE = /plane|craft|cargo|wing|tail|nose|(^|[ -])fly([ -]|$)|air|sunk|sink/i
/* 대지 위에 얹히지 않는 것이 맞는 구조물 — 컷어웨이 벽처럼 방을 잘라 낸 자리에
   서는 것들. 검사에서 빼되, 코드에 표시해 두어야 '빼먹은 것' 과 구분된다. */
const STRUCTURE = /wall/i

const ov = (a, b, ka, kb) => Math.min(a[ka] + a[kb], b[ka] + b[kb]) - Math.max(a[ka], b[ka])

let total = 0
for (const [f, fn, label] of SCENES) {
  // 도형 상당수가 모듈 최상위에서 만들어지므로 import 전에 기록기를 켜야 한다.
  globalThis.__ISO_RECORD__ = []
  const mod = await import(`${W}/src/scenes/${f}`)
  mod[fn]()
  const all = globalThis.__ISO_RECORD__.slice()
  globalThis.__ISO_RECORD__ = null

  const slabs = all.filter((o) => o.kind === 'slab')
  const boxes = all.filter((o) => o.kind === 'box')
  const issues = []

  const spans = (o, b, ka, kb) => ov(o, b, ka, kb) >= -0.01

  for (const b of boxes) {
    if (AIRBORNE.test(b.id || '') || AIRBORNE.test(b.cls || '')) continue
    if (b.z <= 2.01) continue // 바닥 표시선 등은 z-fighting 을 피하려 1~2 띄운다
    const others = [...slabs, ...boxes].filter((o) => o !== b)
    // (a) 위에 얹힘 — 아래 물체의 윗면이 이 물체의 밑면
    const onTop = others.some(
      (o) => Math.abs(o.top - b.z) < 1.51 && spans(o, b, 'x', 'w') && spans(o, b, 'y', 'd'))
    // (b) 옆에 붙음 — 벽에서 내민 것(탑승교). 벽의 높이 구간이 밑면을 품어야 한다.
    const onWall = others.some(
      (o) => o.z <= b.z + 0.01 && o.top >= b.z + b.h - 0.01 &&
             spans(o, b, 'x', 'w') && spans(o, b, 'y', 'd'))
    if (!onTop && !onWall)
      issues.push(`부양  z=${b.z} (${b.w}×${b.d}×${b.h}) @ (${b.x},${b.y})${b.id ? ' #' + b.id : ''}`)
  }

  // 지면에 놓인 물체의 네 귀퉁이가 전부 무언가에 받쳐져 있는지 (대지 여러 장에
  // 걸쳐 놓인 것은 정상 — 다리와 계류장 이음매 위의 가방처럼).
  const rests = (px, py, z) =>
    [...slabs, ...boxes].some(
      (o) => Math.abs(o.top - z) < 1.51 &&
             px >= o.x - 0.5 && px <= o.x + o.w + 0.5 &&
             py >= o.y - 0.5 && py <= o.y + o.d + 0.5)

  for (const b of boxes) {
    if (AIRBORNE.test(b.id || '') || AIRBORNE.test(b.cls || '')) continue
    if (STRUCTURE.test(b.cls || '')) continue
    if (b.z > 2.01) continue
    const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.d], [b.x + b.w, b.y + b.d]]
    if (!corners.some(([px, py]) => rests(px, py, b.z))) continue // 애초에 대지 위가 아님
    const loose = corners.filter(([px, py]) => !rests(px, py, b.z))
    if (loose.length)
      issues.push(`이탈  (${b.x},${b.y},${b.w}×${b.d}) 귀퉁이 ${loose.length}개가 허공`)
  }

  if (issues.length) {
    total += issues.length
    console.log(`✗ ${label}`)
    for (const i of [...new Set(issues)]) console.log('   ' + i)
  } else console.log(`✓ ${label}`)
}
console.log(total ? `\n${total}건` : '\n물리 오류 없음')
