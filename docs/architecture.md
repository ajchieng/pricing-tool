# Demo calculation and persistence boundaries

## Calculation flow

Each lending area validates and normalises its own numeric request with Zod, then selects its own fictional products and policy. Home uses mortgage rate bands and customer relationships. Personal adds affordability and security. Commercial adds facility-specific exposure, debt service and security coverage.

The complete browser orchestration runs the base pricing engine, assesses model risk, selects compatible probability-of-default and loss-given-default assumptions, calculates exposure at default, applies expected-loss treatment, and completes profitability and return on equity. Rates and ratios cross the public calculation boundary as numbers; financial precision and display rounding follow the domain arithmetic.

Expected credit loss is deducted once from canonical profit. Incomplete model risk remains incomplete even if a reasoned, explicitly labelled demo override supplies an amount for the operational review. Capital classification and required classification confirmations are preserved. Display-only comparison rates and product-fee context never silently become pricing inputs.

All fictional policy is versioned. The snapshot includes the selected product and rate role, score model, policy components and their canonical hashes. Each area’s score and profitability guides read those same demonstration policy definitions.

## Browser storage

IndexedDB maintains separate Home, Personal and Commercial quote stores, a shared core store, and schema/counter metadata. A quote contains normalised inputs and the entire calculated result, including policy, capital, expected loss, profitability and selected market evidence. The core holds the current revision pointer, workflow, reviews, stars, assignment, comments and activity history.

Saves allocate IDs within a transaction. Revisions verify the source is still current, write a new immutable quote, and update its operational envelope atomically. Historical quote data is never overwritten. Review operations verify both result completeness and the quote version the visitor actually reviewed.

The initial fictional fixtures and their sample revisions are inserted once. Reset clears and restores only this application’s local stores in one transaction. Storage failures, incompatible versions, quota exhaustion and stale writes surface as actionable errors. Local notifications and a browser broadcast channel refresh other open tabs without transmitting data off the device.

## Static routes

Quote details and revisions use fixed exported paths with a numeric query parameter. Client components resolve that parameter after browser storage is ready. Unknown IDs show a missing-local-record explanation; unknown page paths return HTTP 404.

All financial and workflow operations run in the browser. The deployed application serves static files only. No database connection, account, API key or server runtime configuration exists.
