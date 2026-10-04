#!/usr/bin/env node
/* 발표 화면 글자 대비 검사 — web/tools/check-contrast.mjs 와 같은 취지.
 *
 * 강당 프로젝터는 모니터보다 대비가 떨어지고, 뒷자리는 멀다.  그래서 WCAG
 * 최소선(4.5:1)이 아니라 **7:1** 을 기준으로 둔다.  실제로 --ink-3 가 4.13:1
 * 이었고 「배경과 비슷해 안 보인다」는 지적을 받았다.
 *
 *   node deck/tools/check-contrast.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, '../src/theme.css'), 'utf8');

const hex = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (h) => {
  const [r, g, b] = hex(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

function token(name) {
  const m = CSS.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`토큰을 찾지 못했습니다: ${name}`);
  return m[1];
}

const BG = token('--ground');
// 글자로 쓰이는 색만 본다. --line 은 테두리라 대비 기준이 다르다.
const TEXT_TOKENS = ['--ink', '--ink-2', '--ink-3', '--amber', '--teal', '--red', '--green', '--blue'];
const FLOOR = 7.0;

let bad = 0;
console.log(`바탕 ${BG} · 기준 ${FLOOR}:1 (강당 프로젝터)\n`);
for (const t of TEXT_TOKENS) {
  const v = token(t);
  const r = ratio(v, BG);
  const ok = r >= FLOOR;
  if (!ok) bad += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${t.padEnd(9)} ${v}  ${r.toFixed(2).padStart(6)}:1`);
}
console.log();
if (bad) {
  console.log(`${bad}개가 기준 미달입니다. 색을 밝히거나 그 색을 글자에 쓰지 마십시오.`);
  process.exit(1);
}
console.log('모든 글자 색이 기준을 넘습니다.');
