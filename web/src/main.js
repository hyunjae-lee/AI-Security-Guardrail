/**
 * 섹션 등록 + ScrollTrigger 초기화.
 *
 * 10개 장면을 strings.js 로부터 생성하고, 일러스트가 완성된 장면은 인라인 SVG 를,
 * 나머지는 자리표시자를 넣는다.  장면별 애니메이션(M3)은 각 scene 모듈이
 * `*Anim(root, gsap, ScrollTrigger)` 로 내보내고 여기서 붙인다.
 */

import './styles/main.css'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import MotionPathPlugin from 'gsap/MotionPathPlugin'

import {
  cases,
  casesLabel,
  casesNote,
  glue,
  guideline,
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
          <span class="scene__refs-kicker">${guideline.kicker}</span>
          <span class="scene__refs-source">${glue(guideline.source)}</span>
          <span class="scene__refs-meta">${guideline.sourceMeta}</span>
          <p class="scene__refs-note">${glue(guideline.quoteNote)}</p>
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

const sceneMarkup = (scene) => `
  <section class="scene" id="${scene.id}" aria-labelledby="${scene.id}-title">
    <div class="scene__inner">
      <header class="scene__head">
        <p class="scene__eyebrow">
          <span class="scene__num">SCENE ${scene.num}</span>
          <span class="scene__eyebrow-rule"></span>
          <span>${scene.label}</span>
        </p>
        <h2 class="scene__title" id="${scene.id}-title">${glue(scene.title).replace(/\n/g, '<br>')}</h2>${
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

/** 장면 진입 시 제목·캡션이 떠오르는 기본 트랜지션. */
function setupReveals() {
  scenes.forEach((scene) => {
    const section = document.querySelector(`#${scene.id}`)
    const targets = section.querySelectorAll(
      '.scene__eyebrow, .scene__title, .scene__lead, .scene__stage, .scene__caption, .reveal, .scene__refs, .legend, .cases, .summary, .scene__cta',
    )

    gsap.from(targets, {
      y: 24,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.1,
      scrollTrigger: {
        trigger: section,
        start: 'top 72%',
        once: true,
      },
    })
  })
}

/** 장면별 M3 애니메이션 부착. */
function setupSceneAnims() {
  Object.entries(ANIMS).forEach(([id, anim]) => {
    const svg = document.querySelector(`#${id} .scene__stage svg`)
    if (svg) anim(svg, gsap, ScrollTrigger)
  })
}

render()
setupNav()
setupProgress()
setupMotionToggle()

/* 모션이 꺼진 화면은 움직임 없이 완성된 정지 화면이 된다. 장면 애니메이션은
   최종 상태가 아니라 '진행 중' 상태를 그리므로 아예 붙이지 않고, SVG 는 그린
   그대로가 곧 정지 상태다. */
if (motionOn) {
  setupReveals()
  setupSceneAnims()
}
