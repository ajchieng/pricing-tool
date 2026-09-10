# Demo calculation and persistence boundaries

## Calculation flow

Each lending area validates and normalises its own numeric request with Zod, then selects its own fictional products and policy. Home uses mortgage rate bands and customer relationships. Personal adds affordability and security. Commercial adds facility-specific exposure, debt service and security coverage.

The complete browser orchestration runs the base pricing engine, assesses model risk, selects compatible probability-of-default and loss-given-default assumptions, calculates exposure at default, applies expected-loss treatment, and completes profitability and return on equity. Rates and ratios cross the public calculation boundary as numbers; financial precision and display rounding follow the domain arithmetic.

Expected credit loss is deducted once from canonical profit. Incomplete model risk remains incomplete even if a reasoned, explicitly labelled demo override supplies an amount for the operational review. Capital classification and required classification confirmations are preserved. Display-only comparison rates and product-fee context never silently become pricing inputs.

All fictional policy is versioned. The snapshot includes the selected product and rate role, score model, policy components and their canonical hashes. Each area’s score and profitability guides read those same demonstration policy definitions.

## Browser storage

IndexedDB maintains separate Home, Personal and Commercial quote stores, a shared core store, and schema/counter metadata. A quote contains normalised inputs and the entire calculated result, including policy, capital, expected loss, profitability and selected market evidence. The core holds the current revision pointer, workflow, reviews, stars, assignment, comments and activity history.

Saves allocate IDs within a transaction. Revisions verify the source is still current, write a new immutable quote, and update its operational envelope atomically. Historical quote data is never overwritten. Review operations verify both result completeness and the quote version the visitor actually reviewed.

The initial fictional fixtures and their sample revisions are inserted once. Reset restores policy, clears feedback and restores sample quotes in a sequence of local transactions. It reports any failure and can be retried; it never reports a partial reset as successful. Storage failures, incompatible versions, quota exhaustion and stale writes surface as actionable errors. Local notifications and a browser broadcast channel refresh other open tabs without transmitting data off the device.

## Configuration and operational tools

The original configuration screens read typed browser policy tables rather than server models. Products, rates, adjustment rules, score factors, approval rules, margins, fees, channel defaults, expected loss and capital retain domain-specific validation. Configured rates respect active flags and effective intervals. A missing compatible expected-loss policy remains incomplete. Publishing a changed score model does not relabel an older expected-loss calibration as compatible.

Personal profitability checks every channel and security scope for complete defaults. A missing, inactive or incomplete scope retains the original engine assumptions with an explicit warning and a profitability fallback flag in the saved policy snapshot; online commissions remain zero. Restoring a domain's policy records full before-and-after score-model and expected-loss-policy snapshots alongside the restored tables in the same audit transaction.

The configuration database stores a versioned state plus append-only local history. A transaction rechecks the caller’s version, validates the complete resulting policy, and commits the edit and audit together. Rejected edits preserve entered form values. Pending and scheduled proposals hold the reviewed prior setting; publication fails if that target changed. Scheduled changes are published explicitly from the browser approval queue when due. A scheduled change can be cancelled with a recorded reason, allowing other due changes to proceed when its reviewed setting has become stale. Display settings affect presentation only.

Configuration search indexes active applied settings and score factors, with links to the original editable rows. Audit combines committed configuration records, quote histories and feedback activity. Feedback and attachments stay in a third local store. Bulk import validates at most 25 vertical-specific JSON inputs (2 MiB total), previews each row and saves through the same calculation and quote adapters; failed rows can be retried without reimporting successful rows. No selected file is uploaded.

Market source and product selections control the fictional catalogue. Selected quote evidence remains an immutable snapshot even if the catalogue is later hidden. There is no live market request or ingestion job.

## Static routes

Quote details and revisions use fixed exported paths with a numeric query parameter. Client components resolve that parameter after browser storage is ready. Unknown IDs show a missing-local-record explanation; unknown page paths return HTTP 404.

All financial and workflow operations run in the browser. The deployed application serves static files only. No database connection, account, API key or server runtime configuration exists.
