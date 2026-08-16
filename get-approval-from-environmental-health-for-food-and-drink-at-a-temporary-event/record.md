# Get Environmental Health food safety checks or a temporary restaurant licence for an event — prototype record

**Public service title (V6.1, frozen for prototype build):** Get Environmental Health food safety checks or a temporary restaurant licence for an event. ("Food safety checks" is used as the public description of the Environmental Health Officer's attendance, marked for MOH terminology confirmation.)
**Internal project name:** MOH Event Food Journey (not shown to users; remains the branch name and the `moh-event-food-journey:*` comment pageId prefix).
**Status:** Review prototype. Not a live service, not approved policy. Nothing is submitted to a backend; no request or application is approved.

## Why one public journey, two transactions

People should not need to understand Environmental Health's internal structure before they start, so there is one combined journey routed by task, not by role. Two separate underlying transactions remain:

- a **food safety checks request** (an Environmental Health Officer request), and
- a **temporary restaurant licence application**.

On success, up to two linked records and two references are created and reviewed separately. A combined public form does not mean a combined approval record.

## Task-based routing

First real question: **What are you using this service to do?** with internal values `checks`, `licence`, `both` (not shown to users). The earlier organiser/operator role-routing model was removed.

## Records, references and the event-reference proposal

- Food safety checks request → one record + one reference (prefix `EHO-` in the prototype).
- Temporary restaurant licence application → one record + one reference (prefix `TRL-`).
- The officer-request reference **doubles as the event reference** for later licence applications. No third public event identifier is created. The reference is a linking mechanism, not evidence that an event is registered or approved.

## Duplicate-request prevention

When a temporary restaurant licence is active, the journey asks whether a food safety checks request has already been sent. When **Do both** is chosen and an earlier request already exists, no second officer request is created; the journey continues with the licence application only and says so. A **Not sure** answer routes to a check-first page and never silently creates a second request.

## 30-day and temporary-setup partial eligibility

The 30-day rule and the temporary-versus-permanent setup question apply **only** to the licence route. If the licence route fails either check:

- on a licence-only journey, the user reaches an exit page;
- on a **Do both** journey, the licence route is dropped and the valid food safety checks request continues.

Failing licence eligibility never terminates a valid food safety checks request.

## Representative / proxy completion

The journey separates the person filling in the form from the person, business or organisation they are filling it in for, and keeps their details separate. Who may complete and sign on behalf of another party is an open MOH/legal point (below).

## Change-answer and state rules

State is held in `sessionStorage` (`mefj-v6-state`). When an earlier answer changes, the active route is recalculated and answers for now-inactive screens are removed, so hidden or inactive answers are not shown on Check your answers and are not part of the submitted set. Check your answers shows only active answers, grouped into Person, Event, Food safety checks request and Temporary restaurant licence application. Declarations and send buttons name only the active transaction or transactions.

## Prototype implementation notes

- **Single shell + per-screen URL.** One `index.html` renders each screen from `journey.js` based on `?screen=<id>`; every screen is a full page load, so `comments.js` re-runs and each screen gets a distinct stable comment `pageId` (`moh-event-food-journey:<screen>`). This preserves per-page reviewer feedback without modifying `comments.js`.
- **GovTech Barbados design system** vendored unmodified in `./vendor/` from `govtech-bb/prototype-template@f70a449` (`tokens.css`, `govbb.css`, Figtree fonts, crest and logo SVGs). Screens use documented `govbb-*` classes.
- **No developer controls** (route selectors, state inspectors) are shown. A hidden `?sim=` URL parameter (`fail-checks`, `fail-licence`, `fail-all`, `uncertain`) is used only to exercise failure/partial/uncertain paths during review; it is not a visible control.
- **Prototype simulations (not production rules):**
  - Event-reference matching: a reference beginning `EHO-` matches a demo event; anything else does not. Real matching of references and of manually entered event details is an MOH/case-management decision.
  - References are generated client-side for display only; nothing is stored or sent.
  - Uploads record the file name only; file contents are never stored.
- **Files:** `index.html` (shell), `journey.js` (flow, content, validation, check-answers, confirmation, recovery), `record.md`, `vendor/` (design system). The superseded role-routing pages (`organiser.html`, `vendor.html`, `both.html`, `route-question.html`) and `prototype.css` were removed.

## Accessibility and testing limitations

- Each screen has one H1, a Back link on form pages, inline errors, an error summary with focus moved to it on failure, and `aria-invalid` on failed fields.
- **Comments:** distinct stable pageId per screen and the repository's shared AWS backend are configured, but comment creation, retrieval, isolation, reply, resolve and reopen are **not verified locally** — the backend rejects `localhost` via CORS and must be verified on the deployed GitHub Pages origin.
- **Viewport:** genuine 320px and 375px CSS viewports are **not verified** — the available browser tooling cannot set an exact layout viewport at those widths. Verify with Playwright/Puppeteer `page.setViewport` or the Chrome DevTools device toolbar at deployment.

## Routes verified in-browser

Task routing and required-answer error; both (2 references); checks only; licence only; dedupe (Both + earlier request → licence only, event by reference); 30-day fail on Both → checks continues (interstitial); reference match, no match and manual entry; drinks-only exclusions (raw/hot dropped, cold kept); prepared-elsewhere branches (cooked before, reheated, transport); raw-food detail; caterer details; representative completion; change-answer regression (Both → Licence prunes checks answers); partial failure (request kept, only application retried); uncertain submission. No `journey.js` console errors; the only console errors are the comments-backend CORS rejection on localhost.

## Unresolved MOH / legal / privacy / technical confirmation points

These are confirmation points, not reasons to reopen the frozen service design. Public wording and journey content are Fabian's content sign-off; the Ministry of Health and Wellness service owner confirms service facts and operational decisions. The Ministry is not asked to approve GovTech wording, interaction patterns or content standards.

1. Whether "food safety checks" accurately describes the officer's attendance.
2. Who needs or may request officer attendance.
3. The 30-day rule and confirmation that it does not restrict the officer-request route.
4. Whether the temporary-versus-permanent setup question is required.
5. The correct destination for longer-running or permanent food businesses (the "Find the right licence" link).
6. What production should do when an event is less than 14 days away (warn, block or alternative route).
7. Whether the EHO request reference can be reused as the event reference.
8. The recovery route when someone is not sure whether an officer request already exists.
9. How duplicate officer requests are prevented outside the combined journey.
10. How manually entered event details are matched to existing events.
11. Which event documents are mandatory and what each must contain.
12. Whose medical certificate is required, and its privacy, access and retention rules (do not activate this sensitive upload in a live service until approved).
13. Whether venue or organiser permission is required and how it is evidenced (not included in the public journey pending confirmation).
14. Whether each food, preparation, handling and facilities answer is operationally necessary.
15. Whether handwashing/water/waste questions apply unchanged to drinks-only and sealed-product routes.
16. The rule for zero people preparing, serving or selling food and drink, if any.
17. Who may complete and sign on behalf of another person, business or organisation.
18. Declaration wording and whether full name and date are needed in addition to the submission record.
19. Whether an inspection is a normal next step before mentioning it in confirmations.
20. Fees and payments, if any (none are invented here).
21. Production status/lifecycle values and user-facing status information.
22. Partial-failure, uncertain-submission and support/status recovery routes.
23. Alternative access channels (paper, email, phone, in person).
24. Production email/notification model when both transactions are sent.
