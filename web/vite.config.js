import { defineConfig } from 'vite'

// 2차 단계에서 FastAPI가 이 번들을 `/explain` 아래로 서빙할 예정이므로
// 자산 경로를 절대경로로 굳히지 않고 base 로만 조정한다.
//   개발:      npm run dev                     → base '/'
//   /explain:  VITE_BASE=/explain/ npm run build
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  server: {
    // 기존 가드레일 데모가 8088을 쓰므로 Vite 는 기본 포트를 유지한다.
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
