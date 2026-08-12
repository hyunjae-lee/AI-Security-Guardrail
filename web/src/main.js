/**
 * 섹션 등록 + ScrollTrigger 초기화.
 *
 * 7개 장면을 strings.js 로부터 생성하고, 일러스트가 완성된 장면(SCENE 02·03)은
 * 인라인 SVG 를, 나머지는 자리표시자를 넣는다.  M3 에서 장면별 애니메이션 모듈이
 * 여기에 붙는다.
 */

import './styles/main.css'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

import { placeholderKicker, scenes, site } from './content/strings.js'
import { scene2Svg } from './scenes/scene2-overview.js'
import { scene3Svg } from './scenes/scene3-departures.js'

gsap.registerPlugin(ScrollTrigger)

/** 일러스트가 완성된 장면. 나머지는 M4 에서 채운다. */
const STAGES = {
  'scene-2': scene2Svg,
  'scene-3': scene3Svg,
}

const placeholder = (scene) => `
        <div class="placeholder">
          <span class="placeholder__label">${placeholderKicker}</span>
          <p class="placeholder__note">${scene.placeholder}</p>
        </div>`

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

/** 장면 진입 시 제목·캡션이 떠오르는 기본 트랜지션 (M3 에서 확장). */
function setupReveals() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return // 정적 상태 그대로 노출한다.

  scenes.forEach((scene) => {
    const section = document.querySelector(`#${scene.id}`)
    const targets = section.querySelectorAll(
      '.scene__eyebrow, .scene__title, .scene__stage, .scene__caption, .scene__cta',
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

render()
setupNav()
setupProgress()
setupReveals()
