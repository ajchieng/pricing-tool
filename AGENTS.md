# Repository instructions

This is a static portfolio demonstration. Read the relevant installed Next.js guide under `node_modules/next/dist/docs/` before changing framework code.

- Preserve the three pricing domains. Their shared quote envelope owns operations, not financial calculations.
- Use only fictional products, people and lender policy. Review imported assets and source before adding them; never copy credentials, operating records or internal infrastructure material.
- Keep all visitor data in browser storage. Do not add sign-in, server APIs, analytics carrying input data, or a hosted database without an explicit request.
- Save complete immutable input/result/policy snapshots. Historical quotes must not be recalculated. Quote revisions and workflow writes use IndexedDB transactions and reject stale operations.
- Retain complete expected-loss and capital handling. Missing risk information must not silently become calculated zero credit loss; manual demo overrides require reasons.
- Online commission is zero. Customer-rate previews change the requested quote rate only when explicitly applied.
- The interface follows `PRODUCT.md` and `DESIGN.md`. Preserve the existing forms, product accents and accessible desktop/mobile behaviour.
- Verify with focused tests, typecheck, lint, the static build, sanitisation scan and `npm run test:e2e` for browser workflows. The browser harness is database-free.
- Public source visibility does not grant an additional open-source licence.
