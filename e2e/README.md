# E2E tests — Playwright

Specs for the homepage carousels (categories + special occasions).

## Setup (run once locally)

```bash
npm i -D @playwright/test
npx playwright install --with-deps
```

## Run

```bash
# All projects: desktop chromium + tablet (iPad) + mobile (iPhone 13)
npx playwright test

# Single project
npx playwright test --project=mobile
npx playwright test --project=tablet
npx playwright test --project=desktop-chromium

# Against the deployed site (skip local dev server)
BASE_URL=https://emporiolelecute.com.br PW_NO_SERVER=1 npx playwright test

# Watch / debug
npx playwright test --ui
```

## What is covered

- **Keyboard**: `ArrowLeft/Right`, `Home`, `End` move the active item; live region announces it.
- **Mouse (desktop only)**: hover-revealed arrow buttons advance the carousel.
- **Horizontal scrolling (mobile + tablet)**: verifies actual native scroll displacement and selection; physical finger gestures require device QA.
- **Anti-flicker**: 10 tiny scroll jitters (±5px) must NOT change the active item (validates the 18px threshold).
- **ARIA**: each carousel exposes `role="listbox"` with exactly one `aria-selected` option.

## Configuration

See `playwright.config.ts` at the project root. Devices configured:

| Project              | Viewport            | Has touch |
|----------------------|---------------------|-----------|
| desktop-chromium     | 1440 × 900          | no        |
| tablet               | iPad gen 7          | yes       |
| mobile               | iPhone 13           | yes       |
