/* =====================================================================
   Get Environmental Health food safety checks or a temporary restaurant
   licence — review prototype engine (V6.1 + event/non-event amendment)
   ---------------------------------------------------------------------
   Internal project name: MOH Event Food Journey (not shown to users).

   One combined public journey, task-based routing. Two underlying
   transactions stay separate:
     - a food safety checks request (Environmental Health Officer request)
     - a temporary restaurant licence application
   On success, up to two linked records and two references are created; the
   officer-request reference doubles as the event reference. No third public
   event identifier is created. Sending is never described as approval.

   Screens are rendered into #main by this script BEFORE comments.js scans
   the page. Each screen is a full page load at index.html?screen=<id>, so
   comments.js gets a distinct stable pageId per screen. State is held in
   sessionStorage; nothing is sent to a backend.

   Items marked in record.md as MOH/legal/privacy/technical confirmation
   points remain prototype assumptions, not confirmed production rules.
   ===================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "mefj-v6-state";
  var SERVICE_TITLE = "Get Environmental Health food safety checks or a temporary restaurant licence";
  var AWS = "https://ltu6w5xthc.execute-api.ca-central-1.amazonaws.com";

  /* ---------------- state ---------------- */
  function blank() { return { task: null, answers: {}, files: {}, result: null }; }
  function load() {
    try { var r = sessionStorage.getItem(STORAGE_KEY); if (!r) return blank();
      var s = JSON.parse(r); s.answers = s.answers || {}; s.files = s.files || {}; return s;
    } catch (e) { return blank(); }
  }
  function save(s) { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }
  function A(s, k) { return s.answers[k]; }

  /* ---------------- derived active transactions ---------------- */
  function derive(s) {
    var task = s.answers["task"] || s.task;
    var licence = (task === "licence" || task === "both");
    var newChecks = (task === "checks" || task === "both");
    if (licence) {
      if (A(s, "elig-duration") === "no") licence = false; // 30-day rule (licence only)
    }
    if (licence && A(s, "existing-request") === "yes" && task === "both") newChecks = false;
    var ft = A(s, "food-types") || [];
    var prep = A(s, "prep-location") || [];
    return {
      task: task, licence: licence, newChecks: newChecks,
      isEvent: A(s, "is-event") === "yes",
      matchedEvent: A(s, "ref-match") === "yes",
      drinksOnly: licence && ft.length === 1 && ft[0] === "drinks",
      preparedElsewhere: prep.indexOf("elsewhere") !== -1,
      preparedAny: prep.length > 0 && prep.indexOf("none") === -1,
      prepWho: A(s, "prep-who")
    };
  }

  /* ---------------- helpers ---------------- */
  function esc(t) { var d = document.createElement("div"); d.textContent = (t == null ? "" : String(t)); return d.innerHTML; }
  function qs() { return new URLSearchParams(location.search); }
  function go(id) { location.href = "index.html?screen=" + encodeURIComponent(id); }
  function today() { var d = new Date(); return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  function ref(prefix) {
    var s = ""; var c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (var i = 0; i < 6; i++) s += c.charAt(Math.floor(Math.random() * c.length));
    return prefix + "-" + s;
  }

  /* ---------------- field rendering ---------------- */
  function errWrap(field, errors, inner, describedByExtra) {
    var e = errors && errors[field.key];
    var desc = [];
    if (field.hint) desc.push(field.key + "-hint");
    if (e) desc.push(field.key + "-error");
    if (describedByExtra) desc.push(describedByExtra);
    return { e: e, desc: desc };
  }

  function radioField(field, value, errors, asHeading) {
    var e = errors && errors[field.key];
    var html = '<div class="govbb-form-group">';
    html += '<fieldset class="govbb-fieldset"' + describedBy(field, e) + '>';
    var legendText = esc(field.legend || field.label);
    html += '<legend class="govbb-fieldset__legend">' + (asHeading ? '<h1 class="govbb-text-h1">' + legendText + "</h1>" : legendText) + "</legend>";
    if (field.hint) html += '<div class="govbb-hint" id="' + field.key + '-hint">' + esc(field.hint) + "</div>";
    if (e) html += '<p class="govbb-error-message" id="' + field.key + '-error">' + esc(e) + "</p>";
    field.options.forEach(function (o, i) {
      var id = field.key + "-" + o.value;
      html += '<div class="govbb-radio-item">';
      html += '<input class="govbb-radio" type="radio" id="' + id + '" name="' + field.key + '" value="' + esc(o.value) + '"'
        + (value === o.value ? " checked" : "") + (e ? ' aria-invalid="true"' : "")
        + (o.hint ? ' aria-describedby="' + id + '-hint"' : "") + ">";
      html += '<label class="govbb-radio-item__label" for="' + id + '">' + esc(o.label) + "</label>";
      if (o.hint) html += '<div class="govbb-radio-item__hint" id="' + id + '-hint">' + esc(o.hint) + "</div>";
      html += "</div>";
    });
    html += "</fieldset></div>";
    return html;
  }

  function checkboxField(field, value, errors, asHeading) {
    value = value || [];
    var e = errors && errors[field.key];
    var html = '<div class="govbb-form-group">';
    html += '<fieldset class="govbb-fieldset"' + describedBy(field, e) + '>';
    var legendText = esc(field.legend || field.label);
    html += '<legend class="govbb-fieldset__legend">' + (asHeading ? '<h1 class="govbb-text-h1">' + legendText + "</h1>" : legendText) + "</legend>";
    if (field.hint) html += '<div class="govbb-hint" id="' + field.key + '-hint">' + esc(field.hint) + "</div>";
    if (e) html += '<p class="govbb-error-message" id="' + field.key + '-error">' + esc(e) + "</p>";
    field.options.forEach(function (o) {
      var id = field.key + "-" + o.value;
      html += '<div class="govbb-checkbox-item">';
      html += '<input class="govbb-checkbox" type="checkbox" id="' + id + '" name="' + field.key + '" value="' + esc(o.value) + '"'
        + (value.indexOf(o.value) !== -1 ? " checked" : "") + (e ? ' aria-invalid="true"' : "") + ">";
      html += '<label class="govbb-checkbox-item__label" for="' + id + '">' + esc(o.label) + "</label>";
      html += "</div>";
    });
    html += "</fieldset></div>";
    return html;
  }

  function describedBy(field, e) {
    var d = [];
    if (field.hint) d.push(field.key + "-hint");
    if (e) d.push(field.key + "-error");
    return d.length ? ' aria-describedby="' + d.join(" ") + '"' : "";
  }

  function textField(field, value, errors) {
    var e = errors && errors[field.key];
    var type = field.type === "textarea" ? "textarea" : "input";
    var html = '<div class="govbb-form-group">';
    html += '<label class="govbb-label" for="' + field.key + '">' + esc(field.label) + "</label>";
    if (field.hint) html += '<div class="govbb-hint" id="' + field.key + '-hint">' + esc(field.hint) + "</div>";
    if (e) html += '<p class="govbb-error-message" id="' + field.key + '-error">' + esc(e) + "</p>";
    var inputType = field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "number" ? "number"
      : field.type === "date" ? "date" : field.type === "time" ? "time" : "text";
    if (field.type === "textarea") {
      html += '<div class="govbb-input-wrapper"><textarea class="govbb-textarea" id="' + field.key + '" name="' + field.key + '" rows="' + (field.rows || 4) + '"'
        + describedBy(field, e) + (e ? ' aria-invalid="true"' : "") + ">" + esc(value || "") + "</textarea></div>";
    } else {
      html += '<div class="govbb-input-wrapper"><input class="govbb-input" id="' + field.key + '" name="' + field.key + '" type="' + inputType + '"'
        + (field.inputmode ? ' inputmode="' + field.inputmode + '"' : "")
        + (field.min != null ? ' min="' + field.min + '"' : "")
        + ' value="' + esc(value || "") + '"' + describedBy(field, e) + (e ? ' aria-invalid="true"' : "") + "></div>";
    }
    html += "</div>";
    return html;
  }

  function fileField(field, value, errors) {
    var html = '<div class="govbb-form-group">';
    html += '<label class="govbb-label" for="' + field.key + '">' + esc(field.label) + "</label>";
    if (field.hint) html += '<div class="govbb-hint" id="' + field.key + '-hint">' + esc(field.hint) + "</div>";
    html += '<input id="' + field.key + '" name="' + field.key + '" type="file"'
      + (field.hint ? ' aria-describedby="' + field.key + '-hint"' : "") + ">";
    if (value) html += '<p class="govbb-hint">Selected: ' + esc(value) + " (name only; the file is not stored in this prototype)</p>";
    html += "</div>";
    return html;
  }

  function renderField(field, value, errors, asHeading) {
    if (field.type === "radio") return radioField(field, value, errors, asHeading);
    if (field.type === "checkbox") return checkboxField(field, value, errors, asHeading);
    if (field.type === "file") return fileField(field, value, errors);
    return textField(field, value, errors);
  }

  /* ---------------- generic screen assembly ---------------- */
  function backLink() {
    return '<a class="govbb-back-link" href="#" data-back>'
      + '<svg class="govbb-back-link__icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>'
      + 'Back</a>';
  }

  function errorSummary(errors, fieldOrder) {
    var keys = fieldOrder.filter(function (k) { return errors[k]; });
    if (!keys.length) return "";
    var html = '<div class="govbb-error-summary" id="error-summary" tabindex="-1" aria-labelledby="error-summary-title">';
    html += '<p class="govbb-error-summary__title" id="error-summary-title">There is a problem</p>';
    html += '<div class="govbb-error-summary__body"><ul class="govbb-error-summary__list">';
    keys.forEach(function (k) { html += '<li><a class="govbb-error-summary__link" href="#' + k + '">' + esc(errors[k]) + "</a></li>"; });
    html += "</ul></div></div>";
    return html;
  }

  /* validate a list of fields against submitted values */
  function validateFields(fields, values, s) {
    var errors = {};
    fields.forEach(function (f) {
      var v = values[f.key];
      if (f.type === "checkbox") {
        if (f.required && (!v || !v.length)) errors[f.key] = f.errorRequired;
      } else if (f.type === "file") {
        /* uploads optional in prototype */
      } else {
        if (f.required && (!v || !String(v).trim())) { errors[f.key] = f.errorRequired; return; }
        if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.key] = f.errorFormat || "Enter an email address in the correct format";
        if (v && f.type === "number") {
          var n = Number(v);
          if (!/^\d+$/.test(String(v).trim())) errors[f.key] = f.errorFormat || "Enter a whole number";
          else if (f.min != null && n < f.min) errors[f.key] = f.errorFormat || ("Enter a whole number greater than " + (f.min - 1));
        }
      }
      if (!errors[f.key] && f.validate) { var m = f.validate(v, values, s); if (m) errors[f.key] = m; }
    });
    return errors;
  }

  function readValues(form, fields) {
    var out = {};
    fields.forEach(function (f) {
      if (f.type === "checkbox") {
        out[f.key] = Array.prototype.slice.call(form.querySelectorAll('input[name="' + f.key + '"]:checked')).map(function (i) { return i.value; });
      } else if (f.type === "radio") {
        var c = form.querySelector('input[name="' + f.key + '"]:checked'); out[f.key] = c ? c.value : "";
      } else if (f.type === "file") {
        var fi = form.querySelector('input[name="' + f.key + '"]'); out[f.key] = fi && fi.files && fi.files[0] ? fi.files[0].name : (form.getAttribute("data-file-" + f.key) || "");
      } else {
        var el = form.querySelector('[name="' + f.key + '"]'); out[f.key] = el ? el.value.trim() : "";
      }
    });
    return out;
  }

  /* human-readable value for check your answers */
  function displayValue(field, value) {
    if (field.type === "checkbox") {
      var vals = Array.isArray(value) ? value : (value ? [value] : []); // tolerate stale non-array state
      if (!vals.length) return "";
      return vals.map(function (v) { var o = field.options.filter(function (o) { return o.value === v; })[0]; return o ? o.label : v; }).join(", ");
    }
    if (field.type === "radio") { var o = field.options.filter(function (o) { return o.value === value; })[0]; return o ? o.label : value; }
    if (field.type === "file") return value ? value : "Not uploaded";
    return value;
  }

  /* ---------------- tester autofill (dev mode only) ---------------- */
  function autofillForm(form) {
    var seen = {};
    Array.prototype.forEach.call(form.querySelectorAll('input[type="radio"], input[type="checkbox"]'), function (b) {
      if (!seen[b.name]) { b.checked = true; seen[b.name] = 1; } // first option of each group
    });
    Array.prototype.forEach.call(form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="date"], input[type="time"], textarea'), function (el) {
      if (el.readOnly || el.disabled || el.value) return;
      el.value = sampleForEl(el);
    });
  }
  function sampleForEl(el) {
    var t = el.type, n = el.name || "";
    if (t === "email") return "tester@example.com";
    if (t === "tel") return "+1 246 555 0100";
    if (t === "date") return "2026-12-01";
    if (t === "time") return /finish/.test(n) ? "22:00" : "10:00";
    if (t === "number") return /attendance/.test(n) ? "150" : (/stalls/.test(n) ? "8" : "3");
    var map = {
      "yd-first": "Test", "yd-last": "Tester", "rep-name": "Test Organisation",
      "org-name": "Test Organiser", "cat-name": "Test Catering", "event-name": "Test Event",
      "food-dishes": "Fish cakes, rice, fruit juice", "food-sources": "Local market and supermarket",
      "water": "Mains water supply", "handwashing": "Handwashing station with soap and paper towels",
      "waste": "Covered bins, collected daily", "transport": "Insulated boxes in a covered van",
      "raw-food-detail": "Marinated raw chicken", "hot-holding-detail": "Chafing dishes",
      "cold-holding-detail": "Ice packs and coolers", "ref-number": "EHO-TEST01", "cs-name": "Test Tester"
    };
    if (map[n]) return map[n];
    if (/addr1$/.test(n)) return "1 Test Street";
    if (/addr2$/.test(n)) return "";
    if (t === "textarea") return "Test details";
    return "Test";
  }

  /* =====================================================================
     SCREENS
     ===================================================================== */
  var SCREENS = {};

  /* ---- start (entry) ---- */
  SCREENS.start = {
    section: null, title: null, active: function () { return true; }, custom: true,
    render: function () {
      return ''
        + '<h1 class="govbb-text-h1">' + esc(SERVICE_TITLE) + "</h1>"
        + '<p class="govbb-font-body">You can use this service to:</p>'
        + '<ul class="govbb-list govbb-list--bullet"><li>request Environmental Health food safety checks</li>'
        + "<li>apply for a temporary restaurant licence</li><li>do both</li></ul>"
        + '<p><a class="govbb-btn" href="#" data-startnew>Start now</a></p>'
        + '<h2 class="govbb-text-h2">If you are applying for a temporary restaurant licence</h2>'
        + '<p class="govbb-font-body">A temporary restaurant can be a food or drink stall, bar or other temporary food or drink setup.</p>'
        + '<p class="govbb-font-body">It can be part of an event, but it does not have to be.</p>'
        + '<p class="govbb-font-body">It must run for <strong>30 days or less</strong>.</p>'
        + '<p class="govbb-font-body">The 30-day limit only applies to the temporary restaurant licence. It does not apply to the food safety checks request.</p>'
        + '<h2 class="govbb-text-h2">What you need before you start</h2>'
        + '<p class="govbb-font-body">Depending on what you are doing, you may need:</p>'
        + '<ul class="govbb-list govbb-list--bullet">'
        + "<li>a site plan, if Environmental Health needs to check where food and drink will be prepared, served or sold</li>"
        + "<li>a list of the food and drink stalls, bars or temporary restaurants, if there is more than one</li>"
        + "<li>a plan showing how the stall, bar or temporary restaurant will be set up, if you are applying for a temporary restaurant licence</li>"
        + "<li>the medical certificate needed for the application</li>"
        + "<li>a copy of the food business licence, if the business has one</li>"
        + "<li>the reference number from an earlier food safety checks request, if one has already been sent</li></ul>"
        + '<p class="govbb-font-body">You should also know where the food and drink will be prepared and how it will be stored, taken to where it will be served or sold, and served.</p>'
        + '<h2 class="govbb-text-h2">How long it takes</h2>'
        + '<p class="govbb-font-body">The form should take about <strong>15 minutes</strong> to complete if you have everything you need.</p>'
        + '<h2 class="govbb-text-h2">What happens after you send the form</h2>'
        + '<ul class="govbb-list govbb-list--bullet"><li>Environmental Health will review your request or application.</li>'
        + "<li>If you send both, they will be reviewed separately.</li>"
        + "<li>The Ministry of Health and Wellness may contact you if it needs more information.</li></ul>"
        + '<p><a class="govbb-btn" href="#" data-startnew>Start now</a></p>';
    }
  };

  /* ---- task routing ---- */
  SCREENS.task = {
    section: null, custom: false, title: "What are you using this service to do?",
    active: function () { return true; },
    fields: [{
      key: "task", type: "radio", legend: "What are you using this service to do?", required: true,
      errorRequired: "Select what you are using this service to do.",
      options: [
        { value: "checks", label: "Request Environmental Health food safety checks" },
        { value: "licence", label: "Apply for a temporary restaurant licence" },
        { value: "both", label: "Do both" }
      ]
    }],
    onSave: function (s, v) { s.task = v.task; },
    next: function (s) { return computeNext("task", s); }
  };

  /* ---- is this for an event? (routing only) ---- */
  SCREENS["is-event"] = {
    section: null, title: "Is this for an event?",
    active: function () { return true; },
    fields: [{
      key: "is-event", type: "radio", legend: "Is this for an event?",
      required: true, errorRequired: "Select whether this is for an event.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]
    }],
    next: function (s) { return computeNext("is-event", s); }
  };

  /* ---- eligibility: duration ---- */
  SCREENS["elig-duration"] = {
    section: "licence", title: "Will the temporary restaurant run for 30 days or less?",
    active: function (s, d) { return d.task === "licence" || d.task === "both"; },
    fields: [{
      key: "elig-duration", type: "radio",
      legend: "Will the temporary restaurant run for 30 days or less?",
      hint: "A temporary restaurant can be a food or drink stall, bar or other temporary food or drink setup.",
      required: true, errorRequired: "Select whether the temporary restaurant will run for 30 days or less.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]
    }],
    next: function (s) {
      if (A(s, "elig-duration") === "no") return s.task === "both" ? "elig-duration-both" : "elig-duration-exit";
      return computeNext("elig-duration", s);
    }
  };
  SCREENS["elig-duration-exit"] = exitScreen(
    "You cannot apply for a temporary restaurant licence using this service",
    ["The temporary restaurant must run for 30 days or less.", "You may need a different food business or restaurant licence."],
    "findlicence");
  SCREENS["elig-duration-both"] = continueChecksScreen(
    "You cannot apply for a temporary restaurant licence using this service",
    ["The temporary restaurant must run for 30 days or less.", "You can still continue with your request for Environmental Health food safety checks."]);

  /* ---- existing food safety checks request ---- */
  SCREENS["existing-request"] = {
    section: null, title: "Has a request for Environmental Health food safety checks already been sent?",
    active: function (s, d) { return d.licence && (d.task === "licence" || d.task === "both"); },
    prepare: function (s) {
      var where = A(s, "is-event") === "yes" ? "this event" : "this place";
      this.fields[0].legend = "Has a request for Environmental Health food safety checks already been sent for " + where + "?";
    },
    fields: [{
      key: "existing-request", type: "radio",
      legend: "Has a request for Environmental Health food safety checks already been sent for this place?",
      required: true, errorRequired: "Select whether a request for Environmental Health food safety checks has already been sent.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "notsure", label: "Not sure" }]
    }],
    next: function (s) {
      var v = A(s, "existing-request");
      if (v === "notsure") return "existing-notsure";
      if (v === "yes") return s.task === "both" ? "existing-both-dup" : "ref-availability";
      return computeNext("existing-request", s); // No
    }
  };
  SCREENS["existing-both-dup"] = {
    section: null, custom: true, title: "An Environmental Health food safety checks request has already been sent",
    active: function () { return false; },
    render: function () {
      return backLink()
        + '<h1 class="govbb-text-h1">An Environmental Health food safety checks request has already been sent</h1>'
        + '<p class="govbb-font-body">We will not send another request.</p>'
        + '<p class="govbb-font-body">You can continue with the temporary restaurant licence application.</p>'
        + '<p><button type="button" class="govbb-btn" data-goto="ref-availability">Continue</button></p>';
    }
  };
  SCREENS["existing-notsure"] = {
    section: null, custom: true, title: "Check whether a request has already been sent",
    active: function () { return false; },
    render: function () {
      return backLink()
        + '<h1 class="govbb-text-h1">Check whether a request has already been sent</h1>'
        + '<p class="govbb-font-body">Sending another request could create a duplicate.</p>'
        + '<p class="govbb-font-body">If you can, check with the person or organisation responsible before you continue.</p>'
        + '<p><button type="button" class="govbb-btn" data-goto="existing-request">I have checked</button></p>'
        + '<p><a class="govbb-link" href="#" data-back>Go back</a></p>';
    }
  };

  /* ---- event reference ---- */
  SCREENS["ref-availability"] = {
    section: null, title: "Do you have the reference number?",
    active: function (s) { return A(s, "existing-request") === "yes"; },
    fields: [{
      key: "ref-availability", type: "radio",
      legend: "Do you have the reference number?",
      hint: "This number is given after a request for Environmental Health food safety checks is sent. We use it to match this application to the earlier request.",
      required: true, errorRequired: "Select whether you have the reference number.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]
    }],
    next: function (s) { return A(s, "ref-availability") === "yes" ? "ref-enter" : computeNext("ref-availability", s); }
  };
  SCREENS["ref-enter"] = {
    section: null, title: "What is the reference number?",
    active: function (s) { return A(s, "ref-availability") === "yes"; },
    fields: [{
      key: "ref-number", type: "text", label: "Reference number",
      hint: "You can find it in the confirmation for the Environmental Health food safety checks request.",
      required: true, errorRequired: "Enter the reference number."
    }],
    next: function (s) {
      // prototype simulation: references starting EHO- match a demo event
      return /^EHO-/i.test((A(s, "ref-number") || "").trim()) ? "ref-match" : "ref-nomatch";
    }
  };
  SCREENS["ref-match"] = {
    section: null, title: "Is this the event?",
    active: function (s) { return A(s, "ref-availability") === "yes" && /^EHO-/i.test((A(s, "ref-number") || "").trim()); },
    custom: true,
    prepare: function (s) {
      var isEvent = A(s, "is-event") === "yes";
      this.title = isEvent ? "Is this the event?" : "Is this the right place?";
      this.fields[0].errorRequired = isEvent ? "Select whether this is the event." : "Select whether this is the right place.";
    },
    render: function (s, d, errors) {
      var e = errors && errors["ref-match"];
      function row(k, v) { return '<div class="govbb-summary-list__row"><dt class="govbb-summary-list__key">' + esc(k) + '</dt><dd class="govbb-summary-list__value">' + esc(v) + "</dd></div>"; }
      var isEvent = d.isEvent;
      var h1 = isEvent ? "Is this the event?" : "Is this the right place?";
      var rows = isEvent
        ? row("Event name", "Crop Over Village Food Fair") + row("Location", "Kensington Oval, Fontabelle, Saint Michael") + row("Date or dates", "1 to 3 August 2026")
        : row("Address", "12 Roebuck Street, Bridgetown, Saint Michael") + row("Date of the earlier request", "14 August 2026");
      var html = backLink() + errorSummary(errors || {}, ["ref-match"]);
      html += '<form id="screen-form" novalidate>';
      html += '<div class="govbb-form-group"><fieldset class="govbb-fieldset"' + (e ? ' aria-describedby="ref-match-error"' : "") + '>';
      html += '<legend class="govbb-fieldset__legend"><h1 class="govbb-text-h1">' + esc(h1) + '</h1></legend>';
      if (e) html += '<p class="govbb-error-message" id="ref-match-error">' + esc(e) + "</p>";
      html += '<dl class="govbb-summary-list">' + rows + "</dl>";
      ["yes", "no"].forEach(function (val) {
        var id = "ref-match-" + val;
        html += '<div class="govbb-radio-item"><input class="govbb-radio" type="radio" id="' + id + '" name="ref-match" value="' + val + '"'
          + (A(s, "ref-match") === val ? " checked" : "") + (e ? ' aria-invalid="true"' : "") + '>'
          + '<label class="govbb-radio-item__label" for="' + id + '">' + (val === "yes" ? "Yes" : "No") + "</label></div>";
      });
      html += "</fieldset></div><button type=\"submit\" class=\"govbb-btn\">Continue</button></form>";
      return html;
    },
    fields: [{ key: "ref-match", type: "radio", required: true, errorRequired: "Select whether this is the event.", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] }],
    onSave: function (s, v) {
      if (v["ref-match"] === "yes") {
        if (A(s, "is-event") === "yes") {
          s.answers["event-name"] = "Crop Over Village Food Fair";
          s.answers["_matched-location"] = "Kensington Oval, Fontabelle, Saint Michael";
          s.answers["_matched-dates"] = "1 to 3 August 2026";
        } else {
          s.answers["_matched-location"] = "12 Roebuck Street, Bridgetown, Saint Michael";
          s.answers["_matched-date"] = "14 August 2026";
        }
      }
    },
    next: function (s) { return A(s, "ref-match") === "yes" ? computeNext("ref-match", s) : "ref-enter"; }
  };
  SCREENS["ref-nomatch"] = {
    section: null, custom: true, title: "We could not find a match",
    active: function () { return false; },
    render: function () {
      return backLink()
        + '<h1 class="govbb-text-h1">We could not find a match</h1>'
        + '<p class="govbb-font-body">Check the reference number and try again.</p>'
        + '<p class="govbb-font-body">You can also continue without the number and enter the details yourself.</p>'
        + '<p><button type="button" class="govbb-btn" data-goto="ref-enter">Try the number again</button></p>'
        + '<p><a class="govbb-link" href="#" data-goto-manual>Enter the details</a></p>';
    }
  };

  /* ---- person completing the form ---- */
  SCREENS["person-completing"] = {
    section: "person", title: "Are you filling in this form for yourself?",
    active: function () { return true; },
    fields: [{
      key: "person-completing", type: "radio", legend: "Are you filling in this form for yourself?",
      required: true, errorRequired: "Select whether you are filling in this form for yourself.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No, I am filling it in for someone else" }]
    }],
    next: function (s) { return computeNext("person-completing", s); }
  };
  SCREENS["your-details"] = {
    section: "person", title: "Your details", kind: "form", h1: "Your details",
    intro: function (s) { return A(s, "person-completing") === "no" ? "These are the details of the person filling in this form." : ""; },
    active: function () { return true; },
    fields: [
      { key: "yd-first", type: "text", label: "First name", required: true, errorRequired: "Enter your first name" },
      { key: "yd-middle", type: "text", label: "Middle name or names (optional)" },
      { key: "yd-last", type: "text", label: "Last name", required: true, errorRequired: "Enter your last name" },
      { key: "yd-tel", type: "tel", label: "Telephone number", hint: "You can enter a Barbados or international number.", inputmode: "tel", required: true, errorRequired: "Enter a telephone number" },
      { key: "yd-tel2", type: "tel", label: "Another telephone number (optional)", inputmode: "tel" },
      { key: "yd-email", type: "email", label: "Email address", inputmode: "email", required: true, errorRequired: "Enter an email address", errorFormat: "Enter an email address in the correct format" },
      { key: "yd-addr1", type: "text", label: "Street address line 1", required: true, errorRequired: "Enter street address line 1" },
      { key: "yd-addr2", type: "text", label: "Street address line 2 (optional)" },
      { key: "yd-parish", type: "radio", label: "Parish", legend: "Parish", required: true, errorRequired: "Select a parish", options: parishOptions() }
    ],
    next: function (s) { return computeNext("your-details", s); }
  };
  SCREENS.represented = {
    section: "represented", title: "Who are you filling in this form for?", kind: "form", h1: "Who are you filling in this form for?",
    active: function (s) { return A(s, "person-completing") === "no"; },
    fields: [
      { key: "rep-name", type: "text", label: "Name of person, business or organisation", required: true, errorRequired: "Enter the name of the person, business or organisation" },
      { key: "rep-tel", type: "tel", label: "Telephone number", inputmode: "tel", required: true, errorRequired: "Enter a telephone number" },
      { key: "rep-email", type: "email", label: "Email address (optional)", inputmode: "email", errorFormat: "Enter an email address in the correct format" },
      { key: "rep-addr1", type: "text", label: "Street address line 1", required: true, errorRequired: "Enter street address line 1" },
      { key: "rep-addr2", type: "text", label: "Street address line 2 (optional)" },
      { key: "rep-parish", type: "radio", legend: "Parish", required: true, errorRequired: "Select a parish", options: parishOptions() }
    ],
    next: function (s) { return computeNext("represented", s); }
  };

  /* ---- event identification (skipped when matched) ---- */
  SCREENS["event-name"] = {
    section: "event", title: "What is the name of the event?",
    active: function (s, d) { return d.isEvent && !d.matchedEvent; },
    fields: [{ key: "event-name", type: "text", label: "Event name", required: true, errorRequired: "Enter the name of the event." }],
    next: function (s) { return computeNext("event-name", s); }
  };
  SCREENS["event-location"] = {
    section: "event", title: "Where will the event take place?", kind: "form", h1: "Where will the event take place?",
    active: function (s, d) { return d.isEvent && !d.matchedEvent; },
    fields: [
      { key: "evt-addr1", type: "text", label: "Street address line 1", required: true, errorRequired: "Enter street address line 1" },
      { key: "evt-addr2", type: "text", label: "Street address line 2 (optional)" },
      { key: "evt-parish", type: "radio", legend: "Parish", required: true, errorRequired: "Select a parish", options: parishOptions() },
      { key: "evt-directions", type: "text", label: "Directions or nearby landmark (optional)" }
    ],
    next: function (s) { return computeNext("event-location", s); }
  };
  SCREENS["event-dates"] = {
    section: "event", title: "When will the event take place?", kind: "form", h1: "When will the event take place?",
    active: function (s, d) { return d.isEvent && !d.matchedEvent; },
    fields: [
      { key: "evt-start", type: "date", label: "Start date", required: true, errorRequired: "Enter the start date" },
      { key: "evt-end", type: "date", label: "End date", hint: "Use the same date if the event lasts for 1 day.", required: true, errorRequired: "Enter the end date",
        validate: function (v, all) { if (all["evt-start"] && v && v < all["evt-start"]) return "The end date must be the same as or after the start date"; return null; } }
    ],
    next: function (s) {
      var start = A(s, "evt-start");
      if (start) {
        var days = Math.ceil((new Date(start) - new Date()) / 86400000);
        if (days < 14) return "event-dates-warning";
      }
      return computeNext("event-dates", s);
    }
  };
  SCREENS["event-dates-warning"] = {
    section: null, custom: true, title: "Your event is less than 14 days away",
    active: function () { return false; },
    render: function () {
      return backLink()
        + '<h1 class="govbb-text-h1">Your event is less than 14 days away</h1>'
        + '<p class="govbb-font-body">Environmental Health asks people to contact them at least 14 days before an event.</p>'
        + '<p class="govbb-font-body">You can continue with this prototype.</p>'
        + '<p><button type="button" class="govbb-btn" data-goto="__after-event-dates">Continue</button></p>'
        + '<p><a class="govbb-link" href="#" data-goto="event-dates">Change event date</a></p>';
    }
  };
  SCREENS["event-times"] = {
    section: "event", title: "What time will the event start and finish?", kind: "form", h1: "What time will the event start and finish?",
    active: function (s, d) { return d.isEvent && !d.matchedEvent; },
    fields: [
      { key: "evt-time-start", type: "time", label: "Start time", required: true, errorRequired: "Enter the start time" },
      { key: "evt-time-finish", type: "time", label: "Finish time", required: true, errorRequired: "Enter the finish time" }
    ],
    next: function (s) { return computeNext("event-times", s); }
  };
  SCREENS["event-organiser"] = {
    section: "event", title: "Who is organising the event?", kind: "form", h1: "Who is organising the event?",
    active: function (s, d) { return d.isEvent && !d.matchedEvent; },
    fields: [
      { key: "org-same", type: "checkbox", legend: "If the same person, business or organisation is organising the event",
        options: [{ value: "yes", label: "Use the same details" }] },
      { key: "org-name", type: "text", label: "Name of person or organisation",
        validate: function (v, all) { return (all["org-same"] || []).indexOf("yes") !== -1 ? null : ((v && v.trim()) ? null : "Enter the name of the person or organisation organising the event"); } },
      { key: "org-tel", type: "tel", label: "Telephone number", inputmode: "tel",
        validate: function (v, all) { return (all["org-same"] || []).indexOf("yes") !== -1 ? null : ((v && v.trim()) ? null : "Enter a telephone number"); } },
      { key: "org-email", type: "email", label: "Email address (optional)", inputmode: "email", errorFormat: "Enter an email address in the correct format" }
    ],
    onSave: function (s, v) {
      if ((v["org-same"] || []).indexOf("yes") !== -1) {
        if (A(s, "person-completing") === "no") {
          s.answers["org-name"] = A(s, "rep-name") || "";
          s.answers["org-tel"] = A(s, "rep-tel") || "";
          s.answers["org-email"] = A(s, "rep-email") || "";
        } else {
          s.answers["org-name"] = ((A(s, "yd-first") || "") + " " + (A(s, "yd-last") || "")).trim();
          s.answers["org-tel"] = A(s, "yd-tel") || "";
          s.answers["org-email"] = A(s, "yd-email") || "";
        }
      }
    },
    next: function (s) { return computeNext("event-organiser", s); }
  };

  /* ---- event size (new checks request) ---- */
  SCREENS["event-size"] = {
    section: "checks", title: "Tell us about the size of the event", kind: "form", h1: "Tell us about the size of the event",
    active: function (s, d) { return d.isEvent && d.newChecks; },
    fields: [
      { key: "size-attendance", type: "number", min: 0, inputmode: "numeric", label: "Expected number of people attending", hint: "Enter your best estimate.", required: true, errorRequired: "Enter the expected number of people attending", errorFormat: "Enter a whole number" },
      { key: "size-stalls", type: "number", min: 0, inputmode: "numeric", label: "Number of food or drink stalls, bars and temporary restaurants", required: true, errorRequired: "Enter the number of food or drink stalls, bars and temporary restaurants", errorFormat: "Enter a whole number" }
    ],
    next: function (s) { return computeNext("event-size", s); }
  };

  /* ---- non-event location and date ---- */
  SCREENS["ns-checks-location"] = {
    section: "nsloc-checks", title: "Where are the food safety checks needed?", kind: "form", h1: "Where are the food safety checks needed?",
    active: function (s, d) { return !d.isEvent && d.newChecks && !d.licence && !d.matchedEvent; },
    fields: [
      { key: "nsc-addr1", type: "text", label: "Street address line 1", required: true, errorRequired: "Enter street address line 1" },
      { key: "nsc-addr2", type: "text", label: "Street address line 2 (optional)" },
      { key: "nsc-parish", type: "radio", legend: "Parish", required: true, errorRequired: "Select a parish", options: parishOptions() },
      { key: "nsc-directions", type: "text", label: "Directions or nearby landmark (optional)" }
    ],
    next: function (s) { return computeNext("ns-checks-location", s); }
  };
  SCREENS["ns-checks-date"] = {
    section: "nsloc-checks", title: "When are the food safety checks needed?",
    active: function (s, d) { return !d.isEvent && d.newChecks && !d.licence; },
    fields: [{ key: "nsc-date", type: "date", label: "Date", required: true, errorRequired: "Enter the date" }],
    next: function (s) { return computeNext("ns-checks-date", s); }
  };
  SCREENS["ns-licence-location"] = {
    section: "nsloc-licence", title: "Where will the temporary restaurant be located?", kind: "form", h1: "Where will the temporary restaurant be located?",
    active: function (s, d) { return !d.isEvent && d.licence && !d.matchedEvent; },
    fields: [
      { key: "nsl-addr1", type: "text", label: "Street address line 1", required: true, errorRequired: "Enter street address line 1" },
      { key: "nsl-addr2", type: "text", label: "Street address line 2 (optional)" },
      { key: "nsl-parish", type: "radio", legend: "Parish", required: true, errorRequired: "Select a parish", options: parishOptions() },
      { key: "nsl-directions", type: "text", label: "Directions or nearby landmark (optional)" }
    ],
    next: function (s) { return computeNext("ns-licence-location", s); }
  };
  SCREENS["ns-licence-dates"] = {
    section: "nsloc-licence", title: "When will the temporary restaurant run?", kind: "form", h1: "When will the temporary restaurant run?",
    active: function (s, d) { return !d.isEvent && d.licence; },
    fields: [
      { key: "nsl-start", type: "date", label: "Start date", required: true, errorRequired: "Enter the start date" },
      { key: "nsl-end", type: "date", label: "End date", hint: "Use the same date if it will run for 1 day.", required: true, errorRequired: "Enter the end date",
        validate: function (v, all) { if (all["nsl-start"] && v && v < all["nsl-start"]) return "The end date must be the same as or after the start date"; return null; } }
    ],
    next: function (s) { return computeNext("ns-licence-dates", s); }
  };

  /* ---- licence: food and drink ---- */
  SCREENS["food-types"] = {
    section: "licence", title: "What types of food and drink will be served?",
    active: function (s, d) { return d.licence; },
    fields: [{
      key: "food-types", type: "checkbox", legend: "What types of food and drink will be served?", hint: "Select all that apply.",
      required: true, errorRequired: "Select the types of food and drink that will be served.",
      options: [
        { value: "cooked", label: "Cooked meals or hot food" },
        { value: "meat", label: "Meat or poultry" },
        { value: "fish", label: "Fish or seafood" },
        { value: "salads", label: "Salads, cut fruit or other uncooked food" },
        { value: "baked", label: "Baked goods or desserts" },
        { value: "prepackaged", label: "Pre-packaged food or snacks" },
        { value: "drinks", label: "Drinks" },
        { value: "other", label: "Other food" }
      ]
    }],
    next: function (s) { return computeNext("food-types", s); }
  };
  SCREENS["food-dishes"] = {
    section: "licence", title: "What food and drink will be served?",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "food-dishes", type: "textarea", label: "Food and drink", hint: "List the main dishes and drinks. For example, fish cakes, chicken and rice, sushi, cakes, fruit juice or bottled water.", required: true, errorRequired: "Enter the main food and drink that will be served." }],
    next: function (s) { return computeNext("food-dishes", s); }
  };
  SCREENS["prep-location"] = {
    section: "licence", title: "Where will the food and drink be prepared?",
    active: function (s, d) { return d.licence; },
    fields: [{
      key: "prep-location", type: "checkbox", legend: "Where will the food and drink be prepared?", hint: "Select all that apply.",
      required: true, errorRequired: "Select where the food and drink will be prepared.",
      exclusive: "none",
      options: [
        { value: "atevent", label: "Where it will be served or sold" },
        { value: "elsewhere", label: "Somewhere else" },
        { value: "none", label: "No food or drink will be prepared" }
      ]
    }],
    onSave: function (s, v) { var arr = v["prep-location"] || []; if (arr.indexOf("none") !== -1) v["prep-location"] = ["none"]; s.answers["prep-location"] = v["prep-location"]; },
    next: function (s) { return computeNext("prep-location", s); }
  };
  SCREENS["prep-who"] = {
    section: "licence", title: "Who will prepare the food and drink?",
    active: function (s, d) { return d.licence && d.preparedAny; },
    fields: [{
      key: "prep-who", type: "radio", legend: "Who will prepare the food and drink?",
      required: true, errorRequired: "Select who will prepare the food and drink.",
      options: [
        { value: "self", label: "The person or business running the stall, bar or temporary restaurant" },
        { value: "caterer", label: "A caterer or another food business" },
        { value: "both", label: "Both" }
      ]
    }],
    next: function (s) { return computeNext("prep-who", s); }
  };
  SCREENS["prep-caterer"] = {
    section: "licence", title: "Tell us about the caterer or food business", kind: "form", h1: "Tell us about the caterer or food business",
    active: function (s, d) { return d.licence && d.preparedAny && (d.prepWho === "caterer" || d.prepWho === "both"); },
    fields: [
      { key: "cat-name", type: "text", label: "Name", required: true, errorRequired: "Enter the name of the caterer or food business" },
      { key: "cat-addr1", type: "text", label: "Street address line 1", required: true, errorRequired: "Enter street address line 1" },
      { key: "cat-addr2", type: "text", label: "Street address line 2 (optional)" },
      { key: "cat-parish", type: "radio", legend: "Parish", required: true, errorRequired: "Select a parish", options: parishOptions() },
      { key: "cat-tel", type: "tel", label: "Telephone number", inputmode: "tel", required: true, errorRequired: "Enter a telephone number" },
      { key: "cat-email", type: "email", label: "Email address (optional)", inputmode: "email", errorFormat: "Enter an email address in the correct format" }
    ],
    next: function (s) { return computeNext("prep-caterer", s); }
  };

  /* ---- preparation and handling ---- */
  SCREENS["raw-food"] = {
    section: "licence", title: "Will any raw or not fully cooked meat, poultry, fish, seafood or eggs be served?",
    active: function (s, d) { return d.licence && !d.drinksOnly; },
    fields: [{
      key: "raw-food", type: "radio",
      legend: "Will any raw or not fully cooked meat, poultry, fish, seafood or eggs be served?",
      hint: "For example, raw fish in sushi or meat that will not be fully cooked.",
      required: true, errorRequired: "Select whether any raw or not fully cooked meat, poultry, fish, seafood or eggs will be served.",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]
    }],
    next: function (s) { return computeNext("raw-food", s); }
  };
  SCREENS["raw-food-detail"] = {
    section: "licence", title: "What will be served raw or not fully cooked?",
    active: function (s, d) { return d.licence && !d.drinksOnly && A(s, "raw-food") === "yes"; },
    fields: [{ key: "raw-food-detail", type: "textarea", label: "Food", required: true, errorRequired: "Enter what will be served raw or not fully cooked." }],
    next: function (s) { return computeNext("raw-food-detail", s); }
  };
  SCREENS["cooked-before"] = {
    section: "licence", title: "Will any food be cooked somewhere else?",
    active: function (s, d) { return d.licence && d.preparedElsewhere && !d.drinksOnly; },
    fields: [{ key: "cooked-before", type: "radio", legend: "Will any food be cooked somewhere else?", required: true, errorRequired: "Select whether any food will be cooked somewhere else.", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] }],
    next: function (s) { return computeNext("cooked-before", s); }
  };
  SCREENS.reheated = {
    section: "licence", title: "Will any of this food be heated again before it is served?",
    active: function (s, d) { return d.licence && d.preparedElsewhere && !d.drinksOnly && A(s, "cooked-before") === "yes"; },
    fields: [{ key: "reheated", type: "radio", legend: "Will any of this food be heated again before it is served?", required: true, errorRequired: "Select whether any of this food will be heated again before it is served.", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] }],
    next: function (s) { return computeNext("reheated", s); }
  };
  SCREENS["hot-holding"] = {
    section: "licence", title: "Will any food be kept hot before it is served?",
    active: function (s, d) { return d.licence && !d.drinksOnly; },
    fields: [{ key: "hot-holding", type: "radio", legend: "Will any food be kept hot before it is served?", required: true, errorRequired: "Select whether any food will be kept hot before it is served.", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] }],
    next: function (s) { return computeNext("hot-holding", s); }
  };
  SCREENS["hot-holding-detail"] = {
    section: "licence", title: "How will the food be kept hot?",
    active: function (s, d) { return d.licence && !d.drinksOnly && A(s, "hot-holding") === "yes"; },
    fields: [{ key: "hot-holding-detail", type: "textarea", label: "How the food will be kept hot", hint: "Tell us how the food will be kept hot before it is served.", required: true, errorRequired: "Tell us how the food will be kept hot." }],
    next: function (s) { return computeNext("hot-holding-detail", s); }
  };
  SCREENS["cold-holding"] = {
    section: "licence", title: "Will any food or drink be kept cold before it is served?",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "cold-holding", type: "radio", legend: "Will any food or drink be kept cold before it is served?", required: true, errorRequired: "Select whether any food or drink will be kept cold before it is served.", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] }],
    next: function (s) { return computeNext("cold-holding", s); }
  };
  SCREENS["cold-holding-detail"] = {
    section: "licence", title: "How will the food or drink be kept cold?",
    active: function (s, d) { return d.licence && A(s, "cold-holding") === "yes"; },
    fields: [{ key: "cold-holding-detail", type: "textarea", label: "How the food or drink will be kept cold", hint: "Tell us how the food or drink will be kept cold before it is served.", required: true, errorRequired: "Tell us how the food or drink will be kept cold." }],
    next: function (s) { return computeNext("cold-holding-detail", s); }
  };
  SCREENS.transport = {
    section: "licence", title: "How will the food and drink be taken to where it will be served or sold?",
    active: function (s, d) { return d.licence && d.preparedElsewhere; },
    fields: [{ key: "transport", type: "textarea", label: "How the food and drink will be taken there", hint: "Tell us how it will be packed and taken there.", required: true, errorRequired: "Tell us how the food and drink will be taken to where it will be served or sold." }],
    next: function (s) { return computeNext("transport", s); }
  };
  SCREENS["food-sources"] = {
    section: "licence", title: "Where will the food and drink come from?",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "food-sources", type: "textarea", label: "Food and drink sources", hint: "Give the names and locations of the main shops, markets, suppliers or caterers.", required: true, errorRequired: "Tell us where the food and drink will come from." }],
    next: function (s) { return computeNext("food-sources", s); }
  };
  SCREENS["food-business-licence"] = {
    section: "licence", title: "Does the food or drink business have a current food business licence?",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "food-business-licence", type: "radio", legend: "Does the food or drink business have a current food business licence?", required: true, errorRequired: "Select whether the food or drink business has a current food business licence.", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] }],
    next: function (s) { return computeNext("food-business-licence", s); }
  };
  SCREENS["people-count"] = {
    section: "licence", title: "How many people will prepare, serve or sell food and drink?",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "people-count", type: "number", min: 1, inputmode: "numeric", label: "Number of people", required: true, errorRequired: "Enter the number of people who will prepare, serve or sell food and drink.", errorFormat: "Enter a whole number greater than 0." }],
    next: function (s) { return computeNext("people-count", s); }
  };
  SCREENS.water = {
    section: "licence", title: "Where will the water come from?",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "water", type: "textarea", label: "Water source", hint: "Include water used for drinking, preparing food or drink, washing hands and cleaning.", required: true, errorRequired: "Tell us where the water will come from." }],
    next: function (s) { return computeNext("water", s); }
  };
  SCREENS.handwashing = {
    section: "licence", title: "How will people preparing or serving food wash their hands?",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "handwashing", type: "textarea", label: "How they will wash their hands", required: true, errorRequired: "Tell us how people preparing or serving food will wash their hands." }],
    next: function (s) { return computeNext("handwashing", s); }
  };
  SCREENS.waste = {
    section: "licence", title: "How will rubbish, food waste and used water be stored and removed?",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "waste", type: "textarea", label: "Rubbish, food waste and used water", hint: "Used water includes water from washing and cleaning.", required: true, errorRequired: "Tell us how rubbish, food waste and used water will be stored and removed." }],
    next: function (s) { return computeNext("waste", s); }
  };

  /* ---- documents ---- */
  SCREENS["docs-checks-siteplan"] = {
    section: "checks", title: "Upload the event site plan",
    active: function (s, d) { return d.newChecks; },
    prepare: function (s) {
      var isEvent = A(s, "is-event") === "yes";
      this.title = this.h1 = isEvent ? "Upload the event site plan" : "Upload the site plan";
      this.fields[0].label = isEvent ? "Event site plan" : "Site plan";
      this.fields[0].hint = isEvent
        ? "The plan should show where the food and drink stalls, bars and temporary restaurants will be located."
        : "The plan should show where food and drink will be prepared, served or sold.";
    },
    fields: [{ key: "doc-siteplan", type: "file", label: "Event site plan", hint: "The plan should show where the food and drink stalls, bars and temporary restaurants will be located." }],
    next: function (s) { return computeNext("docs-checks-siteplan", s); }
  };
  SCREENS["docs-checks-setuplist"] = {
    section: "checks", title: "Upload the list of food and drink stalls, bars and temporary restaurants",
    active: function (s, d) { return d.newChecks && d.isEvent; },
    fields: [{ key: "doc-setuplist", type: "file", label: "List of food and drink stalls, bars and temporary restaurants", hint: "Upload a document that lists each one at the event." }],
    next: function (s) { return computeNext("docs-checks-setuplist", s); }
  };
  SCREENS["docs-licence-setupplan"] = {
    section: "licence", title: "Upload a plan of the stall, bar or temporary restaurant",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "doc-setupplan", type: "file", label: "Plan of the stall, bar or temporary restaurant", hint: "The plan should show how it will be set up." }],
    next: function (s) { return computeNext("docs-licence-setupplan", s); }
  };
  SCREENS["docs-licence-medical"] = {
    section: "licence", title: "Upload the medical certificate",
    active: function (s, d) { return d.licence; },
    fields: [{ key: "doc-medical", type: "file", label: "Medical certificate", hint: "Upload the medical certificate required for this application." }],
    next: function (s) { return computeNext("docs-licence-medical", s); }
  };
  SCREENS["docs-licence-fbl"] = {
    section: "licence", title: "Upload the food business licence",
    active: function (s, d) { return d.licence && A(s, "food-business-licence") === "yes"; },
    fields: [{ key: "doc-fbl", type: "file", label: "Food business licence (optional)", hint: "Upload a copy if you have it." }],
    next: function (s) { return computeNext("docs-licence-fbl", s); }
  };

  /* =====================================================================
     Spine order + flow
     ===================================================================== */
  var SPINE = [
    "task", "is-event", "elig-duration", "existing-request",
    "ref-availability", "ref-enter", "ref-match",
    "person-completing", "your-details", "represented",
    "event-name", "event-location", "event-dates", "event-times", "event-organiser", "event-size",
    "ns-checks-location", "ns-checks-date", "ns-licence-location", "ns-licence-dates",
    "food-types", "food-dishes", "prep-location", "prep-who", "prep-caterer",
    "raw-food", "raw-food-detail", "cooked-before", "reheated",
    "hot-holding", "hot-holding-detail", "cold-holding", "cold-holding-detail",
    "transport", "food-sources", "food-business-licence", "people-count",
    "water", "handwashing", "waste",
    "docs-checks-siteplan", "docs-checks-setuplist",
    "docs-licence-setupplan", "docs-licence-medical", "docs-licence-fbl"
  ];

  function isActive(id, s) {
    var sc = SCREENS[id]; if (!sc || !sc.active) return false;
    return sc.active(s, derive(s));
  }
  function isAnswered(id, s) {
    var sc = SCREENS[id]; if (!sc || !sc.fields) return true;
    return sc.fields.every(function (f) {
      if (!f.required) return true;
      var v = s.answers[f.key];
      if (f.type === "checkbox") return v && v.length;
      if (f.type === "file") return true;
      return v != null && String(v).trim() !== "";
    });
  }
  /* next unanswered active spine screen, else check-answers */
  function computeNext(fromId, s) {
    for (var i = 0; i < SPINE.length; i++) {
      var id = SPINE[i];
      if (id === fromId) continue;
      if (isActive(id, s) && !isAnswered(id, s)) return id;
    }
    return "check-answers";
  }

  /* remove answers/files for inactive screens so they are not submitted */
  function pruneInactive(s) {
    SPINE.forEach(function (id) {
      var sc = SCREENS[id];
      if (!sc || !sc.fields) return;
      if (!isActive(id, s)) {
        sc.fields.forEach(function (f) { delete s.answers[f.key]; delete s.files[f.key]; });
      }
    });
    if (derive(s).matchedEvent === false) { /* keep matched cache only if matched */ }
    if (A(s, "ref-match") !== "yes") { delete s.answers["_matched-location"]; delete s.answers["_matched-dates"]; delete s.answers["_matched-date"]; }
  }

  /* =====================================================================
     Check your answers
     ===================================================================== */
  function cyaRow(label, value, changeId) {
    if (value == null || value === "") return "";
    return '<div class="govbb-summary-list__row">'
      + '<dt class="govbb-summary-list__key">' + esc(label) + "</dt>"
      + '<dd class="govbb-summary-list__value">' + esc(value) + "</dd>"
      + '<dd class="govbb-summary-list__action"><a class="govbb-link" href="index.html?screen=' + changeId + '">Change<span class="govbb-visually-hidden"> ' + esc(label) + "</span></a></dd></div>";
  }
  function sectionRowsFor(sectionKey, s) {
    var d = derive(s), rows = "";
    SPINE.forEach(function (id) {
      var sc = SCREENS[id];
      if (!sc || sc.section !== sectionKey || !sc.fields) return;
      if (!isActive(id, s)) return;
      sc.fields.forEach(function (f) {
        var v = s.answers[f.key];
        if (f.type === "file") v = s.files[f.key];
        if (v == null || v === "" || (v.length === 0)) return;
        rows += cyaRow(f.label || f.legend || f.key, displayValue(f, v), id);
      });
    });
    return rows;
  }
  SCREENS["check-answers"] = {
    section: null, custom: true, title: "Check your answers", active: function () { return true; },
    render: function (s) {
      var d = derive(s);
      var html = backLink() + '<h1 class="govbb-text-h1">Check your answers</h1>'
        + '<p class="govbb-font-body">Check the information before you send it.</p>';
      // person
      var personHeading = A(s, "person-completing") === "no" ? "Person filling in the form" : "Your details";
      var personRows = sectionRowsFor("person", s);
      if (personRows) html += '<h2 class="govbb-text-h2">' + esc(personHeading) + '</h2><dl class="govbb-summary-list">' + personRows + "</dl>";
      // person, business or organisation represented
      var repRows = sectionRowsFor("represented", s);
      if (repRows) html += '<h2 class="govbb-text-h2">Person, business or organisation this form is for</h2><dl class="govbb-summary-list">' + repRows + "</dl>";
      // event OR non-event location/date
      if (d.isEvent) {
        var eventRows = sectionRowsFor("event", s);
        if (d.matchedEvent) {
          eventRows = cyaRow("Event reference number", A(s, "ref-number"), "ref-enter")
            + cyaRow("Event name", A(s, "event-name"), "ref-enter")
            + cyaRow("Location", A(s, "_matched-location"), "ref-enter")
            + cyaRow("Date or dates", A(s, "_matched-dates"), "ref-enter");
        }
        if (eventRows) html += '<h2 class="govbb-text-h2">Event</h2><dl class="govbb-summary-list">' + eventRows + "</dl>";
      } else {
        var locChecks = sectionRowsFor("nsloc-checks", s);
        if (locChecks) html += '<h2 class="govbb-text-h2">Location and date</h2><dl class="govbb-summary-list">' + locChecks + "</dl>";
        if (d.licence) {
          var trRows = "";
          if (d.matchedEvent) trRows += cyaRow("Reference number", A(s, "ref-number"), "ref-enter")
            + cyaRow("Location", A(s, "_matched-location"), "ref-enter")
            + cyaRow("Date of the earlier request", A(s, "_matched-date"), "ref-enter");
          trRows += sectionRowsFor("nsloc-licence", s);
          if (trRows) html += '<h2 class="govbb-text-h2">Temporary restaurant</h2><dl class="govbb-summary-list">' + trRows + "</dl>";
        }
      }
      // food safety checks request
      if (d.newChecks) {
        var checksRows = sectionRowsFor("checks", s);
        if (checksRows) html += '<h2 class="govbb-text-h2">Food safety checks request</h2><dl class="govbb-summary-list">' + checksRows + "</dl>";
      }
      // licence application
      if (d.licence) {
        var licRows = sectionRowsFor("licence", s);
        if (licRows) html += '<h2 class="govbb-text-h2">Temporary restaurant licence application</h2><dl class="govbb-summary-list">' + licRows + "</dl>";
      }
      var label = d.newChecks && d.licence ? "Continue to send request and application"
        : d.licence ? "Continue to submit application" : "Continue to send request";
      html += '<p><button type="button" class="govbb-btn" data-goto="confirm-send">' + esc(label) + "</button></p>";
      return html;
    }
  };

  /* =====================================================================
     Confirm and send
     ===================================================================== */
  SCREENS["confirm-send"] = {
    section: null, custom: true, title: "Confirm and send", active: function () { return true; },
    render: function (s, d, errors) {
      d = derive(s); errors = errors || {};
      var both = d.newChecks && d.licence, licOnly = d.licence && !d.newChecks;
      var h1 = both ? "Confirm and send the request and application"
        : licOnly ? "Confirm and submit the application" : "Confirm and send the request";
      var lead = both ? "Check that the information is correct before you send it."
        : licOnly ? "Check that the information is correct before you submit it." : "Check that the information is correct before you send it.";
      var btn = both ? "Send request and application" : licOnly ? "Submit application" : "Send request";
      var order = ["cs-name"];
      var html = backLink() + errorSummary(errors, order.concat(["cs-confirm-request", "cs-confirm-application", "cs-confirm-regs"]));
      html += '<form id="screen-form" novalidate data-confirm="1">';
      html += '<h1 class="govbb-text-h1">' + esc(h1) + "</h1><p class=\"govbb-font-body\">" + esc(lead) + "</p>";
      html += textField({ key: "cs-name", type: "text", label: "Full name", required: true, errorRequired: "Enter your full name" }, A(s, "cs-name"), errors);
      html += '<div class="govbb-form-group"><label class="govbb-label" for="cs-date">Date</label>'
        + '<div class="govbb-input-wrapper"><input class="govbb-input" id="cs-date" name="cs-date" type="text" value="' + esc(today()) + '" readonly></div></div>';
      function chk(key, label) {
        var e = errors[key];
        return '<div class="govbb-form-group govbb-checkbox-item">'
          + (e ? '<p class="govbb-error-message" id="' + key + '-error">' + esc(e) + "</p>" : "")
          + '<input class="govbb-checkbox" type="checkbox" id="' + key + '" name="' + key + '" value="yes"' + (e ? ' aria-invalid="true"' : "") + ">"
          + '<label class="govbb-checkbox-item__label" for="' + key + '">' + esc(label) + "</label></div>";
      }
      if (d.newChecks) html += chk("cs-confirm-request", "I confirm that the information in this request is true and correct to the best of my knowledge.");
      if (d.licence) html += chk("cs-confirm-application", "I confirm that the information in this application is true and correct to the best of my knowledge.");
      if (d.licence) html += chk("cs-confirm-regs", "I confirm that the temporary restaurant will be run in line with the Health Services (Restaurants) Regulations, 1969.");
      html += '<button type="submit" class="govbb-btn">' + esc(btn) + "</button></form>";
      return html;
    },
    submit: function (s, form) {
      var d = derive(s), errors = {};
      var name = (form.querySelector('[name="cs-name"]').value || "").trim();
      if (!name) errors["cs-name"] = "Enter your full name";
      if (d.newChecks && !form.querySelector("#cs-confirm-request").checked) errors["cs-confirm-request"] = "Confirm that the information in this request is true and correct";
      if (d.licence && !form.querySelector("#cs-confirm-application").checked) errors["cs-confirm-application"] = "Confirm that the information in this application is true and correct";
      if (d.licence && !form.querySelector("#cs-confirm-regs").checked) errors["cs-confirm-regs"] = "Confirm that the temporary restaurant will be run in line with the regulations";
      if (Object.keys(errors).length) return errors;
      s.answers["cs-name"] = name;
      // simulate outcome (hidden ?sim= for testing partial failure/uncertain)
      var sim = qs().get("sim") || "";
      var res = { newChecks: d.newChecks, licence: d.licence, isEvent: d.isEvent, eventName: A(s, "event-name") || "", sim: sim };
      if (d.newChecks) res.checksRef = ref("EHO");
      if (d.licence) res.licenceRef = ref("TRL");
      s.result = res; save(s);
      go("result");
      return null;
    }
  };

  /* =====================================================================
     Result (success / partial / failure)
     ===================================================================== */
  SCREENS.result = {
    section: null, custom: true, title: "Confirmation", active: function () { return true; },
    render: function (s) {
      var r = s.result; if (!r) return '<h1 class="govbb-text-h1">Nothing to show</h1><p class="govbb-font-body">Start again from the beginning.</p><p><a class="govbb-btn" href="index.html">Start again</a></p>';
      var sim = r.sim;
      var checksOK = r.newChecks && sim !== "fail-all" && sim !== "fail-checks" && sim !== "uncertain";
      var licOK = r.licence && sim !== "fail-all" && sim !== "fail-licence" && sim !== "uncertain";
      if (sim === "uncertain") return uncertainResult();
      // total failure
      if (r.newChecks && r.licence && !checksOK && !licOK) return failBoth();
      if (r.newChecks && !r.licence && !checksOK) return failChecks();
      if (r.licence && !r.newChecks && !licOK) return failLicence();
      // partial
      if (r.newChecks && r.licence && checksOK && !licOK) return partialChecksOk(r);
      if (r.newChecks && r.licence && !checksOK && licOK) return partialLicenceOk(r);
      // success
      if (r.newChecks && r.licence) return successBoth(r);
      if (r.licence) return successLicence(r);
      return successChecks(r);
    }
  };

  function nextSteps(subject) {
    return '<h2 class="govbb-text-h2">What happens next</h2>'
      + '<p class="govbb-font-body">Environmental Health will review ' + subject + '.</p>'
      + '<p class="govbb-font-body">The Ministry may contact you if it needs more information.</p>';
  }
  function successChecks(r) {
    var html = '<h1 class="govbb-text-h1">Request submitted</h1>'
      + '<p class="govbb-font-body">We have received your request for Environmental Health food safety checks.</p>'
      + '<div class="govbb-inset-text"><p class="govbb-font-body"><strong>Reference number:</strong> ' + esc(r.checksRef) + "</p></div>"
      + '<p class="govbb-font-body">Keep this number.</p>';
    if (r.isEvent) html += '<p class="govbb-font-body">It can also be used to identify the event if someone applies for a temporary restaurant licence for it.</p>';
    html += nextSteps("the request")
      + '<p class="govbb-font-body">Sending the request does not mean that an Environmental Health Officer’s attendance has been approved or confirmed.</p>'
      + startAgain();
    return html;
  }
  function successLicence(r) {
    var html = '<h1 class="govbb-text-h1">Application submitted</h1>'
      + '<p class="govbb-font-body">We have received your application for a temporary restaurant licence.</p>'
      + '<div class="govbb-inset-text"><p class="govbb-font-body"><strong>Application reference:</strong> ' + esc(r.licenceRef) + "</p></div>";
    if (r.isEvent && r.eventName) html += '<p class="govbb-font-body">Event: ' + esc(r.eventName) + "</p>";
    html += nextSteps("the application")
      + '<p class="govbb-font-body">Submitting the application does not give permission to run the temporary restaurant.</p>'
      + startAgain();
    return html;
  }
  function successBoth(r) {
    var html = '<h1 class="govbb-text-h1">Request and application submitted</h1>'
      + '<p class="govbb-font-body">We have received:</p>'
      + '<ul class="govbb-list govbb-list--bullet"><li>your request for Environmental Health food safety checks</li><li>your temporary restaurant licence application</li></ul>'
      + '<p class="govbb-font-body">They will be reviewed separately.</p>'
      + '<h2 class="govbb-text-h2">Food safety checks request</h2>'
      + '<div class="govbb-inset-text"><p class="govbb-font-body"><strong>Reference number:</strong> ' + esc(r.checksRef) + "</p></div>";
    if (r.isEvent) html += '<p class="govbb-font-body">Give this number to anyone else applying for a temporary restaurant licence for this event. They can use it to identify the event.</p>';
    html += '<h2 class="govbb-text-h2">Temporary restaurant licence application</h2>'
      + '<div class="govbb-inset-text"><p class="govbb-font-body"><strong>Application reference:</strong> ' + esc(r.licenceRef) + "</p></div>"
      + '<h2 class="govbb-text-h2">What happens next</h2>'
      + '<p class="govbb-font-body">Environmental Health will review the request and application separately. The Ministry may contact you if it needs more information.</p>'
      + '<p class="govbb-font-body">Sending them does not mean that the food safety checks request has been approved or that permission has been given to run the temporary restaurant.</p>'
      + startAgain();
    return html;
  }
  function partialChecksOk(r) {
    return '<h1 class="govbb-text-h1">Your request was sent, but your application was not</h1>'
      + '<h2 class="govbb-text-h2">Food safety checks request</h2>'
      + '<p class="govbb-font-body">Your request was sent successfully.</p>'
      + '<div class="govbb-inset-text"><p class="govbb-font-body"><strong>Reference number:</strong> ' + esc(r.checksRef) + "</p></div>"
      + '<h2 class="govbb-text-h2">Temporary restaurant licence application</h2>'
      + '<p class="govbb-font-body">Your application was not submitted. Your answers have been kept.</p>'
      + '<p><a class="govbb-btn" href="index.html?screen=confirm-send">Try submitting the application again</a></p>';
  }
  function partialLicenceOk(r) {
    return '<h1 class="govbb-text-h1">Your application was submitted, but your request was not sent</h1>'
      + '<h2 class="govbb-text-h2">Temporary restaurant licence application</h2>'
      + '<p class="govbb-font-body">Your application was submitted successfully.</p>'
      + '<div class="govbb-inset-text"><p class="govbb-font-body"><strong>Application reference:</strong> ' + esc(r.licenceRef) + "</p></div>"
      + '<h2 class="govbb-text-h2">Food safety checks request</h2>'
      + '<p class="govbb-font-body">Your request was not sent. Your answers have been kept.</p>'
      + '<p><a class="govbb-btn" href="index.html?screen=confirm-send">Try sending the request again</a></p>';
  }
  function failChecks() {
    return '<h1 class="govbb-text-h1">We could not send your request</h1>'
      + '<p class="govbb-font-body">Your request has not been sent.</p>'
      + '<p class="govbb-font-body">Your answers have been kept. Try again.</p>'
      + '<p><a class="govbb-btn" href="index.html?screen=confirm-send">Try again</a></p>';
  }
  function failLicence() {
    return '<h1 class="govbb-text-h1">We could not submit your application</h1>'
      + '<p class="govbb-font-body">Your application has not been submitted.</p>'
      + '<p class="govbb-font-body">Your answers have been kept. Try again.</p>'
      + '<p><a class="govbb-btn" href="index.html?screen=confirm-send">Try again</a></p>';
  }
  function failBoth() {
    return '<h1 class="govbb-text-h1">We could not send your request or application</h1>'
      + '<p class="govbb-font-body">Neither has been sent.</p>'
      + '<p class="govbb-font-body">Your answers have been kept. Try again.</p>'
      + '<p><a class="govbb-btn" href="index.html?screen=confirm-send">Try again</a></p>';
  }
  function uncertainResult() {
    return '<h1 class="govbb-text-h1">We are checking whether your information was received</h1>'
      + '<p class="govbb-font-body">Do not send it again yet, as this could create a duplicate.</p>'
      + '<p class="govbb-font-body">In a live service you would be given a way to check the status or contact the Ministry before trying again.</p>'
      + '<p class="govbb-hint">[MDA/technical note: confirm the status-check or support route before production.]</p>';
  }
  function startAgain() { return '<p><a class="govbb-link" href="#" data-restart>Start a new request or application</a></p>'; }

  /* =====================================================================
     Reusable screen builders + reference data
     ===================================================================== */
  function exitScreen(h1, paras, linkKey) {
    return {
      section: null, custom: true, title: h1, active: function () { return false; },
      render: function () {
        var html = backLink() + '<h1 class="govbb-text-h1">' + esc(h1) + "</h1>";
        paras.forEach(function (p) { html += '<p class="govbb-font-body">' + esc(p) + "</p>"; });
        if (linkKey === "findlicence") html += '<p><a class="govbb-link" href="#" data-noop>Find the right licence</a></p>'
          + '<p class="govbb-hint">[MDA note: confirm the correct destination service and URL before publication.]</p>';
        return html;
      }
    };
  }
  function continueChecksScreen(h1, paras) {
    return {
      section: null, custom: true, title: h1, active: function () { return false; },
      render: function () {
        var html = backLink() + '<h1 class="govbb-text-h1">' + esc(h1) + "</h1>";
        paras.forEach(function (p) { html += '<p class="govbb-font-body">' + esc(p) + "</p>"; });
        html += '<p><button type="button" class="govbb-btn" data-continue-checks>Continue with the food safety checks request</button></p>';
        return html;
      }
    };
  }
  function demoEvent() { return { name: "Crop Over Village Food Fair", location: "Kensington Oval, Fontabelle, Saint Michael", dates: "1 to 3 August 2026" }; }
  function parishOptions() {
    return ["Christ Church", "Saint Andrew", "Saint George", "Saint James", "Saint John", "Saint Joseph", "Saint Lucy", "Saint Michael", "Saint Peter", "Saint Philip", "Saint Thomas"]
      .map(function (p) { return { value: p.toLowerCase().replace(/\s+/g, "-"), label: p }; });
  }

  /* =====================================================================
     Render + wire the current screen
     ===================================================================== */
  function currentScreenId() {
    var id = qs().get("screen") || "start";
    return SCREENS[id] ? id : "start";
  }

  function renderScreen(id, errors, prefill) {
    var s = load(), sc = SCREENS[id], d = derive(s);
    if (sc.prepare) sc.prepare(s, d);
    var main = document.getElementById("main");
    document.title = (sc.title ? sc.title + " | " : "") + SERVICE_TITLE + " | Prototype";
    if (sc.custom) { main.innerHTML = sc.render(s, d, errors); wire(id); return; }

    // generic field-driven screen
    var vals = prefill || {};
    var html = backLink() + errorSummary(errors || {}, sc.fields.map(function (f) { return f.key; }));
    html += '<form id="screen-form" novalidate>';
    if (sc.kind === "form") {
      html += '<h1 class="govbb-text-h1">' + esc(sc.h1 || sc.title) + "</h1>";
      var intro = sc.intro && sc.intro(s); if (intro) html += '<p class="govbb-font-body">' + esc(intro) + "</p>";
      sc.fields.forEach(function (f) {
        var v = (prefill && f.key in prefill) ? prefill[f.key] : (f.type === "file" ? s.files[f.key] : s.answers[f.key]);
        html += renderField(f, v, errors, false);
      });
    } else {
      // single question. Radio/checkbox carry the page h1 in their legend;
      // other field types (text, textarea, date, file) need a separate h1.
      var f0 = sc.fields[0];
      var v0 = (prefill && f0.key in prefill) ? prefill[f0.key] : (f0.type === "file" ? s.files[f0.key] : s.answers[f0.key]);
      if (f0.type === "radio" || f0.type === "checkbox") {
        html += renderField(f0, v0, errors, true);
      } else {
        html += '<h1 class="govbb-text-h1">' + esc(sc.h1 || sc.title) + "</h1>";
        html += renderField(f0, v0, errors, false);
      }
      for (var i = 1; i < sc.fields.length; i++) { var fx = sc.fields[i]; html += renderField(fx, s.answers[fx.key], errors, false); }
    }
    html += '<button type="submit" class="govbb-btn">Continue</button></form>';
    main.innerHTML = html;
    wire(id);
  }

  function wire(id) {
    var s = load(), sc = SCREENS[id];
    // back links
    Array.prototype.forEach.call(document.querySelectorAll("[data-back]"), function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); history.back(); });
    });
    // generic gotos
    Array.prototype.forEach.call(document.querySelectorAll("[data-goto]"), function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var t = b.getAttribute("data-goto");
        if (t === "__after-event-dates") { var s2 = load(); go(computeNext("event-dates", s2)); return; }
        go(t);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-startnew]"), function (sn) {
      sn.addEventListener("click", function (e) { e.preventDefault(); sessionStorage.removeItem(STORAGE_KEY); go("task"); });
    });
    var restart = document.querySelector("[data-restart]");
    if (restart) restart.addEventListener("click", function (e) { e.preventDefault(); sessionStorage.removeItem(STORAGE_KEY); location.href = "index.html"; });
    var noop = document.querySelector("[data-noop]"); if (noop) noop.addEventListener("click", function (e) { e.preventDefault(); });
    var contChecks = document.querySelector("[data-continue-checks]");
    if (contChecks) contChecks.addEventListener("click", function (e) { e.preventDefault(); var s2 = load(); go(computeNext(id, s2)); });
    var goManual = document.querySelector("[data-goto-manual]");
    if (goManual) goManual.addEventListener("click", function (e) {
      e.preventDefault(); var s2 = load(); s2.answers["ref-match"] = "no"; save(s2); pruneInactive(s2); save(s2); go(computeNext("ref-match", s2));
    });

    // form submit
    var form = document.getElementById("screen-form");
    if (!form) return;

    // Tester autofill — only in dev mode (?dev=1, persisted for the session).
    // Never shown on the MOH review URL.
    var devMode = qs().get("dev") === "1" || sessionStorage.getItem("mefj-dev") === "1";
    if (qs().get("dev") === "1") { try { sessionStorage.setItem("mefj-dev", "1"); } catch (e) {} }
    if (devMode) {
      var submitBtn0 = form.querySelector('button[type="submit"]');
      if (submitBtn0) {
        var fillBtn = document.createElement("button");
        fillBtn.type = "button";
        fillBtn.className = "govbb-btn govbb-btn--secondary proto-dev";
        fillBtn.textContent = "Fill this page with test data (tester)";
        submitBtn0.parentNode.insertBefore(fillBtn, submitBtn0);
        fillBtn.addEventListener("click", function () { autofillForm(form); });
      }
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var s2 = load();
      if (sc.custom && sc.submit) { var errC = sc.submit(s2, form); if (errC) { renderScreen(id, errC); focusSummary(); } return; }
      if (sc.custom && id === "ref-match") { /* handled below via fields */ }
      var fields = sc.fields || [];
      var values = readValues(form, fields);
      var errors = validateFields(fields, values, s2);
      if (Object.keys(errors).length) { renderScreen(id, errors, values); focusSummary(); return; }
      // save
      fields.forEach(function (f) {
        if (f.type === "file") { if (values[f.key]) s2.files[f.key] = values[f.key]; }
        else s2.answers[f.key] = values[f.key];
      });
      if (sc.onSave) sc.onSave(s2, values);
      if (id === "task") s2.task = values.task;
      save(s2);
      pruneInactive(s2);
      save(s2);
      var target = sc.next ? sc.next(s2) : computeNext(id, s2);
      go(target);
    });
  }

  function focusSummary() { var el = document.getElementById("error-summary"); if (el) { el.hidden = false; el.focus(); } }

  /* ---------------- init ---------------- */
  function init() {
    var id = currentScreenId();
    // guard: if a downstream screen is opened without prerequisites, fall back to start
    renderScreen(id, null, null);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
