/**
 * 사이트의 모든 한국어 카피.
 *
 * 규칙: 화면에 보이는 문자열은 예외 없이 이 파일에만 둔다 (SVG/JS 하드코딩 금지).
 * 추후 i18n 시 이 파일만 로케일별로 교체하면 되도록 구조를 평평하게 유지한다.
 * 본문은 비유어로만 쓰고, 실제 기술 용어는 M5 의 "실제로는" 패널에서 병기한다.
 */

export const site = {
  title: '디지털 국경',
  navLabel: '장면 이동',
}

/** 스크롤 순서 고정 — CLAUDE.md 스토리보드 7개 섹션. */
export const scenes = [
  {
    id: 'scene-1',
    num: '01',
    label: '인트로',
    title: '여러분은 채팅창만 봅니다.',
    caption: '엔터를 누르는 순간, 이 질문은 출국 수속을 시작합니다.',
    placeholder: '캠퍼스 야경 실루엣 위로 질의 말풍선이 떠오르는 장면',
  },
  {
    id: 'scene-2',
    num: '02',
    label: '조감도',
    title: '캠퍼스와 외부 AI 사이, 통로는 하나뿐입니다.',
    caption: '어느 건물에서 보냈든, 모든 질의는 단 하나의 통제 지점을 지납니다.',
  },
  {
    id: 'scene-3',
    num: '03',
    label: '출국층 단면',
    title: '가방은 세 개의 문 중 하나로 나갑니다.',
    caption:
      '여권과 비자를 확인하고, X-ray 로 가방 속을 들여다본 뒤, 통과·제거·거부를 판정합니다.',
  },
  {
    id: 'scene-4',
    num: '04',
    label: '활주로',
    title: '여기서부터는 우리 관제 밖입니다.',
    caption: '질의는 국경을 넘어 해외 공장에서 처리되고, 답변 화물을 싣고 돌아옵니다.',
    placeholder: '터미널에서 외부 AI 공장까지 왕복하는 비행 장면 (외부 구간은 어둡게)',
  },
  {
    id: 'scene-5',
    num: '05',
    label: '입국층 단면',
    title: '돌아온 가방도 검역대를 지납니다.',
    caption: '나갈 때 깨끗했어도, 돌아올 때 깨끗하다는 보장은 없습니다.',
    placeholder: '터미널 아래층 단면 — 도착 가방에서 숨은 해충·유출 장치를 적발하는 검역대',
  },
  {
    id: 'scene-6',
    num: '06',
    label: '기록실',
    title: '기록부에는 판정만 남습니다.',
    caption: '품목과 판정은 기록하고, 가방 속 내용물 원본은 남기지 않습니다.',
    placeholder: '출입국 기록부에 판정 스탬프만 찍히고 내용 칸은 비어 있는 장면',
  },
  {
    id: 'scene-7',
    num: '07',
    label: '아웃트로',
    title: '터미널은 다시 지표 아래로 내려갑니다.',
    caption: '보이지 않지만, 모든 질문이 여기를 지납니다.',
    placeholder: '터미널이 지표 아래로 잠기고 캠퍼스 일상 풍경만 남는 장면',
    cta: {
      label: '실제 동작 보기',
      href: 'http://localhost:8088',
    },
  },
]

export const placeholderKicker = '일러스트 예정'

/** SCENE 02 · 조감도 */
export const scene2 = {
  svgTitle: '조감도 — 캠퍼스 영토와 외부 AI 대륙, 그 사이를 잇는 공항 터미널',
  svgDesc:
    '왼쪽은 건물과 단말이 흩어진 캠퍼스 영토, 오른쪽은 해외의 거대 공장이 선 외부 AI 대륙입니다. 두 땅 사이에는 국경이 그어져 있고, 캠퍼스 각지에서 출발한 여행 가방들이 하나의 공항 터미널로 모여듭니다.',
  campus: '우리 영토 · KAIST 캠퍼스',
  devices: '폰 · 태블릿 · 노트북 · PC',
  devicesSub: '어느 단말에서 띄운 질문이든 한 개의 여행 가방이 됩니다',
  routes: '캠퍼스 각지에서 모여드는 경로',
  terminal: '국제공항 터미널',
  terminalSub: '나가려면 반드시 여기를 거칩니다',
  border: '국 경',
  factory: '외부 AI 대륙',
  factorySub: '해외의 거대 공장',
}

/** SCENE 03 · 출국층 단면 */
export const scene3 = {
  svgTitle: '출국층 단면 — 컨베이어, 여권·비자 확인대, X-ray 스캐너, 3갈래 게이트',
  svgDesc:
    '터미널 위층을 잘라 본 단면입니다. 컨베이어에 올라온 가방이 여권·비자 확인대와 X-ray 스캐너를 지나 통과·물건 제거 후 통과·탑승 거부의 세 게이트 중 하나로 갈라집니다. 전략물자나 위조 여권이 잡히면 게이트를 거치지 않고 즉시 거부 통로로 빠집니다.',
  floor: '출국층 · 터미널 위층',
  conveyor: '컨베이어',
  conveyorSub: '질의가 실려 흐릅니다',
  passport: '여권·비자 확인',
  passportSub: '누가 보냈고 어디까지 나갈 수 있는지',
  xray: 'X-ray 스캐너',
  xraySub: '가방을 열지 않고 속을 봅니다',
  screen: '판독 화면',
  screenIdCard: '신분증',
  screenNote: '숨은 쪽지',
  gates: '게이트 3갈래',
  gateAllow: '통과',
  gateMask: '물건만 빼고 통과',
  gateBlock: '탑승 거부',
  override: '즉시 거부',
  overrideSub: '전략물자·위조 여권은 판정을 기다리지 않습니다',
}
