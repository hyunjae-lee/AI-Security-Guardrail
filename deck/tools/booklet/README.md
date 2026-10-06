# 발표 자료집 (B5 책자 PDF)

덱을 종이 모드(`?paper`, 흰 바탕)로 열어 장마다 찍고, B5(182×257 mm) 책자로 엮는다.
겉표지(애플 제품 소개 페이지 문법 — 흰 갤러리 · 28px 카드 · 큰 제목 「AI GUARDRAIL」 · 표지 전용 그림 `hero.svg`(유리 게이트) · 해시태그 알약 · KAIST 로고) 1쪽 · 속표지(발표 표지) 1쪽 · 차례 1쪽 · 본문(한 쪽에 두 장). **쪽 번호는 본문 첫 쪽이 1** — 겉표지·속표지·차례에는 번호가 없다. 단계가 있는 장은 마지막 단계로 찍고,
확대 도면(`arch`·`paths`)만 전체 그림으로 찍는다.

```bash
cd deck && npm run build
mkdir -p /tmp/booklet/book && cp tools/booklet/*.mjs /tmp/booklet/ && cp tools/booklet/kaist.svg /tmp/booklet/book/ && mkdir -p /tmp/booklet/hero && cp tools/booklet/hero.svg /tmp/booklet/hero/
docker run --rm -v $PWD/dist:/dist -v /tmp/booklet:/w -w /w \
  mcr.microsoft.com/playwright:v1.55.0-noble sh -c "npm i -s playwright@1.55.0 >/dev/null; node shots.mjs && node book.mjs"
cp /tmp/booklet/book/booklet.pdf print/발표자료집-B5.pdf
```

결과물(`deck/print/*.pdf`)은 git 에 넣지 않는다. 내려받기용 사본은 `deck/public/guardrail-booklet-B5.pdf` → https://guardrail.kaist.ac.kr/guardrail-booklet-B5.pdf (파일 이름은 영문으로 — 한글 이름은 전송 중 깨진다).

로고 `kaist.svg` 는 위키미디어 공용 `File:KAIST_logo.svg`(KAIST 휘장)에서 받았다. 글꼴(Inter · Noto Sans KR)은 Google Fonts 에서 받으므로 만들 때 인터넷이 필요하다.
