# Get approval from Environmental Health for food and drink at a temporary event — review prototype record

**Public service name (authoritative):** Get approval from Environmental Health for food and drink at a temporary event
**Decision date:** 14 August 2026 (supplied this session; supersedes the earlier working name "Get environmental health approval for food and drink at a temporary event").
**Internal project name:** MOH Event Food Journey — internal only. Not shown as public content. It remains the branch name (`feature/moh-event-food-journey`) and the `moh-event-food-journey:*` comment `pageId` prefix.
**Status:** Review prototype — not a live service, not approved policy. Wording, questions and logic are not final.

> "Approval" in the service name describes the overall **user goal** only. It is not a submission
> result. Sending a request or an application does not mean it has been approved, granted or
> licensed. No submission state or reference number is created anywhere in this prototype.

## Chunks

- **Chunk 1** (checkpoint, committed): standalone prototype shell — chrome, prototype-review status, per-route state model, page-level reviewer comments.
- **Chunk 2** (this pass): public start page, route question, and routing into the organiser, vendor and both routes. The technical route controls and state inspector have been removed. Shared/service questions, check answers, declaration, submission, references, confirmations and emails are **not** built and belong to later chunks.

## Screens (each a stable URL and a distinct comment `pageId`)

| Screen | File | Comment `pageId` |
|--------|------|------------------|
| Start page | `index.html` | `moh-event-food-journey:start` |
| Route question | `route-question.html` | `moh-event-food-journey:route-question` |
| Organiser route | `organiser.html` | `moh-event-food-journey:organiser` |
| Vendor route | `vendor.html` | `moh-event-food-journey:vendor` |
| Both route | `both.html` | `moh-event-food-journey:both` |

## Exact route-question wording (as built)

- **H1:** What are you responsible for at the event?
- **Hint:** Choose the answer that best describes what you will do.
- **Radio options (value → label → hint):**
  - `organising` → "Organising the event" → "Use this route to request an Environmental Health Officer to attend."
  - `operating` → "Operating a food or drink stall or temporary restaurant at the event" → "Use this route to apply for a temporary restaurant licence."
  - `both` → "Both" → "You are organising the event and operating a food or drink stall or temporary restaurant."
- **Button:** Continue
- **Required-answer error:** Select what you are responsible for at the event

## Route-to-process mapping

| Answer | Route | Active process(es) | Destination |
|--------|-------|--------------------|-------------|
| Organising the event | organiser | Process A: request an Environmental Health Officer | `organiser.html` |
| Operating a food or drink stall or temporary restaurant | vendor | Process B: apply for a temporary restaurant licence | `vendor.html` |
| Both | both | Process A **and** Process B (separate records/outcomes) | `both.html` |

## State model (`journey.js`)

Held in `sessionStorage` (`mefj-state`), prototype-only, nothing personal seeded. Buckets:
`shared.applicant`, `shared.event` (shared, kept on every route); `ehoRequest` (process A),
`licenceApplication` (process B).

State rules preserved:

- Shared applicant and event information remain available when the route changes.
- Environmental Health Officer request data is removed when that process becomes inactive
  (organiser→vendor).
- Temporary restaurant licence application data is removed when that process becomes inactive
  (vendor→organiser).
- Returning to the route question shows the current answer.
- Selecting a different answer recalculates the active process state before continuing
  (`setRoute` runs on Continue and again on each route page's load, so reload and browser Back
  stay consistent).
- Inactive process data is **deleted, not retained**, so no hidden answer can appear in review
  or any future outcome/submission model.

No reference number or submission state is created or displayed anywhere.

## Evidence used

Preparation content on the start page uses only the exact supplied wording. No documents, fees,
deadlines, processing times, medical evidence, site plans, vendor lists or payment requirements
are listed in public content. Sources reviewed (GovTech Barbados, `govtech-bb/gov-bb`
`apps/landing` content; sandbox host `landing.sandbox.alpha.gov.bb`):

- **Temporary restaurants: what you need to know** — confirms a temporary restaurant "operates
  for a period not exceeding 30 days" (Health Services (Restaurants) Regulations, 1969); that
  both the event organiser and each food vendor must apply; and the 14-day, medical-certificate,
  site-plan and officer-overtime requirements.
- **Request an environmental health officer** (`landing-index`) — confirms the event organiser
  makes the officer request; that it applies where food or drink is served to the public; and
  that if the organiser is also operating a temporary restaurant, the same service also completes
  the temporary restaurant licence application.
- **Apply for a licence to operate a temporary restaurant** (`landing-index`) — confirms the
  licence is for operators, the 30-day validity, and references a separate "food business
  licence" for those who already run a licensed food business.

These confirmed requirements (14 days, medical certificate, site plan, overtime fees, National
Registration Number, organiser letter, etc.) belong to the shared/service questions in later
chunks; they are recorded here, not shown as public preparation content in this chunk.

## Unresolved MDA decisions (owner: Ministry of Health and Wellness service owner)

- **Permanent-premises exit — BLOCKED by missing evidence.** The 30-day threshold that defines a
  *temporary* restaurant is evidenced, but the supplied sources give **no confirmed destination**
  for a permanent premises. A "food business licence" is referenced in the licence start-page
  content, but no live service page, licence category or URL for it is confirmed in the supplied
  evidence. Per instruction, no duration threshold, licence category or destination link was
  inferred, and no permanent-premises question or exit was built. Decision needed: the applicable
  rule and the current destination for a permanent food premises.
- **General / non-food Environmental Health Officer requests — out of scope pending confirmation.**
  The EHO evidence is explicitly for events where food or drink is served to the public. No
  evidence confirms that this combined service must also support non-food or general officer
  requests, so no such public route was added. Decision needed: whether this service must support
  general/non-food EHO requests.

## Decision ownership

- The **Ministry of Health and Wellness service owner** confirms unresolved service facts and
  operational decisions only — including the permanent-premises destination and any wider
  Environmental Health Officer scope above.
- **Fabian retains content sign-off** for the public wording and journey content. The Ministry is
  not asked to approve GovTech wording, interaction patterns or content standards.
- This remains prototype content and is not approved for publication.

## Reviewer comments

- Tool: the repository's existing `comments.js` (repo root), loaded unchanged via `../comments.js`.
  Not modified.
- Backend: this repository's existing shared backend — the AWS `apiBase`
  (`https://ltu6w5xthc.execute-api.ca-central-1.amazonaws.com`), exactly as the root page
  configures it (`supabase: null`). Each screen sets `window.GTCOMMENTS_OVERRIDE` (with its own
  stable `pageId`) before `comments.js` loads.
- Each screen sends a different stable `pageId`. This is intended to keep comments separate
  between screens. **Comment creation, retrieval, isolation, reply, resolve and reopen are not
  claimed as verified** — the shared backend rejects `localhost` via CORS, so these can only be
  verified on the deployed origin.

## Accessibility limitation

Keyboard navigation is **partially verified**: a visible focus indicator was observed on the
Continue button, and the design-system CSS defines a visible focus indicator for the radio
controls. Complete keyboard order and operation could not be verified because the in-app browser
did not deliver Tab input consistently. The design-system CSS was not changed to produce stronger
evidence.

## Design system

- Vendored unmodified in `./vendor/` from `govtech-bb/prototype-template` @ commit `f70a449`:
  `tokens.css`, `govbb.css`, the two Figtree `.woff2` fonts, and the crest and logo SVGs.
- Screens use documented `govbb-*` classes (skip link, official banner, alpha status banner,
  header, container, typography, buttons, lists, back link, radios, fieldset, error summary,
  error message, footer). No separate prototype stylesheet is used; the Chunk 1 `prototype.css`
  (which only styled the removed test tooling) has been deleted.

## Remaining deployment checks (before the prototype is used for review)

On the deployed GitHub Pages origin (`https://.../food-safety-prototype/...`), where the shared
comments backend accepts the origin:

1. Create a comment on each screen (start, route-question, organiser, vendor, both).
2. Reload each screen and confirm its comment remains.
3. Confirm a comment from one screen does not appear on another.
4. Test reply, resolve and reopen.
5. Confirm the comments control works at mobile widths and does not cover essential controls.

Responsive check still outstanding: verify genuine CSS viewports of **exactly 320px and 375px**
(no horizontal scroll, no hidden controls) using tooling that can set an exact layout viewport
(for example Playwright/Puppeteer `page.setViewport`, or Chrome DevTools device toolbar). The
in-app browser and windowed Chrome available in this environment cannot produce those exact
layout viewports.
