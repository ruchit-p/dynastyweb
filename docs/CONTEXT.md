# Open Source Preparation Notes

This document records the key changes made while preparing the repository for open source.

## Summary of Changes

- Removed hard-coded Firebase Messaging service worker containing real config
- Implemented dynamic service worker at `src/app/firebase-messaging-sw.js/route.ts`
- Sanitized code that referenced a specific Firebase Storage bucket domain
- Updated environment setup to use placeholders and added missing vars
- Strengthened `.gitignore` to ignore all `.env*` files
- Added OSS docs: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- Updated `README.md` license section

## Follow-up for Maintainers

- Provide `.env.local` based on `.env.example`
- Validate Web Push VAPID key via `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- Verify image hosts in `next.config.js` cover your storage bucket and emulator

## Potential Integrations

- CI to run `npm run lint` and basic build checks
- Secret scanning in CI (e.g., Gitleaks, GitHub Secret Scanning)


