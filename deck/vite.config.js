import { defineConfig } from 'vite';

// web/ 과 같은 규칙 — 배포 경로가 하위 디렉터리면 VITE_BASE 로 넘긴다.
// 예) VITE_BASE=/deck/ npm run build
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  build: { outDir: 'dist', emptyOutDir: true },
});
