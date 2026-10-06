# 발표 자료집 (B5 책자 PDF)

덱을 종이 모드(`?paper`, 흰 바탕)로 열어 장마다 찍고, B5(182×257 mm) 책자로 엮는다.
겉표지(국경 하나 · 검사대 하나 · 질의 세 줄의 단순한 그림) 1쪽 · 속표지(발표 표지) 1쪽 · 차례 1쪽 · 본문(한 쪽에 두 장). 단계가 있는 장은 마지막 단계로 찍고,
확대 도면(`arch`·`paths`)만 전체 그림으로 찍는다.

```bash
cd deck && npm run build
mkdir -p /tmp/booklet/book && cp tools/booklet/*.mjs /tmp/booklet/
docker run --rm -v $PWD/dist:/dist -v /tmp/booklet:/w -w /w \
  mcr.microsoft.com/playwright:v1.55.0-noble sh -c "npm i -s playwright@1.55.0 >/dev/null; node shots.mjs && node book.mjs"
cp /tmp/booklet/book/booklet.pdf print/발표자료집-B5.pdf
```

결과물(`deck/print/*.pdf`)은 git 에 넣지 않는다. 내려받기용 사본은 `deck/public/guardrail-booklet-B5.pdf` → https://guardrail.kaist.ac.kr/guardrail-booklet-B5.pdf (파일 이름은 영문으로 — 한글 이름은 전송 중 깨진다).
