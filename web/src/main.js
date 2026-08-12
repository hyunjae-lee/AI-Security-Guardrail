/**
 * 섹션 등록 + ScrollTrigger 초기화.
 *
 * 8개 장면을 strings.js 로부터 생성하고, 일러스트가 완성된 장면은 인라인 SVG 를,
 * 나머지는 자리표시자를 넣는다.  장면별 애니메이션(M3)은 각 scene 모듈이
 * `*Anim(root, gsap, ScrollTrigger)` 로 내보내고 여기서 붙인다.
 */

import './styles/main.css'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import MotionPathPlugin from 'gsap/MotionPathPlugin'

import { guideline, placeholderKicker, scenes, site } from './content/strings.js'
import { sceneWhyAnim, sceneWhySvg } from './scenes/scene-why.js'
import { scene2Anim, scene2Svg } from './scenes/scene2-overview.js'
import { scene3Anim, scene3Svg } from './scenes/scene3-departures.js'

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)

/** 일러스트가 완성된 장면. 나머지는 M4 에서 채운다. */
const STAGES = {
  why: sceneWhySvg,
  overview: scene2Svg,
  departures: scene3Svg,
}

/** 장면별 애니메이션. 없으면 정적으로 둔다. */
const ANIMS = {
  why: sceneWhyAnim,
  overview: scene2Anim,
  departures: scene3Anim,
}

const placeholder = (scene) => `
        <div class="placeholder">
          <span class="placeholder__label">${placeholderKicker}</span>
          <p class="placeholder__note">${scene.placeholder}</p>
        </div>`

/** 설계 근거 카드 — '왜 검사대인가' 장면에만 붙는다. */
const refsMarkup = () => `
        <aside class="scene__refs">
          <span class="scene__refs-kicker">${guideline.kicker}</span>
          <span class="scene__refs-source">${guideline.source}</span>
          <span class="scene__refs-caveat">${guideline.caveat}</span>
          <ol>
            ${guideline.items.map((item) => `<li>${item}</li>`).join('\n            ')}
          </ol>
          <p class="scene__refs-closing">${guideline.closing}</p>
        </aside>`

const sceneMarkup = (scene) => `
  <section class="scene" id="${scene.id}" aria-labelledby="${scene.id}-title">
    <div class="scene__inner">
      <header class="scene__head">
        <p class="scene__eyebrow">
          <span class="scene__num">SCENE ${scene.num}</span>
          <span class="scene__eyebrow-rule"></span>
          <span>${scene.label}</span>
        </p>
        <h2 class="scene__title" id="${scene.id}-title">${scene.title}</h2>
      </header>
      <div class="scene__stage">${
        STAGES[scene.id] ? STAGES[scene.id]() : placeholder(scene)
      }</div>
      <footer class="scene__foot">
        <p class="scene__caption">${scene.caption}</p>${
          scene.id === 'why' ? refsMarkup() : ''
        }${
          scene.cta
            ? `
        <a class="scene__cta" href="${scene.cta.href}" target="_blank" rel="noopener">${scene.cta.label}</a>`
            : ''
        }
      </footer>
    </div>
  </section>`

const chromeMarkup = () => `
  <div class="progress" aria-hidden="true"></div>
  <div class="topbar">
    <span class="topbar__mark">${site.title}</span>
    <span class="topbar__now" aria-live="polite">
      <b data-now-num>${scenes[0].num}</b> / ${String(scenes.length).padStart(2, '0')}
      &nbsp;<span data-now-label>${scenes[0].label}</span>
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
  </nav>`

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
      '.scene__eyebrow, .scene__title, .scene__stage, .scene__caption, .scene__refs, .scene__cta',
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

/* prefers-reduced-motion 이면 움직임 없이 완성된 정지 화면만 보여 준다.
   장면 애니메이션은 최종 상태가 아니라 '진행 중' 상태를 그리므로 아예 붙이지
   않고, SVG 는 그린 그대로가 곧 정지 상태다. */
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setupReveals()
  setupSceneAnims()
}
