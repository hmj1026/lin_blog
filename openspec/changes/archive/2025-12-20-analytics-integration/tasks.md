# Task Checklist

## 1. Environment Setup
- [x] Add `NEXT_PUBLIC_GA_ID` to `web/src/env.ts`
- [x] Add `NEXT_PUBLIC_GTM_ID` to `web/src/env.ts`
- [x] Add `NEXT_PUBLIC_FB_PIXEL_ID` to `web/src/env.ts`

## 2. Dependencies
- [x] Install `@next/third-parties`

## 3. Implementation
- [x] Create `web/src/components/analytics-provider.tsx`
- [x] Integrate into `web/src/app/layout.tsx`

## 4. Verification
- [x] Verify build succeeds
- [x] Verify scripts load when ENV is set
- [x] Verify scripts do NOT load when ENV is missing
