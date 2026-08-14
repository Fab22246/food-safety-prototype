/* =====================================================================
   MOH Event Food Journey (internal project name) — route + state model
   ---------------------------------------------------------------------
   Public service name: "Get approval from Environmental Health for food and
   drink at a temporary event". "Approval" is the shared user goal only; it is
   not a submission status and does not mean a request or application has been
   approved.

   This file handles the public route question and the per-route state model.
   It does NOT build shared or service-specific questions, check answers,
   declarations, submission, references, confirmations or emails, and it never
   submits or approves anything.

   Two separate processes, separate outcomes:
     Process A: Request an Environmental Health Officer to attend the event
     Process B: Apply for a licence to operate a temporary restaurant

   INACTIVE-DATA POLICY: when the selected route changes, data for a process
   that is not part of the new route is deleted from the active model. Shared
   applicant/event information is always kept. Re-selecting a route starts that
   process fresh, so there is no contradictory state.
   ===================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "mefj-state"; // prototype-only draft; no personal data seeded

  // Process buckets that are removed when their process is inactive.
  var PROCESS_BUCKETS = ["ehoRequest", "licenceApplication"];

  // Active state buckets for each route.
  var ROUTES = {
    organiser: ["shared.applicant", "shared.event", "ehoRequest"],
    vendor: ["shared.applicant", "shared.event", "licenceApplication"],
    both: ["shared.applicant", "shared.event", "ehoRequest", "licenceApplication"]
  };

  // Route-question answer <-> route <-> destination screen.
  var ANSWER_TO_ROUTE = { organising: "organiser", operating: "vendor", both: "both" };
  var ROUTE_TO_ANSWER = { organiser: "organising", vendor: "operating", both: "both" };
  var ROUTE_TO_PAGE = { organiser: "organiser.html", vendor: "vendor.html", both: "both.html" };

  function blankState() {
    return {
      role: null,
      "shared.applicant": {},
      "shared.event": {},
      ehoRequest: {},
      licenceApplication: {}
    };
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return blankState();
      var s = JSON.parse(raw);
      var base = blankState();
      Object.keys(base).forEach(function (k) { if (s[k] != null) base[k] = s[k]; });
      return base;
    } catch (e) { return blankState(); }
  }

  function save(s) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* Select a route. Preserve shared info; delete data for any process bucket
     not active in the new route. Returns the new state. */
  function setRoute(route) {
    if (!ROUTES[route]) return load();
    var s = load();
    s.role = route;
    PROCESS_BUCKETS.forEach(function (key) {
      if (ROUTES[route].indexOf(key) === -1) s[key] = {}; // removed, not retained
    });
    save(s);
    return s;
  }

  /* A route landing page re-applies its own route on load, so reload and
     browser Back keep the state consistent with the page being shown. */
  function initRoutePage() {
    var route = document.body.getAttribute("data-route");
    if (route && ROUTES[route]) setRoute(route);
  }

  /* The public route question: preselect the current answer, validate on
     submit, recalculate the active process state, then continue. */
  function initRouteQuestion() {
    var form = document.getElementById("route-question-form");
    if (!form) return;
    var summary = document.getElementById("error-summary");
    var inlineErr = document.getElementById("responsibility-error");
    var fieldset = form.querySelector(".govbb-fieldset");
    var radios = Array.prototype.slice.call(form.querySelectorAll('input[name="responsibility"]'));

    // Returning to the route question shows the current answer.
    var s = load();
    if (s.role && ROUTE_TO_ANSWER[s.role]) {
      var current = form.querySelector('input[value="' + ROUTE_TO_ANSWER[s.role] + '"]');
      if (current) current.checked = true;
    }

    function clearError() {
      if (summary) summary.hidden = true;
      if (inlineErr) inlineErr.hidden = true;
      radios.forEach(function (r) { r.removeAttribute("aria-invalid"); });
      if (fieldset) fieldset.setAttribute("aria-describedby", "responsibility-hint");
    }
    radios.forEach(function (r) { r.addEventListener("change", clearError); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var selected = form.querySelector('input[name="responsibility"]:checked');
      if (!selected) {
        if (inlineErr) inlineErr.hidden = false;
        radios.forEach(function (r) { r.setAttribute("aria-invalid", "true"); });
        if (fieldset) fieldset.setAttribute("aria-describedby", "responsibility-hint responsibility-error");
        if (summary) { summary.hidden = false; summary.focus(); }
        return;
      }
      var route = ANSWER_TO_ROUTE[selected.value];
      setRoute(route); // recalculate the active process state before continuing
      window.location.href = ROUTE_TO_PAGE[route];
    });
  }

  function init() { initRoutePage(); initRouteQuestion(); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
