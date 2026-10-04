/* 슬라이드가 화면 밖으로 넘치는지 검사한다.
 *
 * 왜 필요한가: 문구를 한 줄 늘리면 맺음 문장이나 출처 줄이 조용히 밀려
 * 나간다.  발표장 프로젝터에서야 보인다.  32장을 매번 눈으로 볼 수는 없다.
 *
 * 왜 DevTools 프로토콜인가: `--virtual-time-budget` + `--dump-dom` 으로
 * 해 봤더니 끝나지 않는다 — GSAP 의 ticker 가 매 프레임 rAF 를 다시 걸어서
 * 가상 시간이 프레임 단위로만 흐른다.  붙어서 「다 됐나」를 묻는 쪽이 빠르고
 * 확실하다.
 *
 * 쓰는 법 (개발 서버가 떠 있어야 한다):
 *   npm run dev            # 다른 터미널
 *   node tools/check-overflow.mjs [포트]
 *
 * 넘친 슬라이드가 있으면 1 로 끝난다 — CI 에 걸 수 있다.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 이 맥 기준 경로. 다른 컴퓨터에서는 CHROME 환경변수로 넘긴다.
const CHROME = process.env.CHROME
  || '/Applications/Google Chrome 4.app/Contents/MacOS/Google Chrome';
const PORT = process.argv[2] || '5174';
const URL = `http://127.0.0.1:${PORT}/?audit=1`;
const DEBUG_PORT = 9333;

const profile = mkdtempSync(join(tmpdir(), 'deck-overflow-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--force-prefers-reduced-motion',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--window-size=1600,900',
  URL,
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanup() {
  chrome.kill('SIGKILL');
  rmSync(profile, { recursive: true, force: true });
}

async function targetSocket() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const pages = (await res.json()).filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pages.length) return pages[0].webSocketDebuggerUrl;
    } catch { /* 아직 안 떴다 */ }
    await sleep(250);
  }
  throw new Error('브라우저에 붙지 못했습니다.');
}

let rows;
try {
  const ws = new WebSocket(await targetSocket());
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    const p = pending.get(msg.id);
    if (p) { pending.delete(msg.id); p(msg); }
  };
  const send = (method, params) => new Promise((res) => {
    id += 1;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });

  // 페이지가 스스로 다 재고 body 에 표시를 남길 때까지 기다린다.
  let out = null;
  for (let i = 0; i < 80; i += 1) {
    const r = await send('Runtime.evaluate', {
      expression: 'document.body.dataset.auditDone === "1" ? document.title : ""',
      returnByValue: true,
    });
    const v = r.result?.result?.value;
    if (v && v.startsWith('AUDIT ')) { out = v.slice(6); break; }
    await sleep(250);
  }
  if (!out) throw new Error('측정이 끝나지 않았습니다 — ?audit=1 분기가 살아 있는지 확인하세요.');
  rows = JSON.parse(out);
  ws.close();
} finally {
  cleanup();
}

// 1~2px 는 반올림 오차다. 그 이상부터 사람 눈에 보인다.
const TOLERANCE = 3;
let bad = 0;
for (const r of rows) {
  const over = r.over > TOLERANCE;
  if (over) bad += 1;
  console.log(`  ${over ? '✗' : '✓'} ${String(r.i).padStart(2, '0')}  ${r.label}${over ? `   ${r.over}px 넘침` : ''}`);
}

console.log('');
if (bad) {
  console.log(`${bad}장이 화면 밖으로 넘칩니다. 문장을 줄이거나 표를 나누세요.`);
  process.exit(1);
}
console.log(`${rows.length}장 모두 화면 안에 들어갑니다.`);
