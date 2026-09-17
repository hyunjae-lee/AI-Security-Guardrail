/**
 * 섹션 등록 + ScrollTrigger 초기화.
 *
 * 10개 장면을 strings.js 로부터 생성하고, 일러스트가 완성된 장면은 인라인 SVG 를,
 * 나머지는 자리표시자를 넣는다.  장면별 애니메이션(M3)은 각 scene 모듈이
 * `*Anim(root, gsap, ScrollTrigger)` 로 내보내고 여기서 붙인다.
 */

import './styles/main.css'
import n2sfCover from './assets/n2sf-cover.webp'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import MotionPathPlugin from 'gsap/MotionPathPlugin'

import {
  cases,
  casesLabel,
  casesNote,
  glue,
  guideline,
  headlines,
  latency,
  legend,
  placeholderKicker,
  revealLabel,
  reveals,
  scenes,
  site,
  summary,
} from './content/strings.js'
import { sceneIntroAnim, sceneIntroSvg } from './scenes/scene-intro.js'
import { sceneWhyAnim, sceneWhySvg } from './scenes/scene-why.js'
import { sceneBasisAnim, sceneBasisSvg } from './scenes/scene-basis.js'
import { scene2Anim, scene2Svg } from './scenes/scene2-overview.js'
import { scene3Anim, scene3Svg } from './scenes/scene3-departures.js'
import { sceneRunwayAnim, sceneRunwaySvg } from './scenes/scene-runway.js'
import { sceneArrivalsAnim, sceneArrivalsSvg } from './scenes/scene-arrivals.js'
import { sceneRecordsAnim, sceneRecordsSvg } from './scenes/scene-records.js'
import { sceneSharedAnim, sceneSharedSvg } from './scenes/scene-shared.js'
import { sceneOutroAnim, sceneOutroSvg } from './scenes/scene-outro.js'

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)

/* 카드뉴스 근거 화면 캡처. 파일 이름이 카드 id 라 정적 import 로는 못 묶고,
   Vite 의 글롭으로 한 번에 받아 해시 붙은 최종 경로를 얻는다. */
const SHOTS = import.meta.glob('./assets/captures/*.jpg', {
  eager: true,
  import: 'default',
})
const shotUrl = (id) => SHOTS[`./assets/captures/${id}.jpg`]

/** 10개 장면 전부 인라인 SVG. */
const STAGES = {
  intro: sceneIntroSvg,
  why: sceneWhySvg,
  basis: sceneBasisSvg,
  overview: scene2Svg,
  departures: scene3Svg,
  runway: sceneRunwaySvg,
  arrivals: sceneArrivalsSvg,
  records: sceneRecordsSvg,
  shared: sceneSharedSvg,
  outro: sceneOutroSvg,
}

/** 장면별 애니메이션. 없으면 정적으로 둔다. */
const ANIMS = {
  intro: sceneIntroAnim,
  why: sceneWhyAnim,
  basis: sceneBasisAnim,
  overview: scene2Anim,
  departures: scene3Anim,
  runway: sceneRunwayAnim,
  arrivals: sceneArrivalsAnim,
  records: sceneRecordsAnim,
  shared: sceneSharedAnim,
  outro: sceneOutroAnim,
}

const placeholder = (scene) => `
        <div class="placeholder">
          <span class="placeholder__label">${placeholderKicker}</span>
          <p class="placeholder__note">${glue(scene.placeholder)}</p>
        </div>`

/** 설계 근거 카드 — 원문 인용. '설계 근거' 장면에만 붙는다. */
const refsMarkup = () => `
        <aside class="scene__refs">
          <div class="scene__refs-head">
            <figure class="doc-cover">
              <img src="${n2sfCover}" width="840" height="1148" loading="lazy"
                   decoding="async" alt="${guideline.coverAlt}" />
              <figcaption>${guideline.coverCaption}</figcaption>
            </figure>
            <div class="scene__refs-id">
              <span class="scene__refs-kicker">${guideline.kicker}</span>
              <span class="scene__refs-source">${glue(guideline.source)}</span>
              <span class="scene__refs-meta">${guideline.sourceMeta}</span>
              <p class="scene__refs-note">${glue(guideline.quoteNote)}</p>
            </div>
          </div>
          <ol>
            ${guideline.items
              .map(
                (item) =>
                  `<li>
              <span class="scene__refs-code">${item.code}</span>
              <blockquote>${glue(item.quote)}</blockquote>
              <cite>${item.cite}</cite>
            </li>`,
              )
              .join('\n            ')}
          </ol>
          <p class="scene__refs-closing">${glue(guideline.finding)}</p>
        </aside>`

/** 실측 지연 카드 — 활주로 장면에만. 수치는 전부 실제 측정값이다. */
const latencyMarkup = () => `
        <aside class="latency">
          <span class="latency__kicker">${latency.kicker}</span>
          <h3 class="latency__title">${glue(latency.title)}</h3>
          <p class="latency__lead">${glue(latency.lead)}</p>
          <div class="latency__grid">
            <table class="latency__table">
              <thead><tr>${latency.cols
                .map((c, i) => `<th${i ? ' class="num"' : ''}>${c}</th>`)
                .join('')}</tr></thead>
              <tbody>${latency.rows
                .map(
                  ([what, med, max], i) =>
                    `<tr${i === latency.rows.length - 1 ? ' class="latency__total"' : ''}>` +
                    `<td>${glue(what)}</td><td class="num">${med}</td><td class="num">${max}</td></tr>`,
                )
                .join('')}</tbody>
            </table>
            <div class="latency__block">
              <h4>${glue(latency.compareLabel)}</h4>
              <ul class="latency__compare">${latency.compare
                .map(([what, v]) => `<li><span>${glue(what)}</span><b>${v}</b></li>`)
                .join('')}</ul>
              <p class="latency__note">${glue(latency.compareNote)}</p>
            </div>
            <div class="latency__block">
              <h4>${glue(latency.scaleLabel)}</h4>
              <p class="latency__note">${glue(latency.scale)}</p>
              <ul class="latency__compare">${latency.scaleRows
                .map(([what, v]) => `<li><span>${glue(what)}</span><b>${v}</b></li>`)
                .join('')}</ul>
            </div>
          </div>
          <details class="latency__method">
            <summary class="reveal__summary">${latency.methodLabel}</summary>
            <div class="reveal__body">${latency.method
              .map((m) => `<p>${glue(m)}</p>`)
              .join('')}</div>
          </details>
        </aside>`

/** "실제로는" 접이식 패널 — 비유 뒤의 실제 동작을 장면마다 병기한다. */
const revealMarkup = (scene) => {
  const body = reveals[scene.id]
  if (!body) return ''
  return `
        <details class="reveal">
          <summary class="reveal__summary">${revealLabel}</summary>
          <div class="reveal__body">
            ${body.map((para) => `<p>${glue(para)}</p>`).join('\n            ')}
          </div>
        </details>`
}

/** 비유 대조표 — 그림을 읽는 열쇠. 조감도에만 붙는다. */
const legendMarkup = () => `
        <details class="legend reveal">
          <summary class="reveal__summary">${legend.kicker} · ${legend.title}</summary>
          <div class="legend__body">
          <table class="legend__table">
            <thead>
              <tr><th>${legend.cols[0]}</th><th>${legend.cols[1]}</th></tr>
            </thead>
            <tbody>
              ${legend.rows
                .map(([real, meta]) => `<tr><td>${glue(real)}</td><td>${glue(meta)}</td></tr>`)
                .join('\n              ')}
            </tbody>
          </table>
          <p class="legend__note">${glue(legend.note)}</p>
          </div>
        </details>`

/** 발표 마무리 세 줄 정리 — 아웃트로에만 붙는다. */
const summaryMarkup = () => `
        <aside class="summary">
          <span class="summary__kicker">${summary.kicker}</span>
          <ol class="summary__list">
            ${summary.points
              .map(
                (p) =>
                  `<li><b>${glue(p.head)}</b><span>${glue(p.body)}</span></li>`,
              )
              .join('\n            ')}
          </ol>
        </aside>`

/** 판정 사례 — 실제 엔진 출력. 출국층 장면에만 붙는다. */
const casesMarkup = () => `
        <details class="cases reveal">
          <summary class="reveal__summary">${casesLabel}</summary>
          <div class="cases__body">
            <p class="cases__note">${glue(casesNote)}</p>
            <div class="cases__grid">
              ${cases
                .map(
                  (c) => `<article class="case case--${c.tone}">
                <header class="case__head">
                  <span class="case__verdict">${c.verdict}</span>
                  <span class="case__role">${c.role}</span>
                </header>
                <p class="case__prompt">${glue(c.prompt)}</p>
                <dl class="case__rows">
                  <dt>탐지</dt>
                  <dd><ul class="case__hits">${c.detected
                    .map(
                      ([what, sev, note]) =>
                        `<li><b>${glue(what)}</b><em>${sev}</em>${note ? `<span>${glue(note)}</span>` : ''}</li>`,
                    )
                    .join('')}</ul></dd>
                  <dt>판정</dt>
                  <dd>${glue(c.score)}</dd>
                  <dt>모델이 받은 것</dt>
                  <dd class="case__fwd">${c.forwarded}</dd>
                </dl>
                <p class="case__why">${glue(c.why)}</p>
              </article>`,
                )
                .join('\n              ')}
            </div>
          </div>
        </details>`

/* 카드뉴스 「지금 바깥에서 벌어지는 일」 — SCENE 01 에만 붙는다.
   인트로가 할 일은 설명이 아니라 공감이다. 남 얘기로 넘기기 전에, 이미 벌어진
   일을 출처와 함께 한 장씩 보여 준다. 그림은 글자 없이 도형만으로 그린다. */
const chevron = (dir) => `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="${dir === 'prev' ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'}" />
        </svg>`

const expandIcon = `
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
              </svg>`

/** 캡처를 크게 띄우는 팝업. 내용은 열 때 채운다 — 카드마다 판을 새로 만들지 않는다. */
const lightboxMarkup = () => `
  <dialog class="lightbox" data-hl-dialog aria-label="${headlines.openLabel}">
    <button class="lightbox__close" type="button" data-lb-close
            aria-label="${headlines.closeLabel}">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 6 L18 18 M18 6 L6 18" />
      </svg>
    </button>
    <div class="lightbox__body">
      <figure class="lightbox__figure">
        <div class="lightbox__frame">
          <img class="lightbox__img" data-lb-img alt="" />
          <span class="lightbox__mark" data-lb-mark></span>
        </div>
        <figcaption class="lightbox__note">
          <b>${headlines.noteLabel}</b> <span data-lb-note></span>
        </figcaption>
      </figure>
      <div class="lightbox__side">
        <span class="hcard__tag" data-lb-tag></span>
        <p class="lightbox__big" data-lb-big></p>
        <h4 class="lightbox__head" data-lb-head></h4>
        <p class="lightbox__text" data-lb-text></p>
        <div class="lightbox__meta">
          <a class="lightbox__source" data-lb-src target="_blank" rel="noopener"></a>
          <span class="lightbox__date" data-lb-date></span>
        </div>
        <div class="lightbox__pager">
          <span class="headlines__count"><b data-lb-now>1</b> / ${headlines.cards.length}</span>
          <button class="headlines__nav" type="button" data-lb-prev
                  aria-label="${headlines.prevLabel}">${chevron('prev')}</button>
          <button class="headlines__nav" type="button" data-lb-next
                  aria-label="${headlines.nextLabel}">${chevron('next')}</button>
        </div>
      </div>
    </div>
  </dialog>`

const headlineCard = (card, i) => `
        <li class="hcard hcard--${card.tone}" data-hl-card aria-label="${i + 1} / ${headlines.cards.length}">
          <figure class="hcard__fig">
            <button class="hcard__zoom" type="button" data-hl-open="${i}"
                    aria-label="${headlines.openLabel} — ${card.head}">
              <img class="hcard__shot" src="${shotUrl(card.shot)}" alt="${card.alt}"
                   width="800" height="450" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" />
              <span class="hcard__stamp">${headlines.shotLabel}</span>
              <span class="hcard__expand" aria-hidden="true">${expandIcon}</span>
            </button>
          </figure>
          <div class="hcard__body">
            <span class="hcard__tag">${card.tag}</span>
            <p class="hcard__big">${glue(card.big)}</p>
            <h4 class="hcard__head">${glue(card.head)}</h4>
            <p class="hcard__text">${glue(card.body)}</p>
          </div>
          <footer class="hcard__foot">
            <a class="hcard__source" href="${card.url}" target="_blank" rel="noopener">${card.source}</a>
            <span class="hcard__date">${card.date}</span>
          </footer>
        </li>`

const headlinesMarkup = () => `
      <aside class="headlines" aria-label="${headlines.navLabel}">
        <div class="headlines__bar">
          <span class="headlines__count" aria-live="polite">
            <b data-hl-now>1</b> / ${headlines.cards.length}
          </span>
          <button class="headlines__nav" type="button" data-hl-prev
                  aria-label="${headlines.prevLabel}" disabled>${chevron('prev')}</button>
          <button class="headlines__nav" type="button" data-hl-next
                  aria-label="${headlines.nextLabel}">${chevron('next')}</button>
        </div>
        <ol class="headlines__track" data-hl-track tabindex="0"
            aria-label="${headlines.navLabel}">
          ${headlines.cards.map(headlineCard).join('\n          ')}
        </ol>
        <p class="headlines__closing">${glue(headlines.closing)}</p>
      </aside>`

/* 타일 톤 — 밝은 타일과 어두운 타일이 번갈아 오고, 색이 바뀌는 것 자체가
   장면 사이의 구분선이 된다 (테두리를 긋지 않는 이유).
   어두운 타일은 두 장뿐이고 둘 다 내용이 그것을 요구한다:
   활주로(06)는 국경 밖이라 우리 관제가 닿지 않고, 아웃트로(10)는 터미널이
   지표 아래로 내려가며 끝난다. */
const TILE = {
  intro: '',
  why: 'scene--parchment',
  basis: '',
  overview: 'scene--parchment',
  departures: '',
  runway: 'scene--dark',
  arrivals: 'scene--parchment',
  records: '',
  shared: 'scene--parchment',
  outro: 'scene--dark scene--dark-deep',
}

/* 제목은 줄마다 따로 떠오른다 — 애플이 헤드라인을 다루는 방식이다.
   줄 나눔 위치는 strings.js 의 개행(\n)이 정하고, 여기서는 그 단위로만 감싼다. */
const titleLines = (title) =>
  glue(title)
    .split('\n')
    .map(
      (line) =>
        `<span class="scene__title-line"><span class="scene__title-inner">${line}</span></span>`,
    )
    .join('<br>')

const sceneMarkup = (scene) => `
  <section class="scene${TILE[scene.id] ? ` ${TILE[scene.id]}` : ''}" id="${scene.id}" aria-labelledby="${scene.id}-title">
    <div class="scene__inner">
      <header class="scene__head">
        <p class="scene__eyebrow">
          <span class="scene__num">SCENE ${scene.num}</span>
          <span class="scene__eyebrow-rule"></span>
          <span>${scene.label}</span>
        </p>
        <h2 class="scene__title" id="${scene.id}-title">${titleLines(scene.title)}</h2>${
          scene.id === 'intro' ? headlinesMarkup() : ''
        }${
          scene.lead
            ? `
        <div class="scene__lead">
          ${scene.lead.map((para) => `<p>${glue(para)}</p>`).join('\n          ')}
        </div>`
            : ''
        }
      </header>
      <div class="scene__stage">${
        STAGES[scene.id] ? STAGES[scene.id]() : placeholder(scene)
      }</div>
      <footer class="scene__foot">
        <div class="scene__foot-main">
          <p class="scene__caption">${glue(scene.caption)}</p>${revealMarkup(scene)}
        </div>${
          scene.id === 'overview' ? legendMarkup() : ''
        }${scene.id === 'outro' ? summaryMarkup() : ''}${
          scene.cta
            ? `
        <a class="scene__cta" href="${scene.cta.href}" target="_blank" rel="noopener">${scene.cta.label}</a>`
            : ''
        }
      </footer>${scene.id === 'basis' ? refsMarkup() : ''}${
        scene.id === 'runway' ? latencyMarkup() : ''
      }${
        scene.id === 'departures' ? casesMarkup() : ''
      }
    </div>
  </section>`

/* ---------------------------------------------------------------- 모션 설정

   OS/브라우저의 '동작 줄이기' 를 기본값으로 존중하되, 그것이 최종 결정이 되지는
   않게 한다. 전에 이 화면의 애니메이션이 통째로 사라진 것처럼 보인 원인이 이
   설정이었고, 화면 어디에도 그 사실이 드러나지 않아 사이트가 고장 난 것으로
   보였다. 이제 사용자가 이 사이트에 한해 켜고 끌 수 있고, 꺼져 있는 이유도
   화면에 남는다. 선택은 localStorage 에 남아 다음 방문까지 간다. */
const MOTION_KEY = 'digital-border:motion'

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const storedMotion = () => {
  try {
    return localStorage.getItem(MOTION_KEY)
  } catch {
    return null // 사생활 보호 모드 등에서 localStorage 가 막힌 경우
  }
}

/** 사용자가 이 사이트에서 직접 고른 값이 OS 설정보다 우선한다. */
const stored = storedMotion()
const motionOn = stored ? stored === 'on' : !prefersReducedMotion()

document.documentElement.dataset.motion = motionOn ? 'on' : 'off'

function setMotion(on) {
  try {
    localStorage.setItem(MOTION_KEY, on ? 'on' : 'off')
  } catch {
    /* 저장이 막혀 있어도 이번 세션에는 아래 reload 로 적용된다 */
  }
  // 애니메이션은 페이지 진입 시점에 ScrollTrigger 로 엮이므로, 중간에 떼었다
  // 붙이는 것보다 다시 그리는 편이 상태가 어긋날 여지가 없다.
  window.location.reload()
}

const chromeMarkup = () => `
  <div class="progress" aria-hidden="true"></div>
  <div class="topbar">
    <span class="topbar__mark">${site.title}</span>
    <span class="topbar__right">
      <span class="topbar__now" aria-live="polite">
        <b data-now-num>${scenes[0].num}</b> / ${String(scenes.length).padStart(2, '0')}
        &nbsp;<span data-now-label>${scenes[0].label}</span>
      </span>
      <button class="motion-toggle" type="button" data-motion-toggle aria-pressed="${motionOn}">
        ${site.motionLabel} <b>${motionOn ? site.motionOn : site.motionOff}</b>
      </button>
    </span>
  </div>
  <nav class="dotnav" aria-label="${site.navLabel}">
    <ul class="dotnav__list">
      ${scenes
        .map(
          (scene) => `<li>
        <a class="dotnav__link" href="#${scene.id}" data-target="${scene.id}"
           aria-label="SCENE ${scene.num} ${scene.label}">
          <span class="dotnav__name" aria-hidden="true">${scene.label}</span>
          <span class="dotnav__tick" aria-hidden="true"></span>
        </a>
      </li>`,
        )
        .join('\n      ')}
    </ul>
  </nav>
  ${
    motionOn || stored
      ? ''
      : `<div class="motion-notice" role="status">
    <p class="motion-notice__text">${site.motionNotice}</p>
    <button class="motion-notice__go" type="button" data-motion-on>${site.motionNoticeAction}</button>
    <button class="motion-notice__close" type="button" data-motion-dismiss>${site.motionNoticeDismiss}</button>
  </div>`
  }`

/** 상단 토글과 안내 배너를 같은 설정에 묶는다. */
function setupMotionToggle() {
  document
    .querySelector('[data-motion-toggle]')
    .addEventListener('click', () => setMotion(!motionOn))

  document.querySelector('[data-motion-on]')?.addEventListener('click', () => setMotion(true))

  document.querySelector('[data-motion-dismiss]')?.addEventListener('click', (e) => {
    // 안내만 닫는다 — 모션은 계속 꺼진 채로 두되, 다시 묻지는 않는다.
    setMotionPreferenceQuietly()
    e.currentTarget.closest('.motion-notice').remove()
  })
}

function setMotionPreferenceQuietly() {
  try {
    localStorage.setItem(MOTION_KEY, 'off')
  } catch {
    /* 저장이 막혀 있으면 다음 방문에 다시 안내한다 — 그래도 동작에는 문제가 없다 */
  }
}

function render() {
  document.querySelector('#app').innerHTML = scenes.map(sceneMarkup).join('\n')
  document.body.insertAdjacentHTML('beforeend', chromeMarkup())
  document.body.insertAdjacentHTML('beforeend', lightboxMarkup())
}

/** 현재 장면을 우측 레일과 상단 바에 동시에 반영. */
function setupNav() {
  const links = [...document.querySelectorAll('.dotnav__link')]
  const nowNum = document.querySelector('[data-now-num]')
  const nowLabel = document.querySelector('[data-now-label]')

  const activate = (scene) => {
    links.forEach((link) => {
      if (link.dataset.target === scene.id) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    })
    nowNum.textContent = scene.num
    nowLabel.textContent = scene.label
  }

  scenes.forEach((scene) => {
    ScrollTrigger.create({
      trigger: `#${scene.id}`,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => self.isActive && activate(scene),
    })
  })

  activate(scenes[0])
}

/** 전체 스크롤 진행선. */
function setupProgress() {
  gsap.to('.progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.25,
    },
  })
}

/* ---------------------------------------------------------------- 모션

   애플의 스크롤 연출은 세 가지뿐이다.  더 넣지 말 것 — 지면이 물러나야
   도면이 말한다.

   1. 올라오며 나타나기  : 28px 아래에서 부드럽게 올라오고, 형제끼리 조금씩 늦는다.
   2. 제목은 줄 단위     : 헤드라인이 한 줄씩 차례로 선다.
   3. 도면은 천천히 흐른다: 타일보다 느리게 움직여 '뒤에 놓인 것' 으로 읽힌다.

   이징은 전부 power3.out — 애플의 cubic-bezier(.28,.11,.32,1) 에 가장 가깝고
   GSAP 무료 범위 안에 있다. */

const EASE = 'power3.out'

/** 장면 진입 시 제목·캡션이 떠오르는 기본 트랜지션. */
function setupReveals() {
  scenes.forEach((scene) => {
    const section = document.querySelector(`#${scene.id}`)

    // 1) 제목은 줄마다 차례로 선다.
    const lines = section.querySelectorAll('.scene__title-inner')
    if (lines.length) {
      gsap.from(lines, {
        yPercent: 100,
        opacity: 0,
        duration: 1,
        ease: EASE,
        stagger: 0.09,
        scrollTrigger: { trigger: section, start: 'top 78%', once: true },
      })
    }

    // 2) 나머지 덩어리는 아래에서 올라온다.
    const targets = section.querySelectorAll(
      '.scene__eyebrow, .scene__lead, .scene__caption, .reveal, .scene__refs, .legend, .cases, .headlines, .summary, .scene__cta',
    )
    if (targets.length) {
      gsap.from(targets, {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: EASE,
        stagger: 0.08,
        scrollTrigger: { trigger: section, start: 'top 72%', once: true },
      })
    }

    // 3) 도면은 제품이다 — 살짝 작게 시작해 제자리로 앉는다.
    const stage = section.querySelector('.scene__stage svg')
    if (stage) {
      gsap.from(stage, {
        y: 36,
        scale: 0.972,
        opacity: 0,
        transformOrigin: '50% 60%',
        duration: 1.1,
        ease: EASE,
        scrollTrigger: { trigger: section, start: 'top 70%', once: true },
      })
    }
  })
}

/** 도면이 타일보다 느리게 흐른다 — 얕은 시차. 과하면 도면 글씨가 흔들려 읽힌다. */
function setupParallax() {
  if (window.matchMedia('(max-width: 834px)').matches) return
  scenes.forEach((scene) => {
    const stage = document.querySelector(`#${scene.id} .scene__stage`)
    if (!stage) return
    gsap.fromTo(
      stage,
      { y: 22 },
      {
        y: -22,
        ease: 'none',
        scrollTrigger: {
          trigger: `#${scene.id}`,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      },
    )
  })
}

/** 카드뉴스 — 가로로 스크롤해 들어오는 카드가 차례로 선다. */
function setupCardReveal() {
  const cards = document.querySelectorAll('[data-hl-card]')
  if (!cards.length) return
  gsap.from(cards, {
    y: 34,
    opacity: 0,
    duration: 0.85,
    ease: EASE,
    stagger: 0.07,
    scrollTrigger: { trigger: '[data-hl-track]', start: 'top 85%', once: true },
  })
}

/** 장면별 M3 애니메이션 부착. */
function setupSceneAnims() {
  Object.entries(ANIMS).forEach(([id, anim]) => {
    const svg = document.querySelector(`#${id} .scene__stage svg`)
    if (svg) anim(svg, gsap, ScrollTrigger)
  })
}


/** 카드뉴스 캐러셀 — 좌우 버튼 · 키보드 · 스크롤 위치 동기화.
 *  이동은 네이티브 스크롤에 맡기고(스냅은 CSS), 여기서는 어디까지 왔는지만
 *  맞춘다. 모션이 꺼져 있으면 부드러운 스크롤 대신 즉시 이동한다. */
function setupHeadlines() {
  const track = document.querySelector('[data-hl-track]')
  if (!track) return

  const cards = [...track.querySelectorAll('[data-hl-card]')]
  const prev = document.querySelector('[data-hl-prev]')
  const next = document.querySelector('[data-hl-next]')
  const now = document.querySelector('[data-hl-now]')
  const behavior = motionOn ? 'smooth' : 'auto'

  /** 트랙 왼쪽 끝에 가장 가까운 카드 = 지금 보고 있는 카드. */
  const currentIndex = () => {
    const left = track.scrollLeft
    let best = 0
    let gap = Infinity
    cards.forEach((card, i) => {
      const d = Math.abs(card.offsetLeft - track.offsetLeft - left)
      if (d < gap) {
        gap = d
        best = i
      }
    })
    return best
  }

  const go = (i) => {
    const card = cards[Math.max(0, Math.min(cards.length - 1, i))]
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior })
  }

  const sync = () => {
    const i = currentIndex()
    now.textContent = String(i + 1)
    // 소수점 오차로 끝에서 버튼이 살아 있는 일이 없게 1px 여유를 둔다.
    prev.disabled = track.scrollLeft <= 1
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1
  }

  prev.addEventListener('click', () => go(currentIndex() - 1))
  next.addEventListener('click', () => go(currentIndex() + 1))

  let ticking = false
  track.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      sync()
      ticking = false
    })
  })

  window.addEventListener('resize', sync)
  sync()
}

/** 캡처 팝업 — 카드 그림을 누르면 원문 화면을 크게 띄우고, 어디를 봐야 하는지
 *  네모로 짚어 준다. 옆에는 같은 설명을 싣되 핵심 구절만 형광펜으로 남긴다.
 *  <dialog> 를 쓰므로 ESC 닫기와 초점 가두기는 브라우저가 해 준다. */
function setupLightbox() {
  const dialog = document.querySelector('[data-hl-dialog]')
  if (!dialog) return

  const el = (sel) => dialog.querySelector(sel)
  const img = el('[data-lb-img]')
  const mark = el('[data-lb-mark]')
  const parts = {
    note: el('[data-lb-note]'),
    tag: el('[data-lb-tag]'),
    big: el('[data-lb-big]'),
    head: el('[data-lb-head]'),
    text: el('[data-lb-text]'),
    src: el('[data-lb-src]'),
    date: el('[data-lb-date]'),
    now: el('[data-lb-now]'),
  }
  let at = 0

  const show = (i) => {
    at = (i + headlines.cards.length) % headlines.cards.length
    const card = headlines.cards[at]
    dialog.dataset.tone = card.tone
    img.src = shotUrl(card.shot)
    img.alt = card.alt
    mark.style.left = `${card.mark.x}%`
    mark.style.top = `${card.mark.y}%`
    mark.style.width = `${card.mark.w}%`
    mark.style.height = `${card.mark.h}%`
    parts.note.textContent = card.note
    parts.tag.textContent = card.tag
    parts.big.textContent = card.big
    parts.head.textContent = card.head
    parts.text.innerHTML = glue(card.detail)
    parts.src.textContent = card.source
    parts.src.href = card.url
    parts.date.textContent = card.date
    parts.now.textContent = String(at + 1)
  }

  const open = (i) => {
    show(i)
    dialog.showModal()
  }

  document.querySelectorAll('[data-hl-open]').forEach((btn) => {
    btn.addEventListener('click', () => open(Number(btn.dataset.hlOpen)))
  })

  el('[data-lb-close]').addEventListener('click', () => dialog.close())
  el('[data-lb-prev]').addEventListener('click', () => show(at - 1))
  el('[data-lb-next]').addEventListener('click', () => show(at + 1))

  // 판 바깥(배경)을 누르면 닫는다.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close()
  })

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(at + 1)
    if (e.key === 'ArrowLeft') show(at - 1)
  })
}

render()
setupNav()
setupHeadlines()
setupLightbox()
setupProgress()
setupMotionToggle()

/* 모션이 꺼진 화면은 움직임 없이 완성된 정지 화면이 된다. 장면 애니메이션은
   최종 상태가 아니라 '진행 중' 상태를 그리므로 아예 붙이지 않고, SVG 는 그린
   그대로가 곧 정지 상태다. */
if (motionOn) {
  setupReveals()
  setupCardReveal()
  setupParallax()
  setupSceneAnims()
}
