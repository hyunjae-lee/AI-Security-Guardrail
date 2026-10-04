/* 확대 단계의 틀이 그 단계에서 비추는 상자를 다 담는지 검사한다.
 *
 * 눈으로 보면 「조금 잘린 것」을 놓친다 — 실제로 1단계에서 상자 윗부분이
 * 잘린 채 커밋됐고, 고치면서 조이다가 이번엔 아랫부분을 잘랐다.
 * 좌표는 stack.js 안에 있으니 거기서 읽어 대조한다.
 *
 *   node tools/check-zoom.mjs
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/stack.js', import.meta.url), 'utf8');

// 상자는 box(x, y, w, h, …) 호출이고, 묶음은 <g id="z-…"> 안에 있다.
const groups = {};
for (const m of src.matchAll(/<g id="(z-[a-z-]+)">([\s\S]*?)<\/g>/g)) {
  const [, id, body] = m;
  const boxes = [];
  for (const b of body.matchAll(/\$\{box\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),/g)) {
    boxes.push(b.slice(1, 5).map((e) => {
      // 'X + 590' 같은 식을 푼다. X 는 buildStack 안의 상수.
      const X = Number(/const X = (\d+);/.exec(src)[1]);
      return Function('X', `return (${e});`)(X);
    }));
  }
  if (boxes.length) groups[id] = boxes;
}

let bad = 0;
const steps = [...src.matchAll(/\[\[(\d+), (\d+), (\d+), (\d+)\], (\[[^\]]*\]|null),/g)];
steps.forEach((m, i) => {
  const [vx, vy, vw, vh] = m.slice(1, 5).map(Number);
  const ids = m[5] === 'null' ? [] : [...m[5].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  const cut = [];
  for (const id of ids) {
    for (const [bx, by, bw, bh] of groups[id] || []) {
      if (bx < vx || by < vy || bx + bw > vx + vw || by + bh > vy + vh) {
        cut.push(`${id} (${bx},${by})-(${bx + bw},${by + bh})`);
      }
    }
  }
  if (cut.length) bad += 1;
  console.log(`  ${cut.length ? '✗' : '✓'} 단계 ${i + 1}  틀 (${vx},${vy})-(${vx + vw},${vy + vh})`
    + (cut.length ? `   잘림: ${cut.join(' · ')}` : ''));
});

console.log('');
if (bad) { console.log(`${bad}개 단계의 틀이 상자를 자릅니다.`); process.exit(1); }
console.log(`${steps.length}개 단계 모두 상자를 온전히 담습니다.`);
