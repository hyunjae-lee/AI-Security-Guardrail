# 발표 자료집 (B5 책자 PDF)

덱을 종이 모드(`?paper`, 흰 바탕)로 열어 장마다 찍고, B5(182×257 mm) 책자로 엮는다.
겉표지(내셔널지오그래픽 한국판 톤 — 노란 테두리 · 어둠 속 빛나는 게이트 장면 · 제호 「AI GUARDRAIL」 · 제목을 게이트 앞 바닥에 세워 그림과 한 장면으로) 1쪽 · 속표지(발표 표지) 1쪽 · 차례 1쪽 · 본문(한 쪽에 두 장) · 면지(빈 쪽) 1쪽 · 뒤표지 1쪽 = 28쪽(중철 4의 배수). 뒤표지와 앞표지는 펼치면 빛 궤적이 책등을 건너 이어진다. **쪽 번호는 본문 첫 쪽이 1** — 겉표지·속표지·차례에는 번호가 없다. 단계가 있는 장은 마지막 단계로 찍고,
확대 도면(`arch`·`paths`)만 전체 그림으로 찍는다.

```bash
cd deck && npm run build
mkdir -p /tmp/booklet/book && cp tools/booklet/*.mjs /tmp/booklet/ && cp tools/booklet/kaist-w.png tools/booklet/kaist-b.png /tmp/booklet/book/ && mkdir -p /tmp/booklet/hero && cp tools/booklet/ng.svg tools/booklet/ngback.svg /tmp/booklet/hero/
docker run --rm -v $PWD/dist:/dist -v /tmp/booklet:/w -w /w \
  mcr.microsoft.com/playwright:v1.55.0-noble sh -c "npm i -s playwright@1.55.0 >/dev/null; node shots.mjs && node book.mjs"
cp /tmp/booklet/book/booklet.pdf print/발표자료집-B5.pdf
```

결과물(`deck/print/*.pdf`)은 git 에 넣지 않는다. 내려받기용 사본은 `deck/public/guardrail-booklet-B5.pdf` → https://guardrail.kaist.ac.kr/guardrail-booklet-B5.pdf (파일 이름은 영문으로 — 한글 이름은 전송 중 깨진다).

로고는 KAIST 공식 로고(`deck/print/KAIST_logo_trans(Single-Color)4000pix.png`, 2026-10-06 수령)에서 만들었다 — `kaist-b.png`(원래 색, 속표지) · `kaist-w.png`(흰색, 앞·뒤표지). 글꼴(Playfair Display · Black Han Sans · Noto Sans KR)은 Google Fonts 에서 받으므로 만들 때 인터넷이 필요하다.

표지 장면을 고치려면 `python3 tools/booklet/gen2.py` (시안 `deck/print/intropage.png` 기준) (ng.svg · ngback.svg 를 함께 만든다 — 앞표지 왼쪽 끝 높이와 뒤표지 오른쪽 끝 높이가 `L` 의 같은 값을 쓴다).
