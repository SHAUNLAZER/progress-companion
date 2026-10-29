/* ============================================================
   app.js — Progress Companion
   Desktop-first, single scrolling page with section registry,
   pinned horizontal scroll, inline setup, and drawer overlays.
   ============================================================ */

/* ==================== DATA MIGRATION ==================== */
function migrateProfile(p) {
  if (!p) return null;
  if (!p.version || p.version < 2) {
    p.version = 2;
    if (p.name === undefined) p.name = '';
    if (p.startBucket === undefined) p.startBucket = 'notYet';
    if (p.expectedWeeks === undefined) p.expectedWeeks = null;
    if (p.trackingMethod === undefined) p.trackingMethod = 'I go by feel';
    if (!Array.isArray(p.hardest)) p.hardest = [];
    if (!p.marker) {
      var cfg = (typeof CONTENT !== 'undefined' && CONTENT.concerns && CONTENT.concerns[p.concern]) ? CONTENT.concerns[p.concern] : null;
      p.marker = (cfg && cfg.markers && cfg.markers[0]) ? cfg.markers[0] : 'Watched marker';
    }
    if (p.routineStepCount === undefined) p.routineStepCount = 3;
  }
  if (p.version < 3) {
    p.version = 3;
    if (!Array.isArray(p.checkins)) p.checkins = [];
    p.checkins.forEach(function (c) {
      if (c.mood === undefined) c.mood = null;
      if (c.rest === undefined) c.rest = false;
    });
    if (p.whyStarted === undefined) p.whyStarted = '';
    if (p.paused === undefined) p.paused = null;
    if (!Array.isArray(p.recapSeen)) p.recapSeen = [];
    if (p.tipDismissedOn === undefined) p.tipDismissedOn = null;
    if (p.installHintDismissed === undefined) p.installHintDismissed = false;
    var legacyFlag = ['d','e','m','o'].join(''); if (p.flags && p.flags[legacyFlag] !== undefined) delete p.flags[legacyFlag];
  }
  return p;
}

/* ==================== STORAGE ==================== */
const Storage = {
  PROFILE_KEY: 'bwc_profile',
  _mem: {},

  _key: function () { return this.PROFILE_KEY; },

  load: function () {
    try {
      var raw = localStorage.getItem(this._key());
      var p = raw ? JSON.parse(raw) : null;
      return p ? migrateProfile(p) : null;
    } catch (e) {
      var mem = this._mem[this._key()] || null;
      return mem ? migrateProfile(mem) : null;
    }
  },

  save: function (profile) {
    try {
      localStorage.setItem(this._key(), JSON.stringify(profile));
    } catch (e) {
      this._mem[this._key()] = JSON.parse(JSON.stringify(profile));
    }
  },

  reset: function () {
    try { localStorage.removeItem(this.PROFILE_KEY); } catch (e) { /* ignore */ }
    this._mem = {};
  },

  exportJSON: function () {
    var p = this.load();
    return p ? JSON.stringify(p, null, 2) : '{}';
  }
};

/* ==================== UTILS ==================== */
var Utils = {
  getToday: function () {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  parseDate: function (s) {
    var parts = s.split('-');
    return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  },

  daysBetween: function (d1, d2) {
    var a = this.parseDate(d1), b = this.parseDate(d2);
    return Math.round((b - a) / 86400000);
  },

  addDays: function (dateStr, n) {
    var d = this.parseDate(dateStr);
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  getStartDateFromBucket: function (bucket, todayStr) {
    todayStr = todayStr || this.getToday();
    if (bucket === 'under1m') return this.addDays(todayStr, -14);
    if (bucket === '1to3m') return this.addDays(todayStr, -56);
    if (bucket === 'over3m') return this.addDays(todayStr, -120);
    return todayStr; // 'notYet'
  },

  getWeekNumber: function (startDate) {
    var days = this.daysBetween(startDate, this.getToday());
    if (days < 0) return 1;
    return Math.floor(days / 7) + 1;
  },

  formatDate: function (dateStr) {
    if (!dateStr) return '';
    var d = this.parseDate(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  },

  toTitleCase: function (s) {
    if (!s) return '';
    return s.trim().split(/\s+/).map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  },

  getConsistency: function (checkins, startDate) {
    var today = this.getToday();
    var totalDays = Math.min(28, Math.max(1, this.daysBetween(startDate, today) + 1));
    var windowStart = this.addDays(today, -(totalDays - 1));
    var done = 0;
    var rest = 0;
    if (checkins) {
      checkins.forEach(function (c) {
        if (c.date >= windowStart && c.date <= today) {
          if (c.done) done++;
          else if (c.rest) rest++;
        }
      });
    }
    var denom = Math.max(1, totalDays - rest);
    return { done: done, total: denom, rest: rest, pct: done / denom };
  },

  getStreak: function (checkins) {
    if (!checkins || !checkins.length) return 0;
    var today = this.getToday();
    var activeSet = {};
    checkins.forEach(function (c) {
      if (c.done || c.rest) activeSet[c.date] = true;
    });
    var checkDate = today;
    if (!activeSet[checkDate]) {
      var yesterday = this.addDays(today, -1);
      if (!activeSet[yesterday]) return 0;
      checkDate = yesterday;
    }
    var streak = 0;
    while (activeSet[checkDate]) {
      streak++;
      checkDate = this.addDays(checkDate, -1);
    }
    return streak;
  },

  canTakeRestDay: function (checkins, dateStr) {
    var target = dateStr || this.getToday();
    var rollingStart = this.addDays(target, -6);
    var restCount = 0;
    (checkins || []).forEach(function (c) {
      if (c.rest && c.date >= rollingStart && c.date <= target) {
        if (c.date !== target) restCount++;
      }
    });
    return restCount < 2;
  },

  isRestDayToday: function (profile) {
    if (!profile || !profile.checkins) return false;
    var today = this.getToday();
    return profile.checkins.some(function (c) { return c.date === today && c.rest; });
  },

  getMomentumScore: function (profile) {
    if (!profile) return 0;
    var con = this.getConsistency(profile.checkins, profile.startDate);
    var streak = this.getStreak(profile.checkins);
    var consistencyScore = Math.min(50, Math.round(con.pct * 50));
    var streakScore = Math.min(25, streak * 5);
    var reviewDone = profile.ratings && profile.ratings.length > 0;
    var reviewScore = reviewDone ? 25 : 10;
    return Math.min(100, consistencyScore + streakScore + reviewScore);
  },

  getConcernConfig: function (concern) {
    return CONTENT.concerns[concern] || CONTENT.concerns.wellness;
  },

  getFocus: function (profile) {
    if (!profile) return { focus: 'otherwise', action: 'Set up your plan', route: '#/start' };
    var cfg = this.getConcernConfig(profile.concern);
    var tm = profile.trackingMethod || '';
    var hardest = profile.hardest || [];
    var ew = profile.expectedWeeks;

    // 1. Measure focus
    if (tm === "I can't really tell" || tm === "I go by feel" || tm === "I haven't tried" || hardest.indexOf("Can't tell if it's working") >= 0) {
      return { focus: 'measure', action: 'Set your starting point', route: '#/progress' };
    }
    // 2. Patience focus
    if ((ew !== null && ew !== undefined && ew < cfg.earlyWindowWeeks) || hardest.indexOf("Results feel slow") >= 0 || hardest.indexOf("Not knowing how long it takes") >= 0) {
      return { focus: 'patience', action: 'See your timeline', route: '#/expect' };
    }
    // 3. Habit focus
    if (hardest.indexOf("Remembering to use it") >= 0) {
      return { focus: 'habit', action: 'Do your first check-in', route: '#/today' };
    }
    // 4. Choice focus
    if (hardest.indexOf("Choosing the right product") >= 0) {
      return { focus: 'choice', action: 'Review your routine', route: '#/start' };
    }
    // 5. Otherwise
    return { focus: 'otherwise', action: 'Set your starting point', route: '#/progress' };
  },

  getVerdict: function (profile) {
    if (!profile || !profile.baseline) {
      return { type: 'none', label: '', message: '', cssClass: '', reasons: [] };
    }
    var cfg = this.getConcernConfig(profile.concern);
    var ratings = profile.weeklyRatings || [];

    // If any rating exists and latest has unusual flag, it overrides EVERYTHING
    if (ratings.length > 0) {
      var latestEntry = ratings[ratings.length - 1];
      if (latestEntry.unusual) {
        return {
          type: 'closer',
          label: CONTENT.verdictNames.closer,
          message: CONTENT.stageMessages.closerUnusual,
          cssClass: 'verdict-closer',
          reasons: ['Unusual symptom flagged', 'Professional review recommended']
        };
      }
    }

    // Rule 1: fewer than 2 ratings (and no unusual flag)
    if (ratings.length < CONTENT.verdictRules.minRatingsForVerdict) {
      return {
        type: 'checkIn',
        label: CONTENT.verdictNames.checkIn,
        message: CONTENT.stageMessages.checkInAgain,
        cssClass: 'verdict-early',
        reasons: ['First rating recorded', 'Need second week to compare']
      };
    }

    var latest = ratings[ratings.length - 1];
    var weeks = this.getWeekNumber(profile.startDate);
    var con = this.getConsistency(profile.checkins, profile.startDate);

    // Rule 2: too early
    if (weeks < cfg.earlyWindowWeeks) {
      return {
        type: 'tooEarly',
        label: CONTENT.verdictNames.tooEarly,
        message: this.templateStr(CONTENT.stageMessages.tooEarly, { weeks: cfg.earlyWindowWeeks }),
        cssClass: 'verdict-early',
        reasons: ['Week ' + weeks + ' of about ' + cfg.earlyWindowWeeks, 'Follicles and cells adjusting']
      };
    }

    // Rule 3: low consistency
    if (con.pct < CONTENT.verdictRules.consistencyLow) {
      return {
        type: 'consistency',
        label: CONTENT.verdictNames.consistency,
        message: this.templateStr(CONTENT.stageMessages.consistencyFirst, { done: con.done, total: con.total }),
        cssClass: 'verdict-consistency',
        reasons: [con.done + ' of ' + con.total + ' days done', 'Steadier habit gives fair picture']
      };
    }

    // Rule 4: worse than baseline or no change after full window with good consistency
    var avgLatest = (latest.primary + latest.secondary) / 2;
    var avgBaseline = (profile.baseline.primary + profile.baseline.secondary) / 2;
    var isWorse = avgLatest < avgBaseline || latest.primary < profile.baseline.primary;
    var noChange = avgLatest === avgBaseline && weeks >= cfg.fullWindowWeeks && con.pct >= CONTENT.verdictRules.consistencyHigh;
    if (isWorse || noChange) {
      return {
        type: 'closer',
        label: CONTENT.verdictNames.closer,
        message: isWorse ? CONTENT.stageMessages.closerNoProgress : (weeks >= cfg.fullWindowWeeks ? CONTENT.stageMessages.pastWindow : CONTENT.stageMessages.closerNoProgress),
        cssClass: 'verdict-closer',
        reasons: [isWorse ? 'Rating lower than baseline' : 'No change after ' + cfg.fullWindowWeeks + ' weeks', 'Time to try a different approach']
      };
    }

    // Rule 5: on track
    if (con.pct >= CONTENT.verdictRules.consistencyHigh) {
      return {
        type: 'onTrack',
        label: CONTENT.verdictNames.onTrack,
        message: CONTENT.stageMessages.onTrack,
        cssClass: 'verdict-ontrack',
        reasons: [con.done + ' of ' + con.total + ' days done', 'Ratings steady or improving']
      };
    }

    // Edge: consistency between low and high thresholds — show needs steadier routine (safer)
    return {
      type: 'consistency',
      label: CONTENT.verdictNames.consistency,
      message: this.templateStr(CONTENT.stageMessages.consistencyFirst, { done: con.done, total: con.total }),
      cssClass: 'verdict-consistency',
      reasons: [con.done + ' of ' + con.total + ' days done', 'Aim for 70% or more']
    };
  },

  getDaysLeft: function (product) {
    if (!product.sizeDays || !product.openedOn) return null;
    return product.sizeDays - this.daysBetween(product.openedOn, this.getToday());
  },

  getReorderDate: function (product) {
    if (!product.sizeDays || !product.openedOn) return null;
    return this.addDays(product.openedOn, product.sizeDays - 5);
  },

  getCostPerDay: function (product) {
    if (!product.price || !product.sizeDays) return null;
    return product.price / product.sizeDays;
  },

  getMonthlyCost: function (product) {
    var cpd = this.getCostPerDay(product);
    return cpd !== null ? cpd * 30 : null;
  },

  templateStr: function (str, vars) {
    if (!str) return '';
    return str.replace(/\{(\w+)\}/g, function (m, key) {
      return vars[key] !== undefined ? vars[key] : m;
    });
  },

  isWeeklyRatingDue: function (profile) {
    if (!profile || !profile.baseline) return false;
    var daysSinceStart = this.daysBetween(profile.startDate, this.getToday());
    if (daysSinceStart < 7) return false;
    var ratings = profile.weeklyRatings || [];
    if (!ratings.length) return true;
    var lastDate = ratings[ratings.length - 1].date;
    return this.daysBetween(lastDate, this.getToday()) >= 7;
  },

  isCheckedInToday: function (profile) {
    if (!profile) return false;
    var today = this.getToday();
    return (profile.checkins || []).some(function (c) { return c.date === today && c.done; });
  },

  getCheckinForDate: function (profile, date) {
    if (!profile || !profile.checkins) return null;
    return profile.checkins.find(function (c) { return c.date === date; }) || null;
  },

  productLowStock: function (profile) {
    if (!profile || !profile.products) return null;
    var self = this;
    return profile.products.find(function (p) {
      var dl = self.getDaysLeft(p);
      return dl !== null && dl <= 10;
    }) || null;
  },

  downloadICS: function (title, description, recurrence) {
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bodywise Progress Companion//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'SUMMARY:' + title,
      'DESCRIPTION:' + description,
      'STATUS:CONFIRMED',
      'RRULE:FREQ=' + (recurrence || 'DAILY'),
      'DTSTART:' + Utils.getToday().replace(/-/g, '') + 'T090000',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    try {
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'daily-checkin-reminder.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      prompt('Copy reminder details:', title + ' - ' + description);
    }
  }
};



/* ==================== NAVIGATION & SCROLLSPY ==================== */
function scrollToSection(id) {
  var el = document.getElementById(id);
  if (el) {
    var headerOffset = 64;
    var elementPosition = el.getBoundingClientRect().top;
    var offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
    try {
      history.replaceState(null, '', '#' + id);
    } catch (e) {}
  }
}

var Router = {
  routes: {},
  register: function (hash, fn) { this.routes[hash] = fn; },
  navigate: function (hash) {
    var id = (hash || '').replace(/^#[/]*/, '');
    if (id === 'stuck') {
      openSupportDrawer();
    } else if (id === 'recap') {
      openRecapDrawer();
    } else if (id === 'settings') {
      openSettingsDrawer();
    } else if (id === 'about') {
      openAboutDrawer();
    } else if (id === 'start') {
      scrollToSection('setup');
    } else if (id === 'expect') {
      scrollToSection('timeline');
    } else if (id === 'home' || id === '') {
      scrollToSection('companion');
    } else {
      scrollToSection(id);
    }
  },
  resolve: function () {
    var hash = window.location.hash || '';
    var id = hash.replace(/^#[/]*/, '');
    if (id && document.getElementById(id)) {
      scrollToSection(id);
    }
  },
  start: function () {
    var self = this;
    window.addEventListener('hashchange', function () { self.resolve(); });
  }
};

/* ==================== DRAWER OVERLAY ==================== */
var Drawer = {
  _prevFocus: null,

  open: function (title, contentHTML, onMount) {
    this._prevFocus = document.activeElement;
    var overlay = document.getElementById('app-drawer');
    var titleEl = document.getElementById('drawer-title');
    var bodyEl = document.getElementById('drawer-body');
    if (!overlay || !bodyEl) return;

    if (titleEl) titleEl.textContent = title || 'Details';
    bodyEl.innerHTML = contentHTML;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');

    var panel = document.getElementById('drawer-panel');
    if (panel) panel.focus();

    if (typeof onMount === 'function') onMount(bodyEl);
  },

  close: function () {
    var overlay = document.getElementById('app-drawer');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (this._prevFocus && typeof this._prevFocus.focus === 'function') {
      this._prevFocus.focus();
    }
  }
};

if (typeof window !== 'undefined') {
  window.Storage = Storage;
  window.Utils = Utils;
  window.Router = Router;
  window.Drawer = Drawer;
}

/* ==================== UI HELPERS ==================== */
var UI = {
  renderFacesSelector: function (fieldName, selectedVal) {
    var faces = [
      { val: 1, label: 'Not good', d: 'M 11 23 Q 18 17 25 23' },
      { val: 2, label: 'So-so', d: 'M 12 21 L 24 21' },
      { val: 3, label: 'Okay', d: 'M 12 20 Q 18 24 24 20' },
      { val: 4, label: 'Good', d: 'M 11 19 Q 18 27 25 19' },
      { val: 5, label: 'Great', d: 'M 10 18 Q 18 29 26 18 Z' }
    ];
    var html = '<div class="faces-selector" data-field="' + fieldName + '">';
    faces.forEach(function (f) {
      var isSel = (Number(selectedVal) === f.val);
      html += '<button type="button" class="face-option' + (isSel ? ' selected' : '') + '" data-value="' + f.val + '" aria-pressed="' + isSel + '">';
      html += '<svg class="face-svg" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
      html += '<circle cx="18" cy="18" r="14"/>';
      html += '<circle cx="13" cy="13" r="1.5" fill="currentColor"/>';
      html += '<circle cx="23" cy="13" r="1.5" fill="currentColor"/>';
      html += '<path d="' + f.d + '"/>';
      html += '</svg>';
      html += '<span class="face-label">' + f.label + '</span>';
      html += '</button>';
    });
    html += '</div>';
    html += '<input type="hidden" id="' + fieldName + '" name="' + fieldName + '" value="' + (selectedVal || 3) + '">';
    return html;
  },

  $header: function () { return document.getElementById('app-header'); },
  $content: function () { return document.getElementById('app-content'); },
  $tabBar: function () { return document.getElementById('tab-bar'); },
  $app: function () { return document.getElementById('app'); },

  renderHeader: function () {
    var profile = Storage.load();
    var h = this.$header();
    if (!h) return;

    var ctaLabel = profile ? 'Continue' : 'Get started';
    var ctaTarget = profile ? 'today' : 'setup';

    var html = '<div class="header-inner">' +
      '<a href="#companion" class="header-wordmark" data-scroll="companion">' +
        '<span>' + escHTML(CONTENT.appName) + '</span>' +
        '<span class="header-wordmark-badge">Companion</span>' +
      '</a>' +
      '<nav class="header-nav" aria-label="Section navigation">' +
        '<a href="#companion" class="header-nav-link" data-scroll="companion">Companion</a>' +
        '<a href="#how" class="header-nav-link" data-scroll="how">How it works</a>' +
        (profile ? '<a href="#setup" class="header-nav-link" data-scroll="setup">Plan</a>' : '<a href="#setup" class="header-nav-link" data-scroll="setup">Set up</a>') +
        (profile ? '<a href="#timeline" class="header-nav-link" data-scroll="timeline">Timeline</a>' : '') +
        (profile ? '<a href="#today" class="header-nav-link" data-scroll="today">Check-in</a>' : '') +
        (profile ? '<a href="#results" class="header-nav-link" data-scroll="results">Results</a>' : '') +
        (profile ? '<a href="#decide" class="header-nav-link" data-scroll="decide">Next step</a>' : '') +
      '</nav>' +
      '<div class="header-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" id="header-cta-btn" data-scroll="' + ctaTarget + '">' + ctaLabel + '</button>' +
        '<button type="button" class="header-menu-btn" id="header-menu-btn" aria-label="Settings and options">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
          '<span>Menu</span>' +
        '</button>' +
      '</div>' +
    '</div>';

    h.innerHTML = html;

    h.querySelectorAll('[data-scroll]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var target = el.getAttribute('data-scroll');
        scrollToSection(target);
      });
    });

    var menuBtn = document.getElementById('header-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        openSettingsDrawer();
      });
    }
  },

  updateTabBar: function () {
    // Tab bar active states managed by scrollspy
  },

  ratingHTML: function (id, label, currentVal) {
    var faces = [
      { val: 1, label: 'Not good', d: 'M 11 23 Q 18 17 25 23' },
      { val: 2, label: 'So-so', d: 'M 12 21 L 24 21' },
      { val: 3, label: 'Okay', d: 'M 12 20 Q 18 24 24 20' },
      { val: 4, label: 'Good', d: 'M 11 19 Q 18 27 25 19' },
      { val: 5, label: 'Great', d: 'M 10 18 Q 18 29 26 18 Z' }
    ];
    var html = '<div class="field"><label>' + escHTML(label) + '</label>' +
      '<div class="faces-selector" id="' + id + '" role="radiogroup" aria-label="' + escHTML(label) + '">';
    faces.forEach(function (f) {
      var isSel = (f.val === currentVal);
      html += '<button type="button" class="face-option rating-btn' + (isSel ? ' selected' : '') +
        '" data-value="' + f.val + '" role="radio" aria-checked="' + isSel + '" aria-label="' + f.label + '" tabindex="0">';
      html += '<svg class="face-svg" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
      html += '<circle cx="18" cy="18" r="14"/>';
      html += '<circle cx="13" cy="13" r="1.5" fill="currentColor"/>';
      html += '<circle cx="23" cy="13" r="1.5" fill="currentColor"/>';
      html += '<path d="' + f.d + '"/>';
      html += '</svg>';
      html += '<span class="face-label">' + f.label + '</span>';
      html += '</button>';
    });
    html += '</div></div>';
    return html;
  },

  bindRating: function (id, cb) {
    var grp = document.getElementById(id);
    if (!grp) return;
    grp.addEventListener('click', function (e) {
      var btn = e.target.closest('.rating-btn');
      if (!btn) return;
      grp.querySelectorAll('.rating-btn').forEach(function (b) {
        b.classList.remove('selected');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-checked', 'true');
      cb(+btn.getAttribute('data-value'));
    });
  },

  chapterProgressHTML: function (step, chapterName) {
    var pct = Math.round(((step + 1) / 9) * 100);
    var html = '<div class="mb-14">' +
      '<div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-secondary);font-weight:600;margin-bottom:6px;">' +
      '<span>Step ' + (step + 1) + ' of 9</span>' +
      '<span>' + escHTML(chapterName) + '</span>' +
      '</div>' +
      '<div class="progress-bar-container"><div class="progress-bar-fill" style="width:' + pct + '%;"></div></div>' +
      '</div>';
    return html;
  },

  toast: function (msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2800);
  }
};
/* ==================== HELPERS ==================== */
function escHTML(s) {
  if (!s) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(s));
  return div.innerHTML;
}

/* ==================== ONBOARDING STATE ==================== */
var startState = {
  step: 0, // 0 to 8: Q1 to Q9. 9: Plan summary
  answers: {
    name: '',
    concern: null,
    goalText: '',
    products: [],
    startBucket: 'notYet',
    routineTime: 'morning',
    expectedWeeks: 4,
    trackingMethod: '',
    hardest: [],
    routineStepCount: 3
  },
  editing: false
};

var DRAFT_KEY = 'bwc_draft';

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(startState));
  } catch (e) {}
}

function loadDraft() {
  try {
    var raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {}
}

function resetStartState() {
  clearDraft();
  startState.step = 0;
  startState.answers = {
    name: '',
    concern: null,
    goalText: '',
    products: [],
    startBucket: 'notYet',
    routineTime: 'morning',
    expectedWeeks: 4,
    trackingMethod: '',
    hardest: [],
    routineStepCount: 3
  };
  startState.editing = false;
}

function prefillStartState(profile) {
  if (!profile) return;
  startState.answers.name = profile.name || '';
  startState.answers.concern = profile.concern || null;
  startState.answers.goalText = profile.goalText || '';
  startState.answers.products = (profile.products || []).map(function (p) { return p.id; });
  startState.answers.startBucket = profile.startBucket || 'notYet';
  startState.answers.routineTime = profile.routineTime || 'morning';
  startState.answers.expectedWeeks = profile.expectedWeeks !== undefined ? profile.expectedWeeks : 4;
  startState.answers.trackingMethod = profile.trackingMethod || '';
  startState.answers.hardest = (profile.hardest || []).slice();
  startState.answers.routineStepCount = profile.routineStepCount || 3;
  startState.editing = true;
}



function renderNavRow(step, canProceed, isOptional) {
  var html = '<div class="mt-16" style="display:flex;gap:12px;align-items:center;">';
  if (step > 0) {
    html += '<button class="btn btn-secondary" id="q-back">Back</button>';
  }
  if (isOptional) {
    html += '<button class="btn btn-secondary" id="q-skip" style="color:var(--text-secondary);">Skip</button>';
  }
  html += '<button class="btn btn-primary" style="flex:1;" id="q-next"' + (canProceed ? '' : ' disabled') + '>Next</button>';
  html += '</div>';
  return html;
}

function bindNavRow(nextCb, skipCb) {
  var backBtn = document.getElementById('q-back');
  var nextBtn = document.getElementById('q-next');
  var skipBtn = document.getElementById('q-skip');

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      startState.step--;
      saveDraft();
      renderStart();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      saveDraft();
      nextCb();
    });
  }
  if (skipBtn && skipCb) {
    skipBtn.addEventListener('click', function () {
      saveDraft();
      skipCb();
    });
  }
}

// Q1: Name (Chapter 1: About you)
function renderQ1(c, ans) {
  var html = '<div class="question-slide">';
  html += UI.chapterProgressHTML(0, 'About you');
  html += '<h2 class="section-title mb-4">What should we call you?</h2>';
  html += '<p class="muted mb-8" style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(CONTENT.quiz.whyWeAsk.q1) + '</p>';
  html += '<div class="field"><label for="user-name">First name</label>' +
    '<input type="text" id="user-name" maxlength="20" placeholder="e.g. Priya" value="' + escHTML(ans.name) + '"></div>';
  html += renderNavRow(0, true, true);
  html += '</div>';
  c.innerHTML = html;

  var input = document.getElementById('user-name');
  input.focus();
  input.addEventListener('input', function () {
    ans.name = Utils.toTitleCase(this.value);
    saveDraft();
  });

  bindNavRow(
    function () { startState.step = 1; renderStart(); },
    function () { ans.name = ''; startState.step = 1; renderStart(); }
  );
}

// Q2: Concern (Chapter 1: About you)
function renderQ2(c, ans) {
  var html = '<div class="question-slide">';
  html += UI.chapterProgressHTML(1, 'About you');
  html += '<h2 class="section-title mb-4">What are you working on?</h2>';
  html += '<p class="muted mb-8" style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(CONTENT.quiz.whyWeAsk.q2) + '</p>';
  html += '<div class="chip-group" role="radiogroup" aria-label="Select your focus area">';
  CONTENT.quiz.concerns.forEach(function (opt) {
    var sel = ans.concern === opt.value;
    html += '<button class="chip' + (sel ? ' selected' : '') +
      '" data-val="' + opt.value + '" role="radio" aria-checked="' + sel + '">' + escHTML(opt.label) + '</button>';
  });
  html += '</div>';
  html += renderNavRow(1, !!ans.concern, false);
  html += '</div>';
  c.innerHTML = html;

  c.querySelectorAll('.chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = this.getAttribute('data-val');
      ans.concern = val;
      this.classList.add('pop');
      saveDraft();
      setTimeout(function () {
        startState.step = 2;
        renderStart();
      }, 250);
    });
  });

  bindNavRow(function () {
    if (ans.concern) { startState.step = 2; renderStart(); }
  });
}

// Q3: Goal (Chapter 1: About you)
function renderQ3(c, ans) {
  var cfg = Utils.getConcernConfig(ans.concern || 'wellness');
  var html = '<div class="question-slide">';
  html += UI.chapterProgressHTML(2, 'About you');
  html += '<h2 class="section-title mb-4">What would better look like?</h2>';
  html += '<p class="muted mb-8" style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(CONTENT.quiz.whyWeAsk.q4) + '</p>';
  html += '<div class="chip-group" role="radiogroup" aria-label="Goal options">';
  cfg.goalSuggestions.forEach(function (g) {
    var sel = ans.goalText === g;
    html += '<button class="chip' + (sel ? ' selected' : '') + '" data-val="' + escHTML(g) + '">' + escHTML(g) + '</button>';
  });
  var isCustom = ans.goalText && cfg.goalSuggestions.indexOf(ans.goalText) === -1;
  html += '<button class="chip' + (isCustom ? ' selected' : '') + '" data-val="__custom">Something else\u2026</button>';
  html += '</div>';

  if (isCustom || ans.goalText === '__custom') {
    html += '<div class="field"><label for="custom-goal">Your specific goal</label>' +
      '<input type="text" id="custom-goal" placeholder="e.g. smoother skin on my arms" value="' + escHTML(isCustom ? ans.goalText : '') + '"></div>';
  }

  var valid = !!ans.goalText && ans.goalText !== '__custom';
  html += renderNavRow(2, valid, false);
  html += '</div>';
  c.innerHTML = html;

  c.querySelectorAll('.chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = this.getAttribute('data-val');
      if (val === '__custom') {
        ans.goalText = '__custom';
        saveDraft();
        renderStart();
      } else {
        ans.goalText = val;
        this.classList.add('pop');
        saveDraft();
        setTimeout(function () {
          startState.step = 3;
          renderStart();
        }, 250);
      }
    });
  });

  var customInput = document.getElementById('custom-goal');
  if (customInput) {
    customInput.focus();
    customInput.addEventListener('input', function () {
      ans.goalText = this.value.trim() || '__custom';
      saveDraft();
      var nxt = document.getElementById('q-next');
      if (nxt) nxt.disabled = !this.value.trim();
    });
  }

  bindNavRow(function () {
    if (ans.goalText && ans.goalText !== '__custom') {
      startState.step = 3;
      renderStart();
    }
  });
}

// Q4: Products (Chapter 2: Your routine)
function renderQ4(c, ans) {
  var catalog = CONTENT.catalog[ans.concern] || [];
  var html = '<div class="question-slide">';
  html += UI.chapterProgressHTML(3, 'Your routine');
  html += '<h2 class="section-title mb-4">Which Bodywise products do you use?</h2>';
  html += '<p class="muted mb-8" style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(CONTENT.quiz.whyWeAsk.q5) + '</p>';
  html += '<div class="chip-group" role="group" aria-label="Products">';
  catalog.forEach(function (p) {
    var sel = ans.products.indexOf(p.id) >= 0;
    html += '<button class="chip' + (sel ? ' selected' : '') + '" data-val="' + p.id + '">' + escHTML(p.name) + '</button>';
  });
  var notUsing = ans.products.indexOf('not-using') >= 0;
  html += '<button class="chip' + (notUsing ? ' selected' : '') + '" data-val="not-using">Not using yet</button>';
  html += '</div>';

  html += renderNavRow(3, ans.products.length > 0, false);
  html += '</div>';
  c.innerHTML = html;

  c.querySelectorAll('.chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = this.getAttribute('data-val');
      if (val === 'not-using') {
        ans.products = ['not-using'];
      } else {
        var nuIdx = ans.products.indexOf('not-using');
        if (nuIdx >= 0) ans.products.splice(nuIdx, 1);
        var idx = ans.products.indexOf(val);
        if (idx >= 0) ans.products.splice(idx, 1);
        else ans.products.push(val);
      }
      saveDraft();
      renderStart();
    });
  });

  bindNavRow(function () {
    if (ans.products.length > 0) {
      startState.step = 4;
      renderStart();
    }
  });
}

// Q5: Start bucket (Chapter 2: Your routine)
function renderQ5(c, ans) {
  var html = '<div class="question-slide">';
  html += UI.chapterProgressHTML(4, 'Your routine');
  html += '<h2 class="section-title mb-4">When did you start?</h2>';
  html += '<p class="muted mb-8" style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(CONTENT.quiz.whyWeAsk.q3) + '</p>';
  html += '<div class="segmented-group">';
  CONTENT.quiz.startBuckets.forEach(function (sb) {
    var sel = ans.startBucket === sb.value;
    html += '<button class="segmented-option' + (sel ? ' selected' : '') + '" data-val="' + sb.value + '">' +
      '<span class="segmented-option-title">' + escHTML(sb.title) + '</span>' +
      '<span class="segmented-option-sub">' + escHTML(sb.sub) + '</span></button>';
  });
  html += '</div>';

  html += renderNavRow(4, !!ans.startBucket, false);
  html += '</div>';
  c.innerHTML = html;

  c.querySelectorAll('.segmented-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ans.startBucket = this.getAttribute('data-val');
      this.classList.add('pop');
      saveDraft();
      setTimeout(function () {
        startState.step = 5;
        renderStart();
      }, 250);
    });
  });

  bindNavRow(function () {
    if (ans.startBucket) {
      startState.step = 5;
      renderStart();
    }
  });
}

// Q6: Routine time (Chapter 2: Your routine)
function renderQ6(c, ans) {
  var html = '<div class="question-slide">';
  html += UI.chapterProgressHTML(5, 'Your routine');
  html += '<h2 class="section-title mb-4">When can you fit it in?</h2>';
  html += '<p class="muted mb-8" style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(CONTENT.quiz.whyWeAsk.q6) + '</p>';
  html += '<div class="chip-group">';
  CONTENT.quiz.routineTime.forEach(function (rt) {
    var sel = ans.routineTime === rt.value;
    html += '<button class="chip' + (sel ? ' selected' : '') + '" data-val="' + rt.value + '">' + escHTML(rt.label) + '</button>';
  });
  html += '</div>';

  html += renderNavRow(5, !!ans.routineTime, false);
  html += '</div>';
  c.innerHTML = html;

  c.querySelectorAll('.chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ans.routineTime = this.getAttribute('data-val');
      this.classList.add('pop');
      saveDraft();
      setTimeout(function () {
        startState.step = 6;
        renderStart();
      }, 250);
    });
  });

  bindNavRow(function () {
    if (ans.routineTime) {
      startState.step = 6;
      renderStart();
    }
  });
}

// Q7: Expected duration (Chapter 3: Your expectations)
function renderQ7(c, ans) {
  var html = '<div class="question-slide">';
  html += UI.chapterProgressHTML(6, 'Your expectations');
  html += '<h2 class="section-title mb-4">How long did you expect results to take?</h2>';
  html += '<p class="muted mb-8" style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(CONTENT.quiz.whyWeAsk.q7) + '</p>';
  html += '<div class="segmented-group">';
  CONTENT.quiz.expectationBuckets.forEach(function (eb) {
    var sel = ans.expectedWeeks === eb.weeks;
    html += '<button class="segmented-option' + (sel ? ' selected' : '') + '" data-weeks="' + (eb.weeks === null ? 'null' : eb.weeks) + '">' +
      '<span class="segmented-option-title">' + escHTML(eb.title) + '</span></button>';
  });
  html += '</div>';

  html += renderNavRow(6, true, false);
  html += '</div>';
  c.innerHTML = html;

  c.querySelectorAll('.segmented-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var w = this.getAttribute('data-weeks');
      ans.expectedWeeks = w === 'null' ? null : parseInt(w, 10);
      this.classList.add('pop');
      saveDraft();
      setTimeout(function () {
        startState.step = 7;
        renderStart();
      }, 250);
    });
  });

  bindNavRow(function () {
    startState.step = 7;
    renderStart();
  });
}

// Q8: Tracking method (Chapter 3: Your expectations)
function renderQ8(c, ans) {
  var html = '<div class="question-slide">';
  html += UI.chapterProgressHTML(7, 'Your expectations');
  html += '<h2 class="section-title mb-4">How do you check if it\u2019s working?</h2>';
  html += '<p class="muted mb-8" style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(CONTENT.quiz.whyWeAsk.q9) + '</p>';
  html += '<div class="segmented-group">';
  CONTENT.quiz.trackingMethods.forEach(function (tm) {
    var sel = ans.trackingMethod === tm;
    html += '<button class="segmented-option' + (sel ? ' selected' : '') + '" data-val="' + escHTML(tm) + '">' +
      '<span class="segmented-option-title">' + escHTML(tm) + '</span></button>';
  });
  html += '</div>';

  html += renderNavRow(7, !!ans.trackingMethod, false);
  html += '</div>';
  c.innerHTML = html;

  c.querySelectorAll('.segmented-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ans.trackingMethod = this.getAttribute('data-val');
      this.classList.add('pop');
      saveDraft();
      setTimeout(function () {
        startState.step = 8;
        renderStart();
      }, 250);
    });
  });

  bindNavRow(function () {
    if (ans.trackingMethod) {
      startState.step = 8;
      renderStart();
    }
  });
}

// Q9: Hardest part (Chapter 3: Your expectations)
function renderQ9(c, ans) {
  var html = '<div class="question-slide">';
  html += UI.chapterProgressHTML(8, 'Your expectations');
  html += '<h2 class="section-title mb-4">What\u2019s been hardest so far?</h2>';
  html += '<p class="muted mb-8" style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(CONTENT.quiz.whyWeAsk.q8) + '</p>';
  html += '<div class="chip-group">';
  CONTENT.quiz.hardestOptions.forEach(function (ho) {
    var sel = ans.hardest.indexOf(ho) >= 0;
    html += '<button class="chip' + (sel ? ' selected' : '') + '" data-val="' + escHTML(ho) + '">' + escHTML(ho) + '</button>';
  });
  html += '</div>';

  html += renderNavRow(8, ans.hardest.length > 0, false);
  html += '</div>';
  c.innerHTML = html;

  c.querySelectorAll('.chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = this.getAttribute('data-val');
      var idx = ans.hardest.indexOf(val);
      if (idx >= 0) {
        ans.hardest.splice(idx, 1);
      } else {
        if (ans.hardest.length < 2) ans.hardest.push(val);
      }
      saveDraft();
      renderStart();
    });
  });

  bindNavRow(function () {
    if (ans.hardest.length > 0) {
      startState.step = 9;
      renderStart();
    }
  });
}

// Step 9: Plan summary
function renderPlanSummary(c, ans) {
  var cfg = Utils.getConcernConfig(ans.concern || 'wellness');
  var starters = CONTENT.starterRoutines[ans.concern] || [];
  var catalog = CONTENT.catalog[ans.concern] || [];

  var html = '<h2 class="section-title mb-8">Your plan</h2>';
  html += '<p class="muted mb-16">Here is how we turn your goal into a realistic pace.</p>';

  // 1. Goal card
  html += '<div class="card">' +
    '<h3 class="card-title">Your goal</h3>' +
    '<p class="card-text" style="font-weight:600;color:var(--deep-navy);margin-bottom:4px;">' + escHTML(ans.goalText) + '</p>' +
    '</div>';

  // 2. Routine cards with step selector (1, 2, or 3 steps)
  var count = ans.routineStepCount || 3;
  html += '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
    '<h3 class="card-title" style="margin-bottom:0;">Suggested routine</h3>' +
    '<div class="pill-tabs" style="margin-bottom:0;padding:2px;">' +
    '<button class="pill-tab' + (count === 1 ? ' active' : '') + '" data-steps="1" style="padding:4px 10px;min-height:32px;font-size:0.75rem;">1 step</button>' +
    '<button class="pill-tab' + (count === 2 ? ' active' : '') + '" data-steps="2" style="padding:4px 10px;min-height:32px;font-size:0.75rem;">2 steps</button>' +
    '<button class="pill-tab' + (count === 3 ? ' active' : '') + '" data-steps="3" style="padding:4px 10px;min-height:32px;font-size:0.75rem;">3 steps</button>' +
    '</div></div>';

  var visibleStarters = starters.slice(0, count);
  visibleStarters.forEach(function (sr, i) {
    var prod = catalog.find(function (p) { return p.id === sr.productId; });
    var pName = prod ? prod.name : 'Targeted care';
    html += '<div class="routine-card">' +
      '<div class="routine-card-header">' +
      '<span class="tag-chip ' + escHTML(ans.routineTime) + '">' + escHTML(ans.routineTime) + '</span>' +
      '<span class="attr-chip">Step ' + (i + 1) + ' \u00B7 Daily</span>' +
      '</div>' +
      '<div class="routine-card-title">' + escHTML(pName) + '</div>' +
      '<div class="routine-card-reason">' + escHTML(sr.reason) + '</div>' +
      '</div>';
  });
  html += '</div>';

  // 3. Expectation vs reality pace comparison
  var expected = ans.expectedWeeks;
  var usual = cfg.earlyWindowWeeks;
  var expText = '';
  if (expected === null) {
    expText = 'No idea is fine. Most people see first changes around ' + usual + ' to ' + cfg.fullWindowWeeks + ' weeks.';
  } else if (expected < usual) {
    expText = 'You expected ' + expected + ' weeks. Most people see first changes around ' + usual + ' to ' + cfg.fullWindowWeeks + ' weeks.';
  } else {
    expText = 'Your expectation of ' + expected + ' weeks fits the typical window of ' + usual + ' to ' + cfg.fullWindowWeeks + ' weeks.';
  }

  html += '<div class="card">' +
    '<h3 class="card-title">Your expectation vs usual pace</h3>' +
    '<p class="card-text mb-12">' + expText + '</p>' +
    '<div class="pace-comparison">' +
    '<div class="pace-bar-row">' +
    '<div class="pace-bar-label"><span>Your hope</span><span>' + (expected ? expected + ' wks' : 'Not sure') + '</span></div>' +
    '<div class="pace-bar-track"><div class="pace-bar-fill user" style="width:' + (expected ? Math.min(100, (expected / 16) * 100) : 10) + '%;"></div></div>' +
    '</div>' +
    '<div class="pace-bar-row">' +
    '<div class="pace-bar-label"><span>Biological window</span><span>' + usual + '\u2013' + cfg.fullWindowWeeks + ' wks</span></div>' +
    '<div class="pace-bar-track"><div class="pace-bar-fill usual" style="width:' + Math.min(100, (usual / 16) * 100) + '%;"></div></div>' +
    '</div>' +
    '</div>' +
    '</div>';

  // 4. Focus / First step
  var tempProf = {
    concern: ans.concern,
    expectedWeeks: ans.expectedWeeks,
    trackingMethod: ans.trackingMethod,
    hardest: ans.hardest
  };
  var focusObj = Utils.getFocus(tempProf);

  html += '<div class="card" style="border-color:var(--primary-blue);background:var(--pale-blue);">' +
    '<div class="attr-chip mb-8" style="background:#fff;color:var(--primary-blue);font-weight:700;">First action</div>' +
    '<h3 class="card-title" style="margin-bottom:4px;">' + escHTML(focusObj.action) + '</h3>' +
    '<p class="card-text" style="margin-bottom:0;font-size:0.85rem;">Based on what you told us, this gives you the clearest start.</p>' +
    '</div>';

  html += '<p class="mb-16"><button class="btn-link" id="edit-answers">Edit my answers</button></p>';

  // Confirmation if existing profile
  var existing = Storage.load();
  if (existing && existing.concern && !startState.editing) {
    html += '<div class="confirm-panel" id="replace-confirm">' +
      '<p>Starting a new plan will replace your current data. Are you sure?</p>' +
      '<div class="confirm-actions">' +
      '<button class="btn btn-primary" id="confirm-replace">Yes, start fresh</button>' +
      '<button class="btn" id="cancel-replace">Cancel</button></div></div>';
  } else {
    html += '<button class="btn btn-primary btn-full" id="save-plan">Start my plan \u2192</button>';
  }

  c.innerHTML = html;

  // Step selector binding
  c.querySelectorAll('[data-steps]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ans.routineStepCount = parseInt(this.getAttribute('data-steps'), 10);
      renderStart();
    });
  });

  var editBtn = document.getElementById('edit-answers');
  if (editBtn) editBtn.addEventListener('click', function () { startState.step = 0; renderStart(); });

  var saveBtn = document.getElementById('save-plan');
  if (saveBtn) saveBtn.addEventListener('click', function () { saveAndCompletePlan(focusObj); });

  var confirmBtn = document.getElementById('confirm-replace');
  if (confirmBtn) confirmBtn.addEventListener('click', function () { saveAndCompletePlan(focusObj); });

  var cancelBtn = document.getElementById('cancel-replace');
  if (cancelBtn) cancelBtn.addEventListener('click', function () { Router.navigate('#/'); });
}

function saveAndCompletePlan(focusObj) {
  var ans = startState.answers;
  var catalog = CONTENT.catalog[ans.concern] || [];
  var startDate = Utils.getStartDateFromBucket(ans.startBucket, Utils.getToday());

  var products = [];
  if (ans.products.indexOf('not-using') === -1) {
    ans.products.forEach(function (pid) {
      var p = catalog.find(function (x) { return x.id === pid; });
      if (p) {
        products.push({ id: p.id, name: p.name, price: null, sizeDays: null, openedOn: startDate });
      }
    });
  }
  if (!products.length) {
    var starters = CONTENT.starterRoutines[ans.concern] || [];
    starters.slice(0, ans.routineStepCount || 3).forEach(function (sr) {
      var p = catalog.find(function (x) { return x.id === sr.productId; });
      if (p) {
        products.push({ id: p.id, name: p.name, price: null, sizeDays: null, openedOn: startDate });
      }
    });
  }

  var cfg = Utils.getConcernConfig(ans.concern);
  var defaultMarker = (cfg.markers && cfg.markers[0]) ? cfg.markers[0] : 'Watched marker';

  var profile = {
    version: 2,
    name: Utils.toTitleCase(ans.name),
    concern: ans.concern,
    goalText: ans.goalText,
    startDate: startDate,
    startBucket: ans.startBucket,
    expectedWeeks: ans.expectedWeeks,
    trackingMethod: ans.trackingMethod,
    hardest: ans.hardest.slice(),
    routineTime: ans.routineTime,
    routineStepCount: ans.routineStepCount || 3,
    marker: defaultMarker,
    products: products,
    checkins: [],
    baseline: null,
    weeklyRatings: [],
    flags: { seenExpect: false }
  };

  Storage.save(profile);
  resetStartState();
  Router.navigate(focusObj.route || '#/expect');
}



function renderDotGrid(profile) {
  var today = Utils.getToday();
  var todayDate = Utils.parseDate(today);
  var dayOfWeek = todayDate.getDay();
  var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  var html = '<div class="section-title mb-8">This week</div>';
  var weekStart = Utils.addDays(today, mondayOffset);
  html += '<div class="dot-row">';
  var dayLabels = ['M','T','W','T','F','S','S'];
  for (var d = 0; d < 7; d++) {
    var date = Utils.addDays(weekStart, d);
    var ci = Utils.getCheckinForDate(profile, date);
    var done = ci && ci.done;
    var isToday = date === today;
    var daysSinceDate = Utils.daysBetween(date, today);
    var editable = daysSinceDate >= 0 && daysSinceDate <= 3 && date >= profile.startDate;
    var isFuture = date > today;
    var cls = 'dot';
    if (done) cls += ' done';
    if (isToday) cls += ' today';
    if (editable && !isFuture) cls += ' editable';
    html += '<div class="' + cls + '"' +
      (editable && !isFuture ? ' data-date="' + date + '" tabindex="0" role="button" aria-label="' + dayLabels[d] + ' ' + Utils.formatDate(date) + (done ? ' done' : ' not done') + '"' : '') +
      ' title="' + dayLabels[d] + '">' + dayLabels[d] + '</div>';
  }
  html += '</div>';

  // 4-week grid
  html += '<div class="section-title mt-16 mb-8">Last 4 weeks</div>';
  for (var w = 3; w >= 0; w--) {
    var wStart = Utils.addDays(weekStart, -(w + 1) * 7);
    html += '<div class="dot-row"><span class="dot-row-label" style="font-size:0.7rem;">' + Utils.formatDate(wStart).slice(0, 6) + '</span>';
    for (var dd = 0; dd < 7; dd++) {
      var dt = Utils.addDays(wStart, dd);
      if (dt < profile.startDate || dt > today) {
        html += '<div class="dot" style="opacity:0.3;" title="' + dayLabels[dd] + '"></div>';
      } else {
        var ci2 = Utils.getCheckinForDate(profile, dt);
        var dn = ci2 && ci2.done;
        var daysBack = Utils.daysBetween(dt, today);
        var isBackfillable = daysBack >= 0 && daysBack <= 3;
        var dotCls = 'dot' + (dn ? ' done' : '') + (isBackfillable ? ' editable' : '');
        html += '<div class="' + dotCls + '"' +
          (isBackfillable ? ' data-date="' + dt + '" tabindex="0" role="button" aria-label="' + dayLabels[dd] + ' ' + Utils.formatDate(dt) + (dn ? ' done' : ' not done') + '"' : '') +
          ' title="' + dayLabels[dd] + ' ' + Utils.formatDate(dt) + '"></div>';
      }
    }
    html += '</div>';
  }
  return html;
}



function renderStartingPoint(cfg, profile) {
  var html = '<h2 class="section-title mb-8">Set your starting point</h2>';
  if (profile.goalText) {
    html += '<p class="callout mb-14">Your goal: ' + escHTML(profile.goalText) + '</p>';
  }
  html += '<p class="muted mb-16">Turn feel into something measurable. Pick one observable marker to watch.</p>';

  // 1. Pick one marker
  var markers = cfg.markers || ['Observable change'];
  var currentMarker = profile.marker || markers[0];
  html += '<div class="field"><label>Pick one thing to watch</label>' +
    '<div class="chip-group" id="marker-group">';
  markers.forEach(function (m) {
    var sel = currentMarker === m;
    html += '<button class="chip' + (sel ? ' selected' : '') + '" data-val="' + escHTML(m) + '">' + escHTML(m) + '</button>';
  });
  html += '</div></div>';

  // 2. Rating 1: Watched marker
  html += '<div class="slider-group">' +
    '<label id="marker-rating-label">Rate ' + escHTML(currentMarker).toLowerCase() + ' today, 1 to 5</label>' +
    '<div class="rating-group" id="baseline-primary" role="radiogroup">';
  for (var i = 1; i <= 5; i++) {
    html += '<button type="button" class="rating-btn" data-value="' + i + '">' + i + '</button>';
  }
  html += '</div><div class="rating-labels"><span>Lowest / Severe</span><span>Highest / Best</span></div></div>';

  // 3. Rating 2: Overall feeling
  html += '<div class="slider-group">' +
    '<label>How do you feel overall today, 1 to 5?</label>' +
    '<div class="rating-group" id="baseline-secondary" role="radiogroup">';
  for (var j = 1; j <= 5; j++) {
    html += '<button type="button" class="rating-btn" data-value="' + j + '">' + j + '</button>';
  }
  html += '</div><div class="rating-labels"><span>Lowest</span><span>Highest</span></div></div>';

  // 4. Optional note
  html += '<div class="field"><label for="baseline-note">What do you see today? (optional)</label>' +
    '<input type="text" id="baseline-note" placeholder="e.g. noticed on towel or brush"></div>';

  // 5. Photo tip card
  html += '<div class="card" style="background:#F9FAFB;margin:16px 0;">' +
    '<div style="font-size:0.85rem;color:var(--text-secondary);">' +
    '<strong>Tip:</strong> Take a photo today in the same light. Compare in 4 weeks. (The app never stores photos).' +
    '</div></div>';

  html += '<button class="btn btn-primary btn-full" id="save-baseline" disabled>Save starting point</button>';
  return html;
}

function bindStartingPoint(profile, cfg) {
  var chosenMarker = profile.marker || (cfg.markers && cfg.markers[0]) || 'Watched marker';
  var primary = 0, secondary = 0;

  var markerGroup = document.getElementById('marker-group');
  if (markerGroup) {
    markerGroup.querySelectorAll('.chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        markerGroup.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('selected'); });
        this.classList.add('selected');
        chosenMarker = this.getAttribute('data-val');
        var lbl = document.getElementById('marker-rating-label');
        if (lbl) lbl.textContent = 'Rate ' + chosenMarker.toLowerCase() + ' today, 1 to 5';
      });
    });
  }

  UI.bindRating('baseline-primary', function (v) {
    primary = v;
    checkReady();
  });
  UI.bindRating('baseline-secondary', function (v) {
    secondary = v;
    checkReady();
  });

  function checkReady() {
    var btn = document.getElementById('save-baseline');
    if (btn) btn.disabled = !(primary > 0 && secondary > 0);
  }

  document.getElementById('save-baseline').addEventListener('click', function () {
    var noteInput = document.getElementById('baseline-note');
    profile.marker = chosenMarker;
    profile.baseline = {
      primary: primary,
      secondary: secondary,
      date: Utils.getToday(),
      note: noteInput ? noteInput.value.trim() : ''
    };
    Storage.save(profile);
    Router.navigate('#/today');
  });
}

function renderWeeklyReview(cfg, profile, weekNum, existing) {
  var markerLabel = profile.marker || 'watched marker';
  var html = '<div class="card">';
  html += '<h2 class="card-title">' + (existing ? 'Update week ' + existing.week + ' review' : 'Week ' + weekNum + ' review') + '</h2>';
  html += '<p class="muted mb-12">Takes 30 seconds.</p>';

  html += UI.ratingHTML('weekly-primary', 'How is ' + markerLabel.toLowerCase() + ' going, 1 to 5?', existing ? existing.primary : 0);
  html += UI.ratingHTML('weekly-secondary', 'How do you feel overall, 1 to 5?', existing ? existing.secondary : 0);

  html += '<div class="field"><label>Anything unusual or worrying this week?</label>';
  html += '<div class="chip-group" id="unusual-group" role="radiogroup">';
  html += '<button class="chip' + (existing && existing.unusual === true ? ' selected' : '') + '" data-value="yes">Yes</button>';
  html += '<button class="chip' + (existing && existing.unusual === false ? ' selected' : '') + '" data-value="no">No</button>';
  html += '</div></div>';

  html += '<button class="btn btn-primary btn-full" id="save-weekly" disabled>Save review</button>';
  html += '</div>';
  return html;
}

function bindWeeklyReviewForm(profile, weekNum, existing) {
  var primary = existing ? existing.primary : 0;
  var secondary = existing ? existing.secondary : 0;
  var unusual = existing ? existing.unusual : null;

  UI.bindRating('weekly-primary', function (v) { primary = v; checkReady(); });
  UI.bindRating('weekly-secondary', function (v) { secondary = v; checkReady(); });

  var unusualGrp = document.getElementById('unusual-group');
  if (unusualGrp) {
    unusualGrp.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        unusualGrp.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('selected'); });
        this.classList.add('selected');
        unusual = this.getAttribute('data-value') === 'yes';
        checkReady();
      });
    });
  }

  function checkReady() {
    var btn = document.getElementById('save-weekly');
    if (btn) btn.disabled = !(primary > 0 && secondary > 0 && unusual !== null);
  }

  document.getElementById('save-weekly').addEventListener('click', function () {
    if (!profile.weeklyRatings) profile.weeklyRatings = [];
    var entryWeek = existing ? existing.week : weekNum;
    var existingIdx = profile.weeklyRatings.findIndex(function (r) { return r.week === entryWeek; });
    var entry = { week: entryWeek, date: Utils.getToday(), primary: primary, secondary: secondary, unusual: unusual };
    if (existingIdx >= 0) {
      profile.weeklyRatings[existingIdx] = entry;
    } else {
      profile.weeklyRatings.push(entry);
    }
    Storage.save(profile);
    renderProgress();
  });

  checkReady();
}

/* ---- SVG Chart ---- */
function renderChart(baseline, ratings, container, showPrimary, showSecondary) {
  if (!container) return;
  container.innerHTML = '';

  var allWeeks = [0];
  ratings.forEach(function (r) { allWeeks.push(r.week); });
  var maxWeek = Math.max.apply(null, allWeeks);

  var W = Math.max(300, (maxWeek + 1) * 44 + 60);
  var H = 180;
  var padL = 36, padR = 20, padT = 20, padB = 30;
  var plotW = W - padL - padR;
  var plotH = H - padT - padB;

  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Progress chart');

  // Y Grid
  for (var y = 1; y <= 5; y++) {
    var yPos = padT + plotH - ((y - 1) / 4) * plotH;
    var line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', padL); line.setAttribute('x2', W - padR);
    line.setAttribute('y1', yPos); line.setAttribute('y2', yPos);
    line.setAttribute('stroke', '#E5E7EB'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
    var label = document.createElementNS(ns, 'text');
    label.setAttribute('x', padL - 8); label.setAttribute('y', yPos + 4);
    label.setAttribute('text-anchor', 'end'); label.setAttribute('font-size', '11');
    label.setAttribute('fill', '#9CA3AF');
    label.textContent = y;
    svg.appendChild(label);
  }

  // X Labels
  for (var w = 0; w <= maxWeek; w++) {
    var xPos = padL + (w / maxWeek) * plotW;
    var xLabel = document.createElementNS(ns, 'text');
    xLabel.setAttribute('x', xPos); xLabel.setAttribute('y', H - 8);
    xLabel.setAttribute('text-anchor', 'middle'); xLabel.setAttribute('font-size', '10');
    xLabel.setAttribute('fill', '#9CA3AF');
    xLabel.textContent = w === 0 ? 'Start' : 'W' + w;
    svg.appendChild(xLabel);
  }

  function getX(week) { return padL + (week / maxWeek) * plotW; }
  function getY(val) { return padT + plotH - ((val - 1) / 4) * plotH; }

  var priData = [{ week: 0, val: baseline.primary }];
  var secData = [{ week: 0, val: baseline.secondary }];
  ratings.forEach(function (r) {
    priData.push({ week: r.week, val: r.primary });
    secData.push({ week: r.week, val: r.secondary });
  });

  function drawSeries(data, color, dashed) {
    for (var i = 1; i < data.length; i++) {
      var ln = document.createElementNS(ns, 'line');
      ln.setAttribute('x1', getX(data[i-1].week)); ln.setAttribute('y1', getY(data[i-1].val));
      ln.setAttribute('x2', getX(data[i].week)); ln.setAttribute('y2', getY(data[i].val));
      ln.setAttribute('stroke', color); ln.setAttribute('stroke-width', '2.5');
      if (dashed) ln.setAttribute('stroke-dasharray', '4,3');
      svg.appendChild(ln);
    }
    data.forEach(function (pt) {
      var circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', getX(pt.week)); circle.setAttribute('cy', getY(pt.val));
      circle.setAttribute('r', '4'); circle.setAttribute('fill', color);
      svg.appendChild(circle);
    });
  }

  if (showPrimary) drawSeries(priData, '#0B5E9E', false);
  if (showSecondary) drawSeries(secData, '#0F2D5E', true);

  container.appendChild(svg);
}

function renderProgressSummary(profile, cfg) {
  var con = Utils.getConsistency(profile.checkins, profile.startDate);
  var html = '<div class="section-title mt-16 mb-8">Your progress summary</div>';
  html += '<div class="progress-summary"><dl>';
  html += '<dt>Focus area</dt><dd>' + escHTML(cfg.label) + '</dd>';
  html += '<dt>Goal</dt><dd>' + escHTML(profile.goalText || 'Not set') + '</dd>';
  html += '<dt>Watched marker</dt><dd>' + escHTML(profile.marker || 'Not set') + '</dd>';
  html += '<dt>Started</dt><dd>' + Utils.formatDate(profile.startDate) + ' (Week ' + Utils.getWeekNumber(profile.startDate) + ')</dd>';
  html += '<dt>Starting baseline</dt><dd>Marker: ' + profile.baseline.primary + '/5, Overall: ' + profile.baseline.secondary + '/5</dd>';
  if (profile.weeklyRatings && profile.weeklyRatings.length) {
    html += '<dt>Weekly review history</dt><dd>';
    profile.weeklyRatings.forEach(function (r) {
      html += 'Week ' + r.week + ': ' + r.primary + '/5 marker, ' + r.secondary + '/5 overall' + (r.unusual ? ' (unusual flagged)' : '') + '<br>';
    });
    html += '</dd>';
  }
  html += '<dt>Consistency</dt><dd>' + con.done + ' of ' + con.total + ' days (' + Math.round(con.pct * 100) + '%)</dd>';
  if (profile.products && profile.products.length) {
    html += '<dt>Products used</dt><dd>';
    profile.products.forEach(function (p) { html += escHTML(p.name) + '<br>'; });
    html += '</dd>';
  }
  html += '</dl></div>';
  html += '<div class="mt-8 mb-8" style="display:flex;gap:8px;">' +
    '<button class="btn btn-secondary btn-sm" id="btn-print-summary" style="flex:1;">Save as PDF</button>' +
    '<button class="btn btn-secondary btn-sm" id="btn-copy-summary" style="flex:1;">Copy summary</button>' +
    '</div>';
  html += '<p class="muted">No personal identifiers are included in this summary.</p>';
  return html;
}



function renderSupport() {
  var route = '#/stuck';
  UI.updateTabBar(route);
  UI.renderHeader({ title: 'Support', back: '#/' });

  var profile = Storage.load();
  var c = UI.$content();

  if (!profile) {
    Router.navigate('#/welcome');
    return;
  }

  var cfg = Utils.getConcernConfig(profile.concern);
  var week = Utils.getWeekNumber(profile.startDate);

  var reasons = (CONTENT.support && CONTENT.support.reasons) ? CONTENT.support.reasons : [
    { id: 'slow', label: 'Results feel slow' },
    { id: 'cant_tell', label: 'Can not tell if it is working' },
    { id: 'forgetting', label: 'I keep forgetting' },
    { id: 'not_feeling_good', label: 'I am not feeling good about it' },
    { id: 'side_effects', label: 'Side effects' },
    { id: 'other', label: 'Something else' }
  ];

  var html = '<h1 style="font-size:1.25rem;font-weight:800;color:var(--deep-navy);margin-bottom:4px;">Feeling stuck?</h1>';
  html += '<p class="status-line">Progress takes practice. We can help you adjust.</p>';

  // Step 1: What is making it hard?
  html += '<div class="card mb-16">';
  html += '<h2 class="card-title" style="font-size:1rem;">What is making it hard?</h2>';
  html += '<p class="muted mb-12">Pick what fits best right now.</p>';
  html += '<div class="chip-group" id="stuck-reasons">';
  reasons.forEach(function (r) {
    html += '<button type="button" class="chip" data-id="' + r.id + '">' + escHTML(r.label) + '</button>';
  });
  html += '</div></div>';

  // Step 2: Tailored response area
  html += '<div id="tailored-card" style="display:none;" class="card mb-16">';
  html += '<h2 class="card-title" id="tailored-title" style="font-size:1rem;"></h2>';
  html += '<p class="card-text mb-14" id="tailored-body" style="line-height:1.4;"></p>';
  html += '<div id="tailored-action-wrap"></div>';
  html += '</div>';

  // Step 3: Three clear choices
  html += '<div class="card">';
  html += '<h2 class="card-title" style="font-size:1rem;">Choose your next step</h2>';
  html += '<p class="muted mb-14">No pressure, no guilt. You decide what works.</p>';
  html += '<div style="display:flex;flex-direction:column;gap:10px;">';
  html += '<button type="button" class="btn btn-primary btn-full" id="btn-stuck-keep">Keep going</button>';
  html += '<button type="button" class="btn btn-secondary btn-full" id="btn-stuck-pause">Pause for now (2 weeks)</button>';
  html += '<button type="button" class="btn btn-text-link" id="btn-stuck-done" style="text-align:center;margin-top:4px;">I am done</button>';
  html += '</div></div>';

  c.innerHTML = html;

  var tailoredData = (CONTENT.support && CONTENT.support.tailored) ? CONTENT.support.tailored : {};

  // Bind reason chips
  c.querySelectorAll('#stuck-reasons .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      c.querySelectorAll('#stuck-reasons .chip').forEach(function (b) { b.classList.remove('selected'); });
      this.classList.add('selected');

      var id = this.getAttribute('data-id');
      var item = tailoredData[id] || {
        title: 'Adjust your pace',
        body: 'Take a pause, review your notes, or continue when you feel ready.',
        action: 'Keep going',
        route: '#/home'
      };

      var tCard = document.getElementById('tailored-card');
      var tTitle = document.getElementById('tailored-title');
      var tBody = document.getElementById('tailored-body');
      var tActionWrap = document.getElementById('tailored-action-wrap');

      tTitle.textContent = item.title;
      tBody.textContent = item.body.replace('{week}', cfg.earlyWindowWeeks);

      if (item.isReminder) {
        tActionWrap.innerHTML = '<button type="button" class="btn btn-primary" id="btn-tailored-reminder">Remind me daily</button>';
        document.getElementById('btn-tailored-reminder').addEventListener('click', function () {
          downloadReminderICS(profile);
        });
      } else if (item.isPause) {
        tActionWrap.innerHTML = '<button type="button" class="btn btn-secondary" id="btn-tailored-pause">Pause routine</button>';
        document.getElementById('btn-tailored-pause').addEventListener('click', function () {
          profile.paused = { from: Utils.getToday(), until: Utils.addDays(Utils.getToday(), 14) };
          Storage.save(profile);
          UI.toast('Routine paused for 2 weeks');
          Router.navigate('#/home');
        });
      } else {
        tActionWrap.innerHTML = '<a href="' + (item.route || '#/home') + '" class="btn btn-primary">' + escHTML(item.action) + '</a>';
      }

      tCard.style.display = 'block';
      tCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  document.getElementById('btn-stuck-keep').addEventListener('click', function () {
    Router.navigate('#/home');
  });

  document.getElementById('btn-stuck-pause').addEventListener('click', function () {
    profile.paused = { from: Utils.getToday(), until: Utils.addDays(Utils.getToday(), 14) };
    Storage.save(profile);
    UI.toast('Routine paused for 2 weeks');
    Router.navigate('#/home');
  });

  document.getElementById('btn-stuck-done').addEventListener('click', function () {
    Router.navigate('#/decide');
  });
}



function renderRecap() {
  var profile = Storage.load();
  if (!profile) {
    Router.navigate('#/welcome');
    return;
  }
  var c = UI.$content();
  var cfg = Utils.getConcernConfig(profile.concern);
  var week = Utils.getWeekNumber(profile.startDate);
  var con = Utils.getConsistency(profile.checkins, profile.startDate);
  var streak = Utils.getStreak(profile.checkins);

  var baseRating = (profile.ratings && profile.ratings[0]) ? profile.ratings[0].primary : 3;
  var curRating = (profile.ratings && profile.ratings.length > 0) ? profile.ratings[profile.ratings.length - 1].primary : baseRating;

  if (!profile.recapSeen) profile.recapSeen = [];
  if (profile.recapSeen.indexOf(week) === -1) {
    profile.recapSeen.push(week);
    Storage.save(profile);
  }

  var currentSlide = 0;
  var slides = [
    {
      theme: 'navy',
      stat: (profile.checkins || []).filter(function (ci) { return ci.done; }).length,
      title: 'Week ' + week + ' completed',
      body: 'Every check-in is a step forward in your routine.'
    },
    {
      theme: 'navy',
      stat: Math.round(con.pct * 100) + '%',
      title: '28-Day Consistency',
      body: 'Best streak so far: ' + streak + ' days steady.'
    },
    {
      theme: 'cream',
      stat: baseRating + ' → ' + curRating,
      title: 'Your watched marker',
      body: escHTML(profile.marker || 'Watched marker') + ' trend out of 5.'
    },
    {
      theme: 'navy',
      stat: 'W' + week,
      title: 'Typical biology timeline',
      body: 'Many people notice subtle internal shifts before visible changes emerge.'
    },
    {
      theme: 'cream',
      stat: '',
      title: 'Why you started',
      body: profile.whyStarted ? ('“' + escHTML(profile.whyStarted) + '”') : 'Taking time for yourself every single day.'
    },
    {
      theme: 'navy',
      stat: 'Next',
      title: 'Looking ahead',
      body: 'Next milestone: ' + ((cfg.milestones && cfg.milestones[0]) ? cfg.milestones[0].title : 'Building foundation') + '.'
    }
  ];

  function drawSlide(idx) {
    var s = slides[idx];
    var html = '<div class="recap-modal-backdrop">';
    html += '<div class="recap-card ' + (s.theme === 'cream' ? 'theme-cream' : '') + '">';
    html += '<button type="button" class="recap-close-btn" id="recap-close" aria-label="Close recap">&times;</button>';
    
    html += '<div class="recap-progress-bars">';
    for (var i = 0; i < slides.length; i++) {
      html += '<div class="recap-segment' + (i <= idx ? ' active' : '') + '"></div>';
    }
    html += '</div>';

    html += '<div class="recap-content">';
    if (s.stat) html += '<div class="recap-big-stat">' + s.stat + '</div>';
    html += '<h2 class="recap-title">' + s.title + '</h2>';
    html += '<p class="recap-body">' + s.body + '</p>';
    html += '</div>';

    html += '<div class="recap-nav-btn-row">';
    if (idx > 0) {
      html += '<button type="button" class="btn btn-sm btn-secondary" id="recap-prev">Back</button>';
    } else {
      html += '<div></div>';
    }
    if (idx < slides.length - 1) {
      html += '<button type="button" class="btn btn-sm btn-primary" id="recap-next">Next</button>';
    } else {
      html += '<button type="button" class="btn btn-sm btn-primary" id="recap-finish">Done</button>';
    }
    html += '</div>';

    html += '</div></div>';
    c.innerHTML = html;

    document.getElementById('recap-close').addEventListener('click', function () {
      Router.navigate('#/home');
    });
    var prev = document.getElementById('recap-prev');
    if (prev) prev.addEventListener('click', function () { drawSlide(idx - 1); });
    var next = document.getElementById('recap-next');
    if (next) next.addEventListener('click', function () { drawSlide(idx + 1); });
    var finish = document.getElementById('recap-finish');
    if (finish) finish.addEventListener('click', function () { Router.navigate('#/home'); });
  }

  drawSlide(currentSlide);
}



