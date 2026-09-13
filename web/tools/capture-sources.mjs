/**
 * 카드뉴스 근거 화면 캡처 (SCENE 01).
 *
 * 사이트에 싣는 캡처는 전부 이 스크립트로 다시 만들 수 있어야 한다 — 어떤 주소의
 * 무엇을 찍었는지가 코드에 남아야 나중에 출처를 검증하거나 갱신할 수 있기 때문이다.
 * 공식 발표·법령·정부 브리핑 페이지를 우선으로 하고, 쿠키 배너·광고·상담 위젯처럼
 * 원문과 무관한 오버레이는 찍기 전에 걷어낸다.
 *
 *   node tools/capture-sources.mjs            전부 다시 찍기
 *   node tools/capture-sources.mjs eu ibm     지정한 것만
 *
 * 결과: src/assets/captures/<id>.png  (뒤에 sips 로 축소·JPEG 변환)
 */

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = '/Applications/Google Chrome 4.app/Contents/MacOS/Google Chrome'
const PORT = 9222
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

/** 캡처 프레임 — 카드 그림 자리의 비율(16:9)과 같게 잡는다. */
const W = 1200
const H = 675

/** 어느 사이트에나 있는 방해물. 페이지별 hide 는 여기에 더해서 쓴다. */
const COMMON_HIDE = [
  '[id*="cookie" i]',
  '[class*="cookie" i]',
  '[id*="consent" i]',
  '[class*="consent" i]',
  '[class*="onetrust" i]',
  '#onetrust-banner-sdk',
  '[aria-label*="cookie" i]',
  '[class*="newsletter" i]',
  'ins.adsbygoogle',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
]

const SOURCES = [
  {
    id: 'samsung',
    url: 'https://www.theregister.com/2023/04/06/samsung_reportedly_leaked_its_own/',
    focus: 'h1',
    hide: ['#top-nav-bar', '.dfp-ad', '#ad-mpu-top', '[class*="advert" i]'],
    offset: 90,
  },
  {
    id: 'indexed',
    url: 'https://techcrunch.com/2025/07/31/your-public-chatgpt-queries-are-getting-indexed-by-google-and-other-search-engines/',
    focus: 'h1',
    hide: ['.ad-unit', '[class*="marfeel" i]', '[class*="promo" i]', 'header nav'],
    offset: 110,
  },
  {
    id: 'echoleak',
    // arXiv 초록 페이지 — 정적이라 깨끗하고, 제목에 zero-click 이 그대로 박혀 있다.
    url: 'https://arxiv.org/abs/2509.10540',
    focus: 'h1.title, h1',
    offset: 60,
    zoom: 1.7,
  },
  {
    id: 'deepfake',
    url: 'https://www.cnn.com/2024/05/16/tech/arup-deepfake-scam-loss-hong-kong-intl-hnk',
    focus: 'h1',
    hide: ['[class*="ad-" i]', '[data-editable="header"] nav', '[class*="video-player" i]'],
    offset: 110,
  },
  {
    id: 'terms',
    url: 'https://www.anthropic.com/news/updates-to-our-consumer-terms',
    focus: 'h1',
    offset: 150,
  },
  {
    id: 'court',
    url: 'https://openai.com/index/response-to-nyt-data-demands/',
    focus: 'h1',
    offset: 150,
  },
  {
    id: 'stealer',
    url: 'https://www.ibm.com/reports/threat-intelligence',
    // 지역 안내 모달·상담 위젯이 히어로를 덮는다.
    focus: 'h1',
    hide: [
      '[role="dialog"]',
      '[class*="modal" i]',
      '[class*="locale" i]',
      '[class*="country" i]',
      '[class*="watson" i]',
      '[id*="watson" i]',
      '[class*="chat" i]',
      '[class*="widget" i]',
    ],
    offset: 110,
  },
  {
    id: 'shadow',
    url: 'https://www.theregister.com/ai-ml/2026/05/27/bosses-blinded-by-confidence-about-shadow-ai-use-by-workers/5247275',
    focus: 'h1',
    hide: ['#top-nav-bar', '.dfp-ad', '#ad-mpu-top', '[class*="advert" i]'],
    offset: 90,
  },
]

/* ------------------------------------------------------------------ CDP */

const rpc = (ws) => {
  let id = 0
  const waiting = new Map()
  const events = new Map()
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id)
      waiting.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    } else if (msg.method && events.has(msg.method)) {
      events.get(msg.method).forEach((fn) => fn(msg.params))
      events.delete(msg.method)
    }
  })
  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const n = ++id
        waiting.set(n, { resolve, reject })
        ws.send(JSON.stringify({ id: n, method, params }))
      }),
    once: (method) =>
      new Promise((resolve) => {
        if (!events.has(method)) events.set(method, [])
        events.get(method).push(resolve)
      }),
  }
}

const openSocket = (url) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.addEventListener('open', () => resolve(ws))
    ws.addEventListener('error', reject)
  })

/** 페이지에서 실행 — 오버레이를 걷고, 기준 요소를 화면 위쪽에 맞춘다. */
const CLEANUP = (hide, focus, offset) => `
  (() => {
    ${JSON.stringify(hide)}.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        // 본문을 통째로 감싸는 컨테이너까지 지우지 않도록 큰 요소는 건너뛴다.
        const r = el.getBoundingClientRect()
        if (r.width > innerWidth * 0.95 && r.height > innerHeight * 0.8) return
        el.style.setProperty('display', 'none', 'important')
      })
    })
    // 화면에 붙어 따라다니는 것(고정 헤더·배너·챗)은 위치로 잡아낸다.
    document.querySelectorAll('body *').forEach((el) => {
      const pos = getComputedStyle(el).position
      if (pos !== 'fixed' && pos !== 'sticky') return
      const r = el.getBoundingClientRect()
      if (r.height > innerHeight * 0.9) return
      el.style.setProperty('display', 'none', 'important')
    })
    const el = document.querySelector(${JSON.stringify(focus)})
    if (el) {
      const y = el.getBoundingClientRect().top + scrollY - ${offset}
      scrollTo(0, Math.max(0, y))
    }
    return document.title
  })()`

async function capture(page, source, outDir) {
  const ws = await openSocket(page.webSocketDebuggerUrl)
  const { send, once } = rpc(ws)

  await send('Page.enable')
  await send('Runtime.enable')
  // zoom 은 '같은 프레임에 더 크게' 담기 위한 것이다. 뷰포트를 줄이고 배율을
  // 그만큼 올리면 결과 이미지 크기는 같은데 글자만 커진다 — arXiv 처럼 본문
  // 글씨가 작은 페이지가 카드 크기로 줄었을 때 안 읽히는 것을 막는다.
  const zoom = source.zoom || 1
  await send('Emulation.setDeviceMetricsOverride', {
    width: Math.round(W / zoom),
    height: Math.round(H / zoom),
    deviceScaleFactor: 2 * zoom,
    mobile: false,
  })
  await send('Network.setUserAgentOverride', { userAgent: UA })

  const loaded = once('Page.loadEventFired')
  await send('Page.navigate', { url: source.url })
  await Promise.race([loaded, sleep(20000)])
  await sleep(3500) // 지연 로드되는 이미지·폰트

  const hide = [...COMMON_HIDE, ...(source.hide || [])]
  const { result } = await send('Runtime.evaluate', {
    expression: CLEANUP(hide, source.focus, source.offset),
    returnByValue: true,
  })
  await sleep(600)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(`${outDir}/${source.id}.png`, Buffer.from(shot.data, 'base64'))
  ws.close()
  return result?.value || ''
}

/* ----------------------------------------------------------------- main */

const only = process.argv.slice(2)
const targets = only.length ? SOURCES.filter((s) => only.includes(s.id)) : SOURCES
const outDir = new URL('../src/assets/captures/', import.meta.url).pathname
await mkdir(outDir, { recursive: true })

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  `--user-agent=${UA}`,
  'about:blank',
])
chrome.stderr.on('data', () => {})

await sleep(2500)

for (const source of targets) {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
  const page = await res.json()
  try {
    const title = await capture(page, source, outDir)
    console.log(`✓ ${source.id.padEnd(9)} ${title.slice(0, 58)}`)
  } catch (err) {
    console.log(`✗ ${source.id.padEnd(9)} ${err.message}`)
  }
  await fetch(`http://127.0.0.1:${PORT}/json/close/${page.id}`)
}

chrome.kill()
console.log(`\n→ ${outDir}`)
