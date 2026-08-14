# MOH Event Food Journey — review prototype record (Chunk 1)

**Internal project name:** MOH Event Food Journey
**Working public service name (new combined journey only):** Get environmental health approval for food and drink at a temporary event
**Status:** Review prototype — not a live service, not approved policy. Wording, questions and logic are **not** final.

> "Environmental health approval" is the shared **user goal** only. It is not a submission
> status, not the name of either record, and not evidence that anything has been approved.
> Submitting a process is not the same as it being approved.

## What this chunk builds

A standalone review prototype **shell** in its own folder
(`get-environmental-health-approval-for-food-and-drink-at-a-temporary-event/`), separate from
the repository's root `index.html` (an earlier, unrelated guidance prototype, preserved
unchanged). It sets up **only**:

- the new prototype route (its own folder + four screens);
- the working service title (start screen `<h1>`);
- a clearly-marked prototype-review status (GovBB alpha status banner, re-worded for review);
- the technical route model for **organiser**, **vendor** and **both**;
- shared state for the person completing the form and the event;
- separate state for the Environmental Health Officer request and the temporary restaurant
  licence application;
- safe behaviour when the selected role changes;
- page-level reviewer comments via the repository's existing shared comments tool.

It deliberately does **not** build: detailed service questions, public entry/preparation
content beyond the title, the final role question or answer wording, check-your-answers,
declarations, submission behaviour, reference numbers, confirmation screens or emails.

## Screens (each a stable URL and a distinct comment identifier)

| Screen | File | Comment `pageId` |
|--------|------|------------------|
| Start | `index.html` | `moh-event-food-journey:start` |
| Organiser only | `organiser.html` | `moh-event-food-journey:organiser` |
| Vendor only | `vendor.html` | `moh-event-food-journey:vendor` |
| Organiser and vendor | `both.html` | `moh-event-food-journey:both` |

## State model (`journey.js`)

Held in `sessionStorage` (`mefj-state`), prototype-only, nothing personal seeded. Four
distinct buckets:

| Bucket | Kind | Active on routes |
|--------|------|------------------|
| `shared.applicant` — the person completing the form | shared | all |
| `shared.event` — about the event | shared | all |
| `ehoRequest` — Process A: Request an Environmental Health Officer to attend an event | process | organiser, both |
| `licenceApplication` — Process B: Apply for a licence to operate a temporary restaurant | process | vendor, both |

Route → active buckets:

- **organiser:** shared.applicant, shared.event, ehoRequest
- **vendor:** shared.applicant, shared.event, licenceApplication
- **both:** all four

Opening a route screen selects that role (`setRole`). The three routes are also reachable
from an internal, clearly-marked test-controls block on every screen.

## How inactive route data is handled

**Deleted, not retained.** When the role changes, `setRole` keeps the shared buckets and
**deletes** any process bucket not active in the new role (sets it to `{}`). Nothing is
retained outside the active model, so:

- inactive answers cannot appear in review or any future outcome/submission model;
- there are no hidden retained answers to mis-describe as submitted information;
- re-selecting a previous role starts that process **fresh** — no contradictory state.

Shared applicant/event information is always preserved across role changes.

No reference number is created or displayed anywhere in this chunk. Nothing is submitted or
approved.

## Reviewer comments

- Tool: the repository's existing `comments.js` (repo root), loaded unchanged via
  `../comments.js`. **Not modified.**
- Backend: this repository's existing **shared** backend — the AWS `apiBase`
  (`https://ltu6w5xthc.execute-api.ca-central-1.amazonaws.com`), exactly as the root page
  configures it (`supabase: null`). Each screen sets `window.GTCOMMENTS_OVERRIDE` (with its
  own stable `pageId`) **before** `comments.js` loads.
- Distinct identifiers: each screen sends a different stable `pageId`. This is intended to keep
  comments separate between screens. Comment creation, retrieval, isolation, reply, resolve and
  reopen must be verified on the deployed GitHub Pages origin before the prototype is used for
  review.
- No export feature added in this chunk.

## Design system — exact source reused

- **Source:** `govtech-bb/prototype-template` @ commit `f70a449`, the org's established
  static-prototype GovBB system. Files vendored **unmodified** into `./vendor/`:
  `assets/css/tokens.css`, `assets/css/govbb.css`, `assets/fonts/figtree-latin.woff2`,
  `assets/fonts/figtree-latin-ext.woff2`, `assets/images/govbb-creast.svg`,
  `assets/images/govbb-logo.svg`.
- Screens use documented `govbb-*` classes (skip link, official banner, status banner,
  header, container, typography, buttons, lists, back link, footer).
- The repository root page's **custom CSS is not** the design system and was **not** reused.
- `prototype.css` contains only review-shell scaffolding styles (state inspector + test
  controls); it does not claim to be, or replace, the design system.

## Structural assumptions (to confirm in later chunks)

- Organiser → Environmental Health Officer request; vendor → temporary restaurant licence;
  both → both. Event and applicant information are treated as **shared** across all routes.
- Multi-page (one HTML file per screen) is used so `comments.js` (whose `pageId` is read once
  at load) keeps comments separate without modifying it, and so each screen has a stable URL.
- Role change = navigating between the route screens; each screen load re-applies its role and
  prunes inactive process data.
- Route-screen `<h1>`s are scaffolding labels, not final public wording.
- The technical route controls and state inspector are temporary development tools. They must be
  removed or replaced by the real journey before an MDA or public review link is shared.

## Files added by this chunk

All new, inside the service folder above:
`index.html`, `organiser.html`, `vendor.html`, `both.html`, `journey.js`, `prototype.css`,
`record.md`, and `vendor/` (unmodified design-system files). Nothing outside this folder was
changed; root `index.html` and `comments.js` are untouched.
