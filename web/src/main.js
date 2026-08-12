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
      <p class="scene__eyebrow">SCENE ${scene.num} · ${scene.label}</p>
      <h2 class="scene__title" id="${scene.id}-title">${scene.title}</h2>
      <div class="scene__stage">${
        STAGES[scene.id] ? STAGES[scene.id]() : placeholder(scene)
      }</div>${
        scene.cta
          ? `
      <a class="scene__cta" href="${scene.cta.href}" target="_blank" rel="noopener">${scene.cta.label}</a>`
          : ''
      }
      <p class="scene__caption">${scene.caption}</p>
    </div>
  </section>`

const navMarkup = () => `
  <nav class="dotnav" aria-label="${site.navLabel}">
    <ul class="dotnav__list">
      ${scenes
        .map(
          (scene) => `<li>
        <a class="dotnav__link" href="#${scene.id}" data-target="${scene.id}"
           aria-label="SCENE ${scene.num} ${scene.label}">
          <span class="dotnav__name" aria-hidden="true">${scene.label}</span>
        </a>
      </li>`,
        )
        .join('\n      ')}
    </ul>
  </nav>`

function render() {
  document.querySelector('#app').innerHTML = scenes.map(sceneMarkup).join('\n')
  document.body.insertAdjacentHTML('beforeend', navMarkup())
}

/** 현재 장면에 해당하는 점을 표시. */
function setupNav() {
  const links = [...document.querySelectorAll('.dotnav__link')]

  const activate = (id) => {
    links.forEach((link) => {
      const on = link.dataset.target === id
      if (on) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    })
  }

  scenes.forEach((scene) => {
    ScrollTrigger.create({
      trigger: `#${scene.id}`,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => self.isActive && activate(scene.id),
    })
  })

  activate(scenes[0].id)
}

/** 장면 진입 시 제목·캡션이 떠오르는 기본 트랜지션 (M3 에서 확장). */
function setupReveals() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return // 정적 상태 그대로 노출한다.

  scenes.forEach((scene) => {
    const section = document.querySelector(`#${scene.id}`)
    const targets = section.querySelectorAll(
      '.scene__eyebrow, .scene__title, .scene__stage, .scene__cta, .scene__caption',
    )

    gsap.from(targets, {
      y: 26,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.12,
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
setupReveals()
