# laps-landing-page

Laps 공식 사이트: 랜딩 페이지, 지원, 개인정보 처리방침. 한국어와 영어.

[Astro](https://astro.build) + [GitHub Pages](https://pages.github.com). `wlswo.me`는 `wlswo.github.io`의 커스텀 도메인이라,
이 레포를 `laps`라는 이름의 공개 레포로 올리면 `https://wlswo.me/laps`에서 열린다 (`astro.config.mjs`의 `base: '/laps'`).

## 페이지

```
/laps              랜딩 (영어)        /laps/ko              랜딩 (한국어)
/laps/support      지원                /laps/ko/support      지원
/laps/privacy      개인정보 처리방침   /laps/ko/privacy      개인정보 처리방침
```

App Store Connect: 지원 URL `https://wlswo.me/laps/support` (한국어는 `/laps/ko/support`), 개인정보 처리방침 URL
`https://wlswo.me/laps/privacy` (`/laps/ko/privacy`).

## 로컬

```bash
npm install
npm run dev      # http://127.0.0.1:4321/laps
npm run build    # ./dist
```

## 고치는 곳

- 모든 문구: `src/i18n.ts` (랜딩), `src/pages/*.astro`, `src/pages/ko/*.astro` (지원, 개인정보)
- 레이아웃, 공통 스타일: `src/layouts/Layout.astro`, 랜딩: `src/components/Landing.astro`
- 스크린샷: `public/screens/<언어>/1–5.png` (앱 레포 `scripts/frame-store-shots.py`가 만든 6.3" 이미지를 줄인 것),
  첫 화면 폰: `public/app/<언어>/home.png`
- 가운뎃점(·)은 쓰지 않는다 (앱과 같은 규칙)

## 배포

`main`에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해서 Pages에 올린다.
처음 한 번: GitHub에서 Settings → Pages → Source를 GitHub Actions로.
