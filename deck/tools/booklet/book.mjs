import { chromium } from 'playwright';
import fs from 'node:fs';
const meta = JSON.parse(fs.readFileSync('/w/book/meta.json', 'utf8'));
const N = meta.length;
const pageOf = (i) => 1 + Math.floor(i / 2);
const chapters = [];
meta.forEach((m, i) => { if (m.chapter) chapters.push({ i, title: m.title }); });
const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];
const chapterAt = (i) => { let c = null; chapters.forEach((ch, k) => { if (ch.i <= i) c = `${ROMAN[k]} ${ch.title}`; }); return c || '들어가며'; };
const img = (f) => `data:image/jpeg;base64,${fs.readFileSync(`/w/book/${f}`).toString('base64')}`;
const art = `data:image/png;base64,${fs.readFileSync('/w/book/cover-art.png').toString('base64')}`;
const TITLE = '생성형 AI 보안 프레임워크 및 가드레일 실증 연구';

let pages = '';

// 겉표지 — 내셔널 지오그래픽 잡지의 문법: 노란 테두리 · 세리프 제호 · 그림 한 장 · 굵은 표지 문구.
// 그림은 설명 사이트의 조감도(우리가 그린 단면 일러스트)다 — 사진·자연 이미지는 쓰지 않는다.
const scene = `data:image/png;base64,${fs.readFileSync('/w/book/cover-scene.png').toString('base64')}`;
const logo = `data:image/svg+xml;base64,${fs.readFileSync('/w/book/kaist.svg').toString('base64')}`;
pages += `<section class="pg outer">
  <div class="ng">
    <div class="ng-mast"><span class="ng-kicker">KAIST · 2026 직원 현장연구과정 · 최종 성과 발표 자료집</span>
      <h1 class="ng-title">GUARDRAIL</h1></div>
    <div class="ng-scene"><img src="${scene}" alt=""></div>
    <div class="ng-lines">
      <p class="ng-pre">대학 행정환경을 고려한 생성형 AI 도입을 위한</p>
      <p class="ng-head">보안 프레임워크 및<br>가드레일 실증 연구</p>
      <p class="ng-dek">나갈 때 한 번, 들어올 때 한 번 — <b>우리 기준으로 우리가 확인하는 관문</b></p>
    </div>
    <div class="ng-foot"><img class="ng-logo" src="${logo}" alt="KAIST"><div class="ng-team"><b>AI 보안·거버넌스 현장연구팀</b><br>이현재 · 임종호 · 강경덕</div><div class="ng-date">2026.10</div></div>
  </div>
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
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Noto+Serif+KR:wght@900&family=Noto+Sans+KR:wght@300;400;600;700&display=block"><style>
@page { size: 182mm 257mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; color: #1d1d1f; font-family: 'Noto Sans CJK KR', 'Noto Sans KR', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pg { width: 182mm; height: 257mm; position: relative; overflow: hidden; page-break-after: always; }
.outer { padding: 9mm; background: #fff; }
.ng { position: relative; height: 100%; border: 5.5mm solid #ffcd00; background: #f4f4f6; display: flex; flex-direction: column; overflow: hidden; }
.ng-mast { background: #fff; text-align: center; padding: 5mm 4mm 2mm; border-bottom: .3mm solid #e2e2e6; }
.ng-kicker { display: block; font-size: 6.6pt; letter-spacing: .22em; color: #6e6e73; font-weight: 600; }
.ng-title { margin: 1mm 0 0; font-family: 'Playfair Display', 'Liberation Serif', serif; font-weight: 900; font-size: 50pt; letter-spacing: .06em; line-height: 1; color: #111; }
.ng-scene { flex: 1; position: relative; overflow: hidden; }
.ng-scene img { position: absolute; height: 80%; width: auto; left: -24mm; top: 3mm; }
.ng-lines { padding: 0 8mm 5mm; }
.ng-pre { margin: 0; font-size: 9.5pt; font-weight: 400; color: #3c3c43; }
.ng-head { margin: 1.5mm 0 0; font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: 25pt; line-height: 1.16; letter-spacing: -.02em; color: #111; }
.ng-dek { margin: 3mm 0 0; font-size: 9pt; color: #3c3c43; border-top: .6mm solid #ffcd00; padding-top: 2.5mm; display: inline-block; }
.ng-dek b { color: #0d7a63; font-weight: 700; }
.ng-foot { background: #fff; display: flex; align-items: center; gap: 4mm; padding: 3.5mm 8mm; border-top: .3mm solid #e2e2e6; }
.ng-logo { height: 15mm; width: auto; }
.ng-team { flex: 1; font-size: 8pt; line-height: 1.6; color: #3c3c43; }
.ng-team b { color: #111; }
.ng-date { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 13pt; color: #111; letter-spacing: .04em; }
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
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: '/w/book/booklet.pdf', width: '182mm', height: '257mm', printBackground: true, preferCSSPageSize: true });
console.log('pages', 3 + Math.ceil(N / 2), await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).join(',')));
await b.close();
