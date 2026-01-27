# Replin Inspect

Client‑side HAR inspection and troubleshooting for support engineers, SREs, and developers.
Surface likely causes for failures and slowdowns without wading through raw HAR files.

**Status:** In active development
**Privacy:** Local‑only, runs entirely in the browser

## At A Glance

- Request‑centric analysis with contextual findings
- Progressive disclosure UI for fast scanning and deep dives
- Privacy‑first: no uploads, no persistence

## UI Preview

![Replin Inspect UI preview](replin-inspect-ui-preview.png)

*Current UI: request table + details panel with findings context.*

## Vision

Build an opinionated diagnostic assistant that reduces HAR cognitive overload:
- Surface the most important signals first.
- Attach findings to specific requests whenever possible.
- Provide clear, actionable explanations instead of raw data.
- Keep the interface clean and use progressive disclosure for deep dives.

## What’s Implemented

- **Client‑side analysis:** HAR files are parsed locally in the browser.
- **Request‑centric UI:** results table + request details panel + findings view.
- **Findings engine:** rules for failures, auth, CORS, performance, payload size, and timing anomalies.
- **Severity and confidence:** findings carry severity + confidence and are deduped.
- **Timing attribution:** slow requests call out dominant phases when clear.
- **Privacy‑first workflow:** no uploads, no persistence.

## In Progress / Planned

- **Findings UX polish:** clearer grouping, richer evidence snippets, and more scannable layout.
- **Token analysis:** deeper correlation and smarter authentication context.
- **Findings summaries:** top causes and “why” explanations with supporting evidence.
- **Rule expansion:** fewer false positives, more context‑aware messaging.
- **Guided capture UX:** improved HAR capture guidance and onboarding.

## How to Use (Hosted)

1. Open https://inspect.replin.ai in your browser.
2. Upload a HAR file (processed locally).
3. Review request‑level findings and timing breakdowns.
4. Drill into request details for evidence and context.

## Current Known Limitations

- Token analysis is disabled (coming soon).
- Large JavaScript response bodies are not rendered for performance.
- Findings UX is still in refinement (grouping and evidence snippets evolving).

## What This Is Not

- Not a DevTools replacement.
- Not a packet sniffer.
- Not an AI black box.
- Not a raw HAR dumper.

## Privacy

HAR data is processed locally in the browser and is never uploaded or stored by the app.

## Issues / Feedback

Please file bugs or feedback here:
https://github.com/pillowbytes/replin-inspect/issues

## Contributing

Issues, feature requests, and feedback are very welcome.
Please open an issue to report bugs, suggest improvements, or share ideas:
https://github.com/pillowbytes/replin-inspect/issues

## Note on Self‑Hosting

This repository is not intended as a self‑serve installation guide. If you are looking for a hosted version or want to try the app, please use the official deployment or open an issue.

## Roadmap (High‑Level)

- Refine findings UX (layout, evidence, and summarization).
- Improve auth/token correlation and messaging accuracy.
- Expand timing attribution and performance insights.
- Add richer capture guidance and onboarding.
