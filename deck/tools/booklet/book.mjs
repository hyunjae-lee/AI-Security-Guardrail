import { chromium } from 'playwright';
import fs from 'node:fs';
const meta = JSON.parse(fs.readFileSync('/w/book/meta.json', 'utf8'));
const N = meta.length;
const pageOf = (i) => 4 + Math.floor(i / 2);
const chapters = [];
meta.forEach((m, i) => { if (m.chapter) chapters.push({ i, title: m.title }); });
const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];
const chapterAt = (i) => { let c = null; chapters.forEach((ch, k) => { if (ch.i <= i) c = `${ROMAN[k]} ${ch.title}`; }); return c || '들어가며'; };
const img = (f) => `data:image/jpeg;base64,${fs.readFileSync(`/w/book/${f}`).toString('base64')}`;
const art = `data:image/png;base64,${fs.readFileSync('/w/book/cover-art.png').toString('base64')}`;
const TITLE = '생성형 AI 보안 프레임워크 및 가드레일 실증 연구';

let pages = '';

// 겉표지 — 국경 하나, 검사대 하나, 질의 세 줄. 그 밖에는 아무것도 두지 않는다.
const dots = (y, from, to, col, op0) => { let o = ''; let n = 0; for (let x = from; x <= to; x += 7) n++; let k = 0;
  for (let x = from; x <= to; x += 7, k++) o += `<circle cx="${x}" cy="${y}" r="1.5" fill="${col}" opacity="${(op0 + (1 - op0) * k / Math.max(1, n - 1)).toFixed(2)}"/>`; return o; };
const outerArt = `<svg class="o-art" viewBox="0 0 182 257" xmlns="http://www.w3.org/2000/svg">
  <line x1="122" y1="0" x2="122" y2="257" stroke="#b3251a" stroke-width=".3" stroke-dasharray="1.6 1.6" opacity=".55"/>
  <rect x="114" y="84" width="16" height="22" fill="#fff"/>
  <rect x="119.6" y="104" width="4.8" height="58" rx="2.4" fill="#0d7a63"/>
  <path d="M122 88.5 l6 2.4 v4.6 c0 4 -2.6 6.6 -6 8 c-3.4 -1.4 -6 -4 -6 -8 v-4.6 z" fill="none" stroke="#0d7a63" stroke-width=".7" stroke-linejoin="round"/>
  <path d="M119.4 95.6 l1.9 1.9 l3.4 -3.6" fill="none" stroke="#0d7a63" stroke-width=".7" stroke-linecap="round" stroke-linejoin="round"/>
  ${dots(116, 26, 110, '#d98f1f', .12)}
  <circle cx="136" cy="116" r="1.5" fill="none" stroke="#0d7a63" stroke-width=".5"/>${dots(116, 143, 171, '#0d7a63', 1)}
  ${dots(133, 26, 103, '#d98f1f', .12)}
  <circle cx="114.5" cy="133" r="2.3" fill="none" stroke="#b3251a" stroke-width=".55"/>
  <path d="M113.3 131.8 l2.4 2.4 M115.7 131.8 l-2.4 2.4" stroke="#b3251a" stroke-width=".5" stroke-linecap="round"/>
  ${dots(150, 26, 110, '#d98f1f', .12)}${dots(136, 136, 171, '#3f7a24', 1).replace(/cy="136"/g, 'cy="150"')}
</svg>`;
pages += `<section class="pg outer">${outerArt}
  <div class="o-top"><p class="o-kicker">2026 직원 현장연구과정 · 최종 성과 발표 자료집</p>
  <p class="o-pre">대학 행정환경을 고려한 생성형 AI 도입을 위한</p>
  <h1 class="o-title">보안 프레임워크 및<br>가드레일 실증 연구</h1></div>
  <div class="o-foot"><div><b>AI 보안·거버넌스 현장연구팀</b><br>이현재 · 임종호 · 강경덕</div><div class="o-mark">KAIST<span>2026</span></div></div>
</section>`;
// 겉표지
pages += `<section class="pg cover">
  <p class="c-kicker">2026 직원 현장연구과정 · 최종 성과 발표</p>
  <p class="c-pre">대학 행정환경을 고려한<br>생성형 AI 도입을 위한</p>
  <h1 class="c-title">보안 프레임워크 및<br>가드레일 실증 연구</h1>
  <div class="c-rule"></div>
  <img class="c-art" src="${art}" alt="">
  <div class="c-foot">
    <div class="c-team"><b>AI 보안·거버넌스 현장연구팀</b><br>연구책임자 이현재 (정보보안팀)<br>공동연구원 임종호 (정보전산팀)<br>공동연구원 강경덕 (교수학습지원팀)</div>
    <div class="c-meta">연구기간 2026.3.1. – 9.30.<br>발표 자료집 · 2026.10<br><b>KAIST</b></div>
  </div>
</section>`;
// 차례
const toc = [{ t: '들어가며', p: pageOf(0) }, ...chapters.map((c, k) => ({ t: `<span class="r">${ROMAN[k]}</span>${c.title}`, p: pageOf(c.i) }))];
pages += `<section class="pg toc"><h2>차례</h2><ol>${toc.map((x) => `<li><span class="t">${x.t}</span><span class="dots"></span><span class="p">${x.p}</span></li>`).join('')}</ol>
  <p class="toc-note">발표 화면 ${N}장을 한 쪽에 두 장씩 실었습니다. 화면에서 단계별로 펼쳐지는 장은 모두 펼친 상태로 담았습니다.</p></section>`;
// 본문
for (let i = 0; i < N; i += 2) {
  const slot = (k) => k < N ? `<figure class="sl"><img src="${img(`s${String(k).padStart(2, '0')}.jpg`)}" alt=""><figcaption>${String(k + 1).padStart(2, '0')}</figcaption></figure>` : '';
  pages += `<section class="pg body"><header><span>${TITLE}</span><span>${chapterAt(Math.min(i + 1, N - 1))}</span></header><main>${slot(i)}${slot(i + 1)}</main><footer>${pageOf(i)}</footer></section>`;
}
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@page { size: 182mm 257mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; color: #1d1d1f; font-family: 'Noto Sans CJK KR', 'Noto Sans KR', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pg { width: 182mm; height: 257mm; position: relative; overflow: hidden; page-break-after: always; }
.outer { padding: 26mm 18mm 20mm; display: flex; flex-direction: column; justify-content: space-between; }
.o-art { position: absolute; inset: 0; width: 182mm; height: 257mm; }
.o-top, .o-foot { position: relative; }
.o-kicker { margin: 0; font-size: 7.5pt; letter-spacing: .18em; color: #6e6e73; font-weight: 600; }
.o-pre { margin: 7mm 0 0; font-size: 10.5pt; font-weight: 300; color: #3c3c43; }
.o-title { margin: 2.5mm 0 0; font-size: 25pt; line-height: 1.2; font-weight: 700; letter-spacing: -.025em; color: #1d1d1f; }
.o-foot { display: flex; justify-content: space-between; align-items: flex-end; font-size: 8pt; line-height: 1.7; color: #3c3c43; }
.o-foot b { color: #1d1d1f; font-weight: 700; }
.o-mark { text-align: right; font-size: 15pt; font-weight: 700; letter-spacing: .04em; color: #1d1d1f; line-height: 1.1; }
.o-mark span { display: block; font-size: 8pt; font-weight: 400; letter-spacing: .1em; color: #6e6e73; margin-top: 1.2mm; }
.cover { padding: 24mm 18mm 18mm; display: flex; flex-direction: column; }
.c-kicker { margin: 0; font-size: 8.5pt; letter-spacing: .16em; color: #9a6408; font-weight: 600; }
.c-pre { margin: 9mm 0 0; font-size: 13pt; font-weight: 300; line-height: 1.45; color: #3c3c43; }
.c-title { margin: 3mm 0 0; font-size: 27pt; line-height: 1.18; font-weight: 700; letter-spacing: -.02em; }
.c-rule { width: 22mm; height: 1.2mm; background: #0d7a63; border-radius: 1mm; margin: 8mm 0 4mm; }
.c-art { width: 100%; margin: auto 0; }
.c-foot { display: flex; justify-content: space-between; align-items: flex-end; border-top: .3mm solid #d2d2d7; padding-top: 5mm; font-size: 8.5pt; line-height: 1.7; color: #3c3c43; }
.c-foot b { color: #1d1d1f; font-weight: 700; }
.c-meta { text-align: right; }
.toc { padding: 30mm 22mm; }
.toc h2 { font-size: 20pt; font-weight: 700; margin: 0 0 12mm; letter-spacing: -.01em; }
.toc ol { list-style: none; margin: 0; padding: 0; }
.toc li { display: flex; align-items: baseline; font-size: 12.5pt; padding: 4.2mm 0; border-bottom: .2mm solid #e5e5ea; }
.toc .r { display: inline-block; width: 9mm; color: #0d7a63; font-weight: 700; }
.toc .dots { flex: 1; }
.toc .p { font-variant-numeric: tabular-nums; color: #6e6e73; }
.toc-note { margin-top: 12mm; font-size: 8.5pt; color: #6e6e73; line-height: 1.7; }
.body { padding: 13mm 12mm 16mm; display: flex; flex-direction: column; }
.body main { flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; }
.body header { display: flex; justify-content: space-between; font-size: 7pt; color: #6e6e73; border-bottom: .2mm solid #d2d2d7; padding-bottom: 2mm; margin-bottom: 5mm; }
.sl { margin: 0; }
.sl img { display: block; width: 158mm; height: auto; border: .25mm solid #d2d2d7; border-radius: 2mm; }
.sl figcaption { font-size: 7pt; color: #6e6e73; text-align: right; margin-top: 1.2mm; font-variant-numeric: tabular-nums; }
.body footer { position: absolute; bottom: 9mm; left: 0; right: 0; text-align: center; font-size: 8pt; color: #6e6e73; }
</style></head><body>${pages}</body></html>`;
fs.writeFileSync('/w/book/book.html', html);
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(html, { waitUntil: 'load' });
await p.pdf({ path: '/w/book/booklet.pdf', width: '182mm', height: '257mm', printBackground: true, preferCSSPageSize: true });
await b.close();
console.log('pages', 3 + Math.ceil(N / 2));
