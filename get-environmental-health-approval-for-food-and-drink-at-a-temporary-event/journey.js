/* =====================================================================
   MOH Event Food Journey — review-prototype state model (Chunk 1)
   ---------------------------------------------------------------------
   Internal project name: "MOH Event Food Journey".
   Working public service name (new combined journey only):
     "Get environmental health approval for food and drink at a temporary event"
   "Environmental health approval" is the shared USER GOAL only. It is not a
   submission status, not the name of either record, and not evidence that
   anything has been approved.

   This file models ONLY the technical route + state buckets for Chunk 1.
   It does NOT build service questions, check-answers, declarations,
   submission, reference numbers, confirmations or emails — and it never
   submits or approves anything.

   The two underlying processes stay separate — separate records, separate
   references (NOT created here), separate outcomes:
     A. Request an Environmental Health Officer to attend an event
     B. Apply for a licence to operate a temporary restaurant

   INACTIVE-DATA POLICY: when the selected role changes, data for a process
   that is not part of the new role is DELETED from the active model (not
   retained anywhere). Shared applicant/event information is always kept.
   So there are no hidden/retained answers to leak into review or outcomes,
   and re-selecting a previous role starts that process fresh (no
   contradictory state).
   ===================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "mefj-state"; // prototype-only draft; no personal data seeded

  // The four distinct state buckets.
  var BUCKETS = {
    "shared.applicant": {
      label: "Shared: your details (the person completing the form)",
      kind: "shared"
    },
    "shared.event": {
      label: "Shared: about the event",
      kind: "shared"
    },
    "ehoRequest": {
      label: "Process A: Request an Environmental Health Officer to attend an event",
      kind: "process"
    },
    "licenceApplication": {
      label: "Process B: Apply for a licence to operate a temporary restaurant",
      kind: "process"
    }
  };

  // Which buckets are active for each technical route.
  var ROUTES = {
    organiser: ["shared.applicant", "shared.event", "ehoRequest"],
    vendor: ["shared.applicant", "shared.event", "licenceApplication"],
    both: ["shared.applicant", "shared.event", "ehoRequest", "licenceApplication"]
  };

  var ROUTE_LABELS = {
    organiser: "Organiser only",
    vendor: "Vendor only",
    both: "Organiser and vendor"
  };

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
      // shallow-restore known keys only
      Object.keys(base).forEach(function (k) { if (s[k] != null) base[k] = s[k]; });
      return base;
    } catch (e) { return blankState(); }
  }

  function save(s) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function isActive(state, bucketKey) {
    if (!state.role) return false;
    return ROUTES[state.role].indexOf(bucketKey) !== -1;
  }

  /* Set the selected role. Preserve shared info; DELETE data for any process
     bucket not active in the new role. Returns the new state. */
  function setRole(role) {
    if (!ROUTES[role]) return load();
    var s = load();
    s.role = role;
    Object.keys(BUCKETS).forEach(function (key) {
      if (BUCKETS[key].kind === "process" && ROUTES[role].indexOf(key) === -1) {
        s[key] = {}; // removed from the active model, not retained
      }
    });
    save(s);
    return s;
  }

  /* Prototype test control: put a sample entry into an active bucket so a
     reviewer can watch shared data persist and inactive process data get
     removed when the route changes. Not a service question. */
  function seed(bucketKey) {
    var s = load();
    if (!isActive(s, bucketKey)) return s;
    var n = Object.keys(s[bucketKey]).length + 1;
    s[bucketKey]["sample-" + n] = "test value " + n;
    save(s);
    return s;
  }

  function clearAll() {
    var s = blankState();
    // keep current role so the page still reflects its route
    var cur = load().role;
    s.role = cur;
    save(s);
    return s;
  }

  /* ---------- rendering (state inspector) ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderInspector(container, state) {
    container.innerHTML = "";
    var order = ["shared.applicant", "shared.event", "ehoRequest", "licenceApplication"];
    order.forEach(function (key) {
      var active = isActive(state, key);
      var box = el("div", "proto-bucket " + (active ? "is-active" : "is-inactive"));

      var h = el("h3", "govbb-text-h4");
      h.appendChild(document.createTextNode(BUCKETS[key].label));
      var status = el("span", "proto-bucket__status",
        active ? "Active for this route"
               : (BUCKETS[key].kind === "process" ? "Not part of this route. Data removed." : "Not active"));
      h.appendChild(status);
      box.appendChild(h);

      var data = state[key] || {};
      var keys = Object.keys(data);
      var pre = el("pre", "proto-bucket__data",
        keys.length ? JSON.stringify(data, null, 2) : "(no data)");
      box.appendChild(pre);

      // seed control only for active buckets
      if (active) {
        var btn = el("button", "govbb-btn govbb-btn--secondary", "Add a sample answer");
        btn.type = "button";
        btn.setAttribute("data-seed", key);
        box.appendChild(btn);
      }
      container.appendChild(box);
    });
  }

  /* Public API */
  window.MEFJ = {
    ROUTES: ROUTES,
    ROUTE_LABELS: ROUTE_LABELS,
    load: load,
    setRole: setRole,
    seed: seed,
    clearAll: clearAll,
    isActive: isActive,
    renderInspector: renderInspector
  };

  /* ---------- page wiring ---------- */
  function initRoutePage() {
    var body = document.body;
    var route = body.getAttribute("data-route");
    if (!route || !ROUTES[route]) return; // start page has no route

    // Entering a route page IS selecting that role — prune inactive data.
    var state = setRole(route);

    var inspector = document.getElementById("proto-state");
    if (inspector) renderInspector(inspector, state);

    // delegate control clicks
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-seed")) {
        var s = seed(t.getAttribute("data-seed"));
        if (inspector) renderInspector(inspector, s);
      } else if (t && t.id === "proto-clear") {
        var c = clearAll();
        if (inspector) renderInspector(inspector, c);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRoutePage);
  } else {
    initRoutePage();
  }
})();
