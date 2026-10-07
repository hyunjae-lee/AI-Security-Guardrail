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

// 겉표지 — 내셔널지오그래픽(한국판) 톤: 노란 테두리 · 이미지가 지배 · 굵은 한글 고딕 · 노란 막대 강조.
// 글이 그림 위에 따로 얹히지 않도록 제목을 게이트 바로 앞 바닥(지평선)에 세우고, 빛 궤적이 제목 뒤를 지나게 한다.
// 뒤표지(ngback.svg)와 펼쳐 놓으면 궤적이 책등을 건너 이어진다.
const scene = fs.readFileSync('/w/hero/ng.svg', 'utf8');
const logo = `data:image/png;base64,${fs.readFileSync('/w/book/kaist-w.png').toString('base64')}`;      // KAIST 공식 로고(단색) → 흰색
const logoBlack = `data:image/png;base64,${fs.readFileSync('/w/book/kaist-k.png').toString('base64')}`;
const logoBlue = `data:image/png;base64,${fs.readFileSync('/w/book/kaist-b.png').toString('base64')}`;
pages += `<section class="pg outer">
  <div class="ng-img">${scene}</div>
  <div class="ng-frame"></div>
  <div class="ng-top"><span>2026 직원 현장연구과정</span><span>최종 성과 발표 자료집</span></div>
  <h1 class="ng-mast">AI GUARDRAIL</h1>
  <div class="ng-story">
    <p class="ng-pre"><i></i>대학 행정환경을 고려한 생성형 AI 도입을 위한</p>
    <p class="ng-head">보안 프레임워크 및<br><em>가드레일</em> 실증 연구</p>
  </div>
  <div class="ng-sign"><span class="who"><img src="${logo}" alt="KAIST">AI 보안·거버넌스 현장연구회</span><span class="yr">2026</span></div>
</section>`;
// 겉표지
pages += `<section class="pg cover">
  <p class="c-kicker">2026 직원 현장연구과정 · 최종 성과 발표</p>
  <p class="c-pre">대학 행정환경을 고려한<br>생성형 AI 도입을 위한</p>
  <h1 class="c-title">보안 프레임워크 및<br>가드레일 실증 연구</h1>
  <div class="c-rule"></div>
  <img class="c-art" src="${art}" alt="">
  <div class="c-foot">
    <div class="c-team"><b>AI 보안·거버넌스 현장연구회</b><br>연구책임자 이현재 (정보보안팀)<br>공동연구원 임종호 (AI인프라팀)<br>공동연구원 강경덕 (교수학습지원팀)</div>
    <div class="c-meta">연구기간 2026.3.1. – 9.30.<br>발표 자료집 · 2026.10<br><img class="c-logo" src="${logoBlue}" alt="KAIST"></div>
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

// 면지(빈 쪽) — 중철 제본은 4의 배수여야 한다(겉표지·속표지·차례·본문 23·면지·뒤표지 = 28).
pages += `<section class="pg blank"></section>`;
// 뒤표지 — 책의 맨 바깥쪽. 빛 궤적이 캠퍼스에서 일어나 책등을 건너 앞표지의 게이트로 간다.
pages += `<section class="pg back">
  <div class="ng-top bk"><span>2026 직원 현장연구과정</span><span>최종 성과 발표 자료집</span></div>
  <div class="bk-copy">
    <svg class="bk-emblem" viewBox="0 0 60 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#111" stroke-linecap="round">
      <path d="M12 62 V30 A18 18 0 0 1 48 30 V62" stroke-width="2.4"/>
      <path d="M16 62 V30 A14 14 0 0 1 44 30 V62" stroke-width=".8"/>
      <path d="M30 12 V62" stroke-width="1"/>
      <path d="M0 34 H60" stroke-width="1.6"/><path d="M0 50 H60" stroke-width="1.6"/>
      <path d="M0 42 H30" stroke-width="1.6"/><circle cx="30" cy="42" r="3" fill="#f5d327" stroke-width="1.4"/><circle cx="30" cy="42" r="1.2" fill="#111" stroke="none"/>
    </svg>
    <p class="bk-mark">AI GUARDRAIL</p>
    <p class="bk-lead">막지 않습니다.<br>확인하고 보냅니다.</p>
    <p class="bk-body">구성원이 생성형 AI 에 보내는 질문은 나갈 때 검사합니다. 돌아오는 답은 들어올 때 다시 검사합니다. 기준은 우리가 정합니다. 이 자료집은 그 가드레일을 설계하고 실증한 2026 직원 현장연구의 최종 발표를 담았습니다.</p>
  </div>
  <div class="bk-foot">
    <div><b>대학 행정환경을 고려한 생성형 AI 도입을 위한<br>보안 프레임워크 및 가드레일 실증 연구</b><br>AI 보안·거버넌스 현장연구회 — 이현재 · 임종호 · 강경덕</div>
    <img src="${logoBlack}" alt="KAIST">
  </div>
</section>`;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=Black+Han+Sans&family=Noto+Sans+KR:wght@300;400;600;700&display=block"><style>
@page { size: 182mm 257mm; margin: 0; }
* { box-sizing: border-box; }
html, body { word-break: keep-all; margin: 0; background: #fff; color: #1d1d1f; font-family: 'Noto Sans CJK KR', 'Noto Sans KR', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pg { width: 182mm; height: 257mm; position: relative; overflow: hidden; page-break-after: always; }
.outer { background: #05070a; color: #fff; }
.ng-img, .ng-img svg { position: absolute; inset: 0; width: 182mm; height: 257mm; display: block; }
.ng-frame { position: absolute; inset: 5.5mm; border: 3.6mm solid #f5d327; }
.ng-top { position: absolute; top: 14mm; left: 14.5mm; right: 14.5mm; display: flex; justify-content: space-between; font-size: 8pt; font-weight: 700; letter-spacing: .12em; color: #fff; }
.ng-mast { position: absolute; top: 20mm; left: 0; right: 0; margin: 0; text-align: center; font-family: 'Playfair Display', serif; font-weight: 900; font-size: 58pt; letter-spacing: -.005em; line-height: 1; color: #fff;
  text-shadow: 0 0 5mm rgba(95,245,200,.35); }
.ng-story { position: absolute; left: 14.5mm; right: 12mm; top: 180mm; }
.ng-pre { margin: 0; font-size: 11pt; font-weight: 600; color: #fff; letter-spacing: -.01em; display: flex; align-items: center; gap: 2.6mm; }
.ng-pre i { display: inline-block; width: 1.4mm; height: 4.8mm; background: #f5d327; }
.ng-head { margin: 4.5mm 0 0; font-family: 'Black Han Sans', 'Noto Sans KR', sans-serif; font-weight: 400; font-size: 47pt; line-height: 1.12; letter-spacing: .01em; color: #fff; }
.ng-head em { font-style: normal; color: #f5d327; }
.ng-sign { position: absolute; left: 14.5mm; right: 14.5mm; bottom: 13.5mm; display: flex; justify-content: space-between; align-items: center; }
.ng-sign .who { display: flex; align-items: center; gap: 3mm; font-size: 9pt; font-weight: 600; color: #fff; }
.ng-sign img { height: 6mm; width: auto; }
.ng-sign .yr { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 17pt; color: #f5d327; }
.back { background: #f5d327; color: #111; }
.ng-top.bk { color: #111; }
.bk-copy { position: absolute; left: 16mm; right: 16mm; top: 52mm; }
.bk-emblem { width: 30mm; height: auto; display: block; }
.bk-mark { margin: 9mm 0 0; font-family: 'Playfair Display', serif; font-weight: 900; font-size: 13pt; letter-spacing: .04em; }
.bk-lead { margin: 3mm 0 0; font-family: 'Black Han Sans', 'Noto Sans KR', sans-serif; font-size: 40pt; line-height: 1.15; color: #111; }
.bk-body { margin: 8mm 0 0; font-size: 9.6pt; line-height: 1.8; color: #2a2a2a; max-width: 112mm; }
.bk-foot { position: absolute; left: 16mm; right: 16mm; bottom: 15mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 7.6pt; line-height: 1.6; color: #333; border-top: .3mm solid #111; padding-top: 4mm; }
.bk-foot b { color: #111; font-weight: 700; }
.bk-foot img { height: 7mm; width: auto; }
.blank { background: #fff; }
.cover { padding: 24mm 18mm 18mm; display: flex; flex-direction: column; }
.c-kicker { margin: 0; font-size: 8.5pt; letter-spacing: .16em; color: #9a6408; font-weight: 600; }
.c-pre { margin: 9mm 0 0; font-size: 13pt; font-weight: 300; line-height: 1.45; color: #3c3c43; }
.c-title { margin: 3mm 0 0; font-size: 27pt; line-height: 1.18; font-weight: 700; letter-spacing: -.02em; }
.c-rule { width: 22mm; height: 1.2mm; background: #0d7a63; border-radius: 1mm; margin: 8mm 0 4mm; }
.c-art { width: 100%; margin: auto 0; }
.c-foot { display: flex; justify-content: space-between; align-items: flex-end; border-top: .3mm solid #d2d2d7; padding-top: 5mm; font-size: 8.5pt; line-height: 1.7; color: #3c3c43; }
.c-foot b { color: #1d1d1f; font-weight: 700; }
.c-meta { text-align: right; }
.c-logo { height: 6mm; width: auto; margin-top: 2mm; }
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
console.log('pages', 5 + Math.ceil(N / 2), await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).join(',')));
await b.close();
