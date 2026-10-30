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

  
  getDailyMindsetQuote: function (dateStr) {
    if (!CONTENT.mindsetQuotes || !CONTENT.mindsetQuotes.length) {
      return { quote: "Trust the routine.", author: "Daily mindset" };
    }
    var d = this.parseDate(dateStr || this.getToday());
    var dayNum = Math.abs(d.getFullYear() * 365 + d.getMonth() * 31 + d.getDate());
    var idx = dayNum % CONTENT.mindsetQuotes.length;
    return CONTENT.mindsetQuotes[idx];
  },

  getDailyAffirmation: function (dateStr) {
    var affs = (CONTENT.mindSpace && CONTENT.mindSpace.affirmations) || [
      "Progress is happening in quiet cellular cycles."
    ];
    var d = this.parseDate(dateStr || this.getToday());
    var dayNum = Math.abs(d.getFullYear() * 365 + d.getMonth() * 31 + d.getDate());
    var idx = dayNum % affs.length;
    return affs[idx];
  },

  getBurnRate: function (product, checkins, startDate) {
    if (!product) return null;
    var sizeDays = product.sizeDays || 30;
    var openedOn = product.openedOn || startDate || this.getToday();
    var usedCount = 0;
    (checkins || []).forEach(function (c) {
      if (c.done && c.date >= openedOn) usedCount++;
    });
    var usedDoses = Math.min(sizeDays, Math.max(1, usedCount));
    var remainingDoses = Math.max(0, sizeDays - usedDoses);
    var estimatedFinish = this.addDays(this.getToday(), remainingDoses);
    var reorderDate = this.addDays(estimatedFinish, -5);
    return {
      totalDoses: sizeDays,
      usedDoses: usedDoses,
      remainingDoses: remainingDoses,
      pctUsed: Math.min(100, Math.round((usedDoses / sizeDays) * 100)),
      estimatedFinish: estimatedFinish,
      reorderDate: reorderDate,
      isLow: remainingDoses <= 5
    };
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






/* ==================== SVG ICONS & AVATARS ==================== */
var GUIDE_CHARACTER_PATH = 'M 333 64 L 344 66 L 344 68 L 335 89 L 325 103 L 305 123 L 283 139 L 279 141 L 274 132 L 299 113 L 316 96 L 326 82 L 333 65 Z M 229 81 L 244 82 L 253 90 L 256 97 L 256 105 L 253 113 L 247 119 L 240 122 L 227 121 L 218 114 L 214 104 L 215 95 L 218 89 L 223 84 L 228 82 Z M 240 93 L 232 92 L 227 96 L 227 107 L 233 111 L 240 110 L 245 104 L 245 99 L 241 94 Z M 110 104 L 112 104 L 121 116 L 132 124 L 154 133 L 181 137 L 242 136 L 256 139 L 262 142 L 267 148 L 267 159 L 260 166 L 218 180 L 212 186 L 214 188 L 264 187 L 276 190 L 283 196 L 285 201 L 285 210 L 283 214 L 275 221 L 260 227 L 212 236 L 188 243 L 179 248 L 171 256 L 166 267 L 165 326 L 166 353 L 168 354 L 201 298 L 218 266 L 220 259 L 232 260 L 233 359 L 249 332 L 264 298 L 274 265 L 278 240 L 279 238 L 290 240 L 282 280 L 267 321 L 249 356 L 231 383 L 220 379 L 219 288 L 168 377 L 157 375 L 154 331 L 154 273 L 156 261 L 160 252 L 165 245 L 177 236 L 201 227 L 254 217 L 268 212 L 274 207 L 274 203 L 272 201 L 262 198 L 212 199 L 207 197 L 201 189 L 201 181 L 206 174 L 213 170 L 250 158 L 254 156 L 256 152 L 251 149 L 240 147 L 178 148 L 152 144 L 137 139 L 114 125 L 102 110 L 109 105 Z';

var ICONS = {
  guideAvatar: '<svg class="guide-avatar-svg" width="22" height="22" viewBox="0 0 447 447" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="' + GUIDE_CHARACTER_PATH + '"/></svg>',
  guideHero: '<svg class="guide-hero-svg" width="56" height="56" viewBox="0 0 447 447" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="' + GUIDE_CHARACTER_PATH + '"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
};

/* ==================== SECTION REGISTRY ==================== */
var SECTIONS = [
  { id: 'companion', navLabel: 'Overview', title: 'Be Bodywise', render: renderHeroSection },
  { id: 'how', navLabel: '', title: 'How it works', render: renderHowSection },
  { id: 'setup', navLabel: 'Setup', title: 'Your plan', render: renderSetupSection },
  { id: 'today', navLabel: 'Daily Ritual', title: 'Daily ritual', render: renderCheckinSection, dashboard: true },
  { id: 'timeline', navLabel: 'Timeline', title: 'Your timeline', render: renderTimelineSection, dashboard: true },
  { id: 'mind', navLabel: 'Mind Space', title: 'Mind Space', render: renderMindSection, dashboard: true },
  { id: 'results', navLabel: 'Results', title: 'Your results', render: renderResultsSection, dashboard: true },
  { id: 'decide', navLabel: 'Next step', title: 'What next?', render: renderNextStepSection, dashboard: true },
  { id: 'closing', navLabel: '', title: '', render: renderClosingSection }
];
if (typeof window !== 'undefined') window.SECTIONS = SECTIONS;

/* ==================== JOURNEY CARD PRIORITY ==================== */
function getPrimaryCard(profile) {
  if (!profile) {
    return '<div class="card"><h3 class="card-title">Know if it\'s working</h3><p class="card-text">Set up your routine.</p><a href="#/start" data-scroll="setup" class="btn btn-primary">Set up my plan</a></div>';
  }
  if (Utils.isWeeklyRatingDue(profile)) {
    return '<div class="card"><h3 class="card-title">Weekly review</h3><p class="card-text">30 seconds. See how you\'re doing.</p><a href="#/progress" data-scroll="results" class="btn btn-primary">Start review</a></div>';
  }
  var refillNeeded = false;
  (profile.products || []).forEach(function (p) {
    var dl = Utils.getDaysLeft(p);
    if (dl !== null && dl <= 10) refillNeeded = true;
  });
  if (refillNeeded) {
    return '<div class="card"><h3 class="card-title">Refill soon</h3><p class="card-text">Plan your next pack.</p><a href="#/decide" data-scroll="decide" class="btn btn-primary">Plan refill</a></div>';
  }
  if (!Utils.isCheckedInToday(profile)) {
    return '<div class="card"><h3 class="card-title">Check in today</h3><p class="card-text">Check off today\'s morning or night steps.</p><a href="#/today" data-scroll="today" class="btn btn-primary">Mark done</a></div>';
  }
  if (profile.flags && !profile.flags.seenExpect) {
    return '<div class="card"><h3 class="card-title">See your timeline</h3><p class="card-text">Know what to expect each week.</p><a href="#/expect" data-scroll="timeline" class="btn btn-primary">View timeline</a></div>';
  }
  return '<div class="card"><h3 class="card-title">All done today</h3><p class="card-text">Your routine is on track.</p><a href="#/progress" data-scroll="results" class="btn btn-primary">See results</a></div>';
}

/* ==================== HEADER & SHELL ==================== */
UI.renderHeader = function () {
  var profile = Storage.load();
  var h = this.$header();
  if (!h) return;

  var ctaLabel = profile ? 'Daily Ritual' : 'Get started';
  var ctaTarget = profile ? 'today' : 'setup';

  var html = '<div class="header-inner">' +
    // Brand Logo with Fluid Line-Art Guide Avatar (Zero duplicate word "Companion")
    '<a href="#companion" class="header-brand" id="brand-logo" data-scroll="companion" title="Be Bodywise — Click with Shift to replay intro">' +
      '<span class="guide-avatar-badge">' + ICONS.guideAvatar + '</span>' +
      '<span class="brand-name">' + escHTML(CONTENT.brand || 'Be Bodywise') + '</span>' +
    '</a>' +

    // Clearly distinct navigation links
    '<nav class="header-nav" aria-label="Main section navigation">' +
      '<a href="#companion" class="header-nav-link active" data-scroll="companion">Overview</a>' +
      '<a href="#today" class="header-nav-link" data-scroll="today">Daily Ritual</a>' +
      '<a href="#timeline" class="header-nav-link" data-scroll="timeline">Timeline</a>' +
      '<a href="#mind" class="header-nav-link" data-scroll="mind">Mind Space</a>' +
      '<a href="#results" class="header-nav-link" data-scroll="results">Results</a>' +
    '</nav>' +

    // Header Actions
    '<div class="header-actions">' +
      '<a href="https://bebodywise.com" target="_blank" rel="noopener" class="header-shop-btn header-store-pill" title="Shop Official Bodywise Formulas">' +
        '<span>Shop Official Formulas</span>' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
      '</a>' +
      '<button type="button" class="btn btn-primary btn-sm" id="header-cta-btn" data-scroll="' + ctaTarget + '">' + ctaLabel + '</button>' +
      '<button type="button" class="header-menu-btn" id="header-menu-btn" aria-label="Menu and settings">' +
        ICONS.menu +
        '<span>Menu</span>' +
      '</button>' +
    '</div>' +
  '</div>';

  h.innerHTML = html;

  // Bind scroll links
  h.querySelectorAll('[data-scroll]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var target = el.getAttribute('data-scroll');
      scrollToSection(target);
    });
  });

  // Bind menu drawer
  var menuBtn = document.getElementById('header-menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      openSettingsDrawer();
    });
  }
};

/* ==================== SECTION SCROLLING & SCROLLSPY ==================== */
function scrollToSection(id) {
  var el = document.getElementById(id);
  if (el) {
    var headerOffset = 70;
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

function initScrollspy() {
  var navLinks = document.querySelectorAll('.header-nav-link, #tab-bar a');
  var sectionElements = [];
  SECTIONS.forEach(function (sec) {
    var el = document.getElementById(sec.id);
    if (el) sectionElements.push(el);
  });

  if (!window.IntersectionObserver) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          var target = link.getAttribute('data-scroll');
          if (target === id || (id === 'how' && target === 'companion')) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });

        // Dynamic desktop stepper highlight
        var railButtons = document.querySelectorAll('.rail-step-btn');
        railButtons.forEach(function (btn) {
          var target = btn.getAttribute('data-scroll');
          var node = btn.querySelector('.rail-step-node');
          if (target === id) {
            btn.classList.add('active');
            if (node && !node.classList.contains('completed')) {
              node.classList.add('active');
            }
          } else {
            btn.classList.remove('active');
            if (node) node.classList.remove('active');
          }
        });

        try {
          history.replaceState(null, '', '#' + id);
        } catch (e) {}
      }
    });
  }, { threshold: 0.25, rootMargin: '-60px 0px -40% 0px' });

  sectionElements.forEach(function (sec) {
    observer.observe(sec);
  });
}



/* ==================== SECTION BUILDERS & RENDERERS ==================== */

// F5 Progress Forecast Strip helper
function renderForecastStripHTML(cfg, profile) {
  var currentWk = profile ? Utils.getWeekNumber(profile.startDate) : 1;
  var html = '<div class="forecast-strip">';
  for (var w = 1; w <= cfg.fullWindowWeeks; w++) {
    var isCurrent = (w === currentWk);
    var isEarly = (w < cfg.earlyWindowWeeks);
    var isMiddle = (w >= cfg.earlyWindowWeeks && w < cfg.earlyWindowWeeks + 4);
    html += '<div class="forecast-card' + (isCurrent ? ' current-week' : '') + '">';
    if (isCurrent) html += '<span class="forecast-you-are-here">You are here</span>';
    html += '<div class="forecast-week">W' + w + '</div>';
    if (isEarly) {
      html += '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>';
      html += '<div class="forecast-label">Adjusting</div>';
    } else if (isMiddle) {
      html += '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/></svg>';
      html += '<div class="forecast-label">Early signs</div>';
    } else {
      html += '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>';
      html += '<div class="forecast-label">Steadier</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

/* ---- Section 1: Hero Section (Section 5.1 - Upgraded UI Placards & Benefit Badges) ---- */
function renderHeroSection(container) {
  var profile = Storage.load();
  var c = CONTENT.landing;

  var html = '<div class="container">' +
    '<div class="hero-split">' +
      // Left Column
      '<div class="hero-left">' +
        '<div class="hero-character-reveal">' +
          '<div class="hero-character-glow"></div>' +
          '<div class="hero-character-emblem">' +
            '<svg class="hero-emblem-svg" viewBox="0 0 447 447" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<circle cx="235" cy="102" r="15"/>' +
              '<path class="hero-draw-stroke" d="M 333 64 L 344 66 L 344 68 L 335 89 L 325 103 L 305 123 L 283 139 L 279 141 L 274 132 L 299 113 L 316 96 L 326 82 L 333 65"/>' +
              '<path class="hero-draw-stroke" d="M 284 240 C 275 280, 255 340, 232 381"/>' +
              '<path class="hero-draw-stroke" d="M 110 104 L 112 104 L 121 116 L 132 124 L 154 133 L 181 137 L 242 136 L 256 139 L 262 142 L 267 148 L 267 159 L 260 166 L 218 180 L 212 186 L 214 188 L 264 187 L 276 190 L 283 196 L 285 201 L 285 210 L 283 214 L 275 221 L 260 227 L 212 236 L 188 243 L 179 248 L 171 256 L 166 267 L 165 326 L 166 353 L 168 354 L 201 298 L 218 266 L 220 259 L 232 260 L 233 359 L 249 332 L 264 298 L 274 265 L 278 240 L 279 238 L 290 240 L 282 280 L 267 321 L 249 356 L 231 383 L 220 379 L 219 288 L 168 377 L 157 375 L 154 331 L 154 273 L 156 261 L 160 252 L 165 245 L 177 236 L 201 227 L 254 217 L 268 212 L 274 207 L 274 203 L 272 201 L 262 198 L 212 199 L 207 197 L 201 189 L 201 181 L 206 174 L 213 170 L 250 158 L 254 156 L 256 152 L 251 149 L 240 147 L 178 148 L 152 144 L 137 139 L 114 125 L 102 110 L 109 105 Z"/>' +
            '</svg>' +
          '</div>' +
        '</div>' +
        '<div class="hero-brand-eyebrow">' + escHTML(c.eyebrow || 'BE BODYWISE') + '</div>' +
        '<h1 class="hero-headline">' + escHTML(c.headline || 'Your Personal Progress Companion') + '</h1>' +
        '<p class="hero-subline">' + escHTML(c.subline || 'See real change, even when it is slow.') + '</p>' +
        '<div class="hero-benefits-grid">' +
          '<div class="benefit-pill">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B5E9E" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
            '<span>' + escHTML(c.benefits[0]) + '</span>' +
          '</div>' +
          '<div class="benefit-pill">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B5E9E" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
            '<span>' + escHTML(c.benefits[1]) + '</span>' +
          '</div>' +
          '<div class="benefit-pill">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B5E9E" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
            '<span>' + escHTML(c.benefits[2]) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="hero-cta-group">' +
          '<button type="button" class="btn btn-primary" id="hero-get-started" data-scroll="' + (profile ? 'today' : 'setup') + '">' +
            (profile ? 'Continue your daily ritual →' : escHTML(c.cta) + ' →') +
          '</button>' +
          '<span class="privacy-badge">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
            escHTML(c.privacyBadge) +
          '</span>' +
        '</div>' +
      '</div>' +

      // Right Column
      '<div class="hero-right">' +
        '<div class="hero-card">' +
          '<div class="hero-card-header">' +
            '<span class="hero-card-tag">' + (profile ? 'Your Ritual' : 'How change happens') + '</span>' +
            '<span class="hero-card-meta">' + (profile ? Utils.formatDate(Utils.getToday()) : 'Typical pace') + '</span>' +
          '</div>' +
          (profile ? getPrimaryCard(profile) :
            '<div class="journey-line-visual">' +
              '<svg class="journey-svg" viewBox="0 0 380 140" fill="none">' +
                '<path d="M 20 110 C 100 105, 180 85, 260 55 C 300 40, 340 35, 360 30 L 360 120 L 20 120 Z" fill="#E6F2FC" opacity="0.6"/>' +
                '<path class="signature-line" d="M 20 110 C 100 105, 180 85, 260 55 C 300 40, 340 35, 360 30" stroke="#0B5E9E" stroke-width="4" stroke-linecap="round"/>' +
                '<circle class="milestone-dot" cx="20" cy="110" r="6" fill="#0B5E9E"/>' +
                '<circle class="milestone-dot" cx="180" cy="85" r="6" fill="#0B5E9E"/>' +
                '<circle class="milestone-dot" cx="360" cy="30" r="7" fill="#F26B1D"/>' +
              '</svg>' +
              '<div class="journey-milestones-grid">' +
                '<div class="journey-milestone-node node-navy">' +
                  '<div class="milestone-node-dot"></div>' +
                  '<div class="milestone-node-info">' +
                    '<span class="milestone-node-time">Week 1</span>' +
                    '<span class="milestone-node-title">Foundation</span>' +
                  '</div>' +
                '</div>' +
                '<div class="journey-milestone-node node-blue">' +
                  '<div class="milestone-node-dot"></div>' +
                  '<div class="milestone-node-info">' +
                    '<span class="milestone-node-time">Week 4</span>' +
                    '<span class="milestone-node-title">Early signs</span>' +
                  '</div>' +
                '</div>' +
                '<div class="journey-milestone-node node-coral">' +
                  '<div class="milestone-node-dot"></div>' +
                  '<div class="milestone-node-info">' +
                    '<span class="milestone-node-time">Week 12</span>' +
                    '<span class="milestone-node-title">Real change</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>'
          ) +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  container.innerHTML = html;

  var getStartedBtn = container.querySelector('#hero-get-started');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var target = this.getAttribute('data-scroll');
      scrollToSection(target);
    });
  }
}

/* ---- Section 2: How It Works (Section 5.2 - 3 Column Grid & Visible on Load) ---- */
function renderHowSection(container) {
  var panels = (CONTENT.landing && CONTENT.landing.panels) || [
    { step: "1", title: "Set a goal", text: "Choose one focus area and a realistic timeframe.", detail: "About 1 minute." },
    { step: "2", title: "Check in daily", text: "Follow your morning and evening ritual steps.", detail: "10 seconds a day." },
    { step: "3", title: "See your results", text: "Track tangible micro-markers week by week.", detail: "Every week." }
  ];

  var html = '<div class="how-stage">' +
    '<div class="container">' +
      '<div class="how-header">' +
        '<h2 class="how-title">How it works</h2>' +
        '<p class="section-subline">Three simple steps to know if your routine is working.</p>' +
      '</div>' +

      '<div class="how-panels-container">' +
        '<div class="how-panels-row" id="how-panels-row">';

  panels.forEach(function (p, idx) {
    var svgVisual = '';
    if (idx === 0) {
      svgVisual = '<svg width="64" height="64" viewBox="0 0 80 80" fill="none" style="margin-bottom:14px;">' +
        '<circle cx="40" cy="40" r="34" stroke="#E6F2FC" stroke-width="6"/>' +
        '<path d="M 18 52 C 28 50, 42 38, 62 24" stroke="#0B5E9E" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="62" cy="24" r="6" fill="#F26B1D"/>' +
        '</svg>';
    } else if (idx === 1) {
      svgVisual = '<svg width="64" height="64" viewBox="0 0 80 80" fill="none" style="margin-bottom:14px;">' +
        '<circle cx="40" cy="40" r="32" stroke="#1c4ed8" stroke-width="5" stroke-linecap="round" stroke-dasharray="160" stroke-dashoffset="30"/>' +
        '<circle cx="40" cy="40" r="22" stroke="#0284c7" stroke-width="5" stroke-linecap="round" stroke-dasharray="110" stroke-dashoffset="20"/>' +
        '<circle cx="40" cy="40" r="12" stroke="#0d9488" stroke-width="5" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="0"/>' +
        '</svg>';
    } else {
      svgVisual = '<svg width="64" height="64" viewBox="0 0 80 80" fill="none" style="margin-bottom:14px;">' +
        '<rect x="10" y="16" width="60" height="48" rx="8" fill="#F0F6FC"/>' +
        '<path d="M 14 54 C 28 50, 44 36, 66 26 L 66 38 C 44 48, 28 58, 14 60 Z" fill="#E6F2FC"/>' +
        '<path d="M 14 56 C 28 52, 44 38, 66 28" stroke="#0B5E9E" stroke-width="3.5" stroke-linecap="round"/>' +
        '<circle cx="44" cy="38" r="4" fill="#F26B1D"/>' +
        '</svg>';
    }

    html += '<div class="how-panel" data-panel="' + idx + '">' +
      svgVisual +
      '<div class="badge badge-blue mb-8">Step ' + escHTML(p.step) + '</div>' +
      '<h3 class="card-title" style="font-size:1.25rem;margin-bottom:8px;">' + escHTML(p.title) + '</h3>' +
      '<p class="card-text" style="font-size:0.95rem;margin-bottom:10px;">' + escHTML(p.text) + '</p>' +
      '<p class="muted" style="font-size:0.84rem;">' + escHTML(p.detail) + '</p>' +
      '</div>';
  });

  html += '</div></div>' +
    '</div></div>';

  container.innerHTML = html;
}

/* ---- Section 3: Smart Fork & Bathroom Shelf Setup (with Living Guide Persona) ---- */
function renderSetupSection(container) {
  var profile = Storage.load();

  if (profile && !startState.editing) {
    var concernCfg = Utils.getConcernConfig(profile.concern);
    var pCount = (profile.products || []).length;
    var html = '<div class="container">' +
      '<div class="section-header text-center">' +
        '<h2 class="section-title">Bathroom Shelf</h2>' +
        '<p class="section-subline">' + escHTML(concernCfg.label) + ' routine · ' + pCount + ' active formula' + (pCount === 1 ? '' : 's') + '</p>' +
        '<p class="official-shelf-sublink" style="font-size:0.88rem;color:#0B5E9E;margin-top:6px;">' +
          'Need to refill or explore actives? <a href="https://bebodywise.com" target="_blank" rel="noopener" class="store-link-accent" style="color:#0B5E9E;font-weight:600;text-decoration:underline;">View full ingredients on Be Bodywise ↗</a>' +
        '</p>' +
      '</div>' +

      '<div class="card" style="max-width:620px;margin:0 auto;padding:28px 24px;">' +
        '<div class="shelf-active-list" style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">' +
          (profile.products || []).map(function (p) {
            return '<div class="shelf-active-item" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">' +
              '<div class="shelf-item-icon" style="width:36px;height:36px;border-radius:8px;background:#EBF4FC;display:flex;align-items:center;justify-content:center;color:#0B5E9E;flex-shrink:0;">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
              '</div>' +
              '<div class="shelf-item-details" style="flex:1;">' +
                '<div class="shelf-item-name" style="font-weight:600;color:#0F172A;font-size:0.95rem;">' + escHTML(p.name || 'Bodywise formula') + '</div>' +
                '<div class="shelf-item-meta" style="font-size:0.8rem;color:#64748B;">' + (p.frequency || 'Daily') + ' · Started ' + Utils.formatDate(p.openedOn || profile.startDate) + '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;gap:12px;justify-content:center;margin-top:16px;">' +
          '<button type="button" class="btn btn-primary btn-sm" id="btn-go-today">Daily ritual ↓</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" id="btn-edit-plan">Update shelf formulas</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    container.innerHTML = html;

    var goTodayBtn = container.querySelector('#btn-go-today');
    if (goTodayBtn) goTodayBtn.addEventListener('click', function () { scrollToSection('today'); });

    var editPlanBtn = container.querySelector('#btn-edit-plan');
    if (editPlanBtn) {
      editPlanBtn.addEventListener('click', function () {
        prefillStartState(profile);
        startState.forkChoice = 'owned';
        startState.step = 0;
        renderSetupSection(container);
      });
    }
    return;
  }

  // If no forkChoice yet: Render Screen 1 "Do you already have a Bodywise product?"
  if (!startState.forkChoice) {
    renderSmartForkScreen(container);
    return;
  }

  // If forkChoice is exploring: Render Curated Discovery Catalog
  if (startState.forkChoice === 'exploring') {
    renderDiscoveryCatalog(container);
    return;
  }

  // If forkChoice is owned: Render Bathroom Shelf Setup
  renderBathroomShelfSetup(container);
}

function renderSmartForkScreen(container) {
  var fork = CONTENT.fork;
  var html = '<div class="container">' +
    '<div class="section-header text-center">' +
      '<h2 class="section-title">Start your routine</h2>' +
      '<p class="section-subline">' + escHTML(fork.subline) + '</p>' +
    '</div>' +

    '<div class="card" style="max-width:620px;margin:0 auto;padding:32px 24px;">' +
      '<div class="guide-speech-card">' +
        '<div class="guide-avatar-circle">' + ICONS.guideAvatar + '</div>' +
        '<div class="guide-speech-body">' +
          '<div class="guide-speech-title">' + escHTML(CONTENT.guide.avatarTitle) + '</div>' +
          '<div class="guide-speech-text">Welcome! Let\'s personalize your companion. Do you already have your Bodywise formulas?</div>' +
        '</div>' +
      '</div>' +

      '<h3 class="card-title text-center mb-16" style="font-size:1.15rem;">' + escHTML(fork.question) + '</h3>' +

      '<div class="fork-options-grid">' +
        '<button type="button" class="fork-card-btn" data-fork="owned">' +
          '<div class="fork-btn-title">' + escHTML(fork.options[0].title) + '</div>' +
          '<div class="fork-btn-desc">' + escHTML(fork.options[0].desc) + '</div>' +
        '</button>' +

        '<button type="button" class="fork-card-btn" data-fork="exploring">' +
          '<div class="fork-btn-title">' + escHTML(fork.options[1].title) + '</div>' +
          '<div class="fork-btn-desc">' + escHTML(fork.options[1].desc) + '</div>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  container.innerHTML = html;

  container.querySelectorAll('[data-fork]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      startState.forkChoice = this.getAttribute('data-fork');
      startState.step = 0;
      renderSetupSection(container);
    });
  });
}

// 2. Curated Product Discovery
function renderDiscoveryCatalog(container) {
  var discList = CONTENT.discovery || [];
  var html = '<div class="container">' +
    '<div class="section-header text-center">' +
      '<h2 class="section-title">Explore Bodywise routines</h2>' +
      '<p class="section-subline">Browse science-backed formulas on the official store.</p>' +
    '</div>' +

    '<div style="max-width:880px;margin:0 auto;">' +
      '<div class="guide-speech-card" style="margin-bottom:20px;">' +
        '<div class="guide-avatar-circle">' + ICONS.guideAvatar + '</div>' +
        '<div class="guide-speech-body">' +
          '<div class="guide-speech-title">' + escHTML(CONTENT.guide.avatarTitle) + '</div>' +
          '<div class="guide-speech-text">Find your formula on our official store. When your order arrives, we will set up your bathroom shelf!</div>' +
        '</div>' +
      '</div>' +

      '<div class="discovery-grid mb-24">';

  discList.forEach(function (item) {
    html += '<div class="discovery-card">' +
      '<div class="badge badge-blue mb-8">' + escHTML(item.concern) + '</div>' +
      '<h3 class="card-title" style="font-size:1.15rem;margin-bottom:6px;">' + escHTML(item.product) + '</h3>' +
      '<p class="card-text mb-16" style="font-size:0.88rem;color:var(--text-secondary);">' + escHTML(item.benefit) + '</p>' +
      '<a href="' + escHTML(item.url) + '" target="_blank" rel="noopener" class="outbound-link-btn">' +
        'View formula on Bodywise \u2197' +
      '</a>' +
    '</div>';
  });

  html += '</div>' +
      '<div class="card text-center" style="padding:24px;background:#F0F7FF;border:1.5px solid #BFDBFE;">' +
        '<h4 style="font-size:1.05rem;font-weight:700;color:var(--deep-navy);margin-bottom:6px;">Already placed an order?</h4>' +
        '<p class="card-text mb-14" style="font-size:0.9rem;">If your product is on the way, you can build your bathroom shelf now.</p>' +
        '<div style="display:flex;gap:12px;justify-content:center;">' +
          '<button type="button" class="btn btn-primary" id="btn-ordered-setup">I have ordered, start setup \u2192</button>' +
          '<button type="button" class="btn btn-secondary" id="btn-back-fork">Back</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  container.innerHTML = html;

  var orderedBtn = container.querySelector('#btn-ordered-setup');
  if (orderedBtn) {
    orderedBtn.addEventListener('click', function () {
      startState.forkChoice = 'owned';
      startState.step = 0;
      renderSetupSection(container);
    });
  }

  var backBtn = container.querySelector('#btn-back-fork');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      startState.forkChoice = null;
      renderSetupSection(container);
    });
  }
}

// 3. Bathroom Shelf Setup with Living Guide Speech Bubbles
function renderBathroomShelfSetup(container) {
  var ans = startState.answers;
  ans.ownedProducts = ans.ownedProducts || [];
  var step = startState.step || 0;
  var speech = CONTENT.guide.setupSpeech;

  // Step 0: Name
  if (step === 0) {
    var html = '<div class="container">' +
      '<div class="card" style="max-width:540px;margin:0 auto;padding:32px 24px;">' +
        '<div class="guide-speech-card">' +
          '<div class="guide-avatar-circle">' + ICONS.guideAvatar + '</div>' +
          '<div class="guide-speech-body">' +
            '<div class="guide-speech-title">' + escHTML(CONTENT.guide.avatarTitle) + '</div>' +
            '<div class="guide-speech-text">' + escHTML(speech.step1) + '</div>' +
          '</div>' +
        '</div>' +
        '<h2 class="section-title mb-4">Your first name</h2>' +
        '<p class="muted mb-16" style="font-size:0.86rem;">To personalize your daily shelf space.</p>' +
        '<div class="field"><label for="user-name">Your first name</label>' +
          '<input type="text" id="user-name" placeholder="e.g. Priya" value="' + escHTML(ans.name) + '" autofocus>' +
        '</div>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:24px;">' +
          '<button type="button" class="btn btn-primary" id="shelf-next-name">Next step \u2192</button>' +
        '</div>' +
      '</div></div>';

    container.innerHTML = html;

    var input = document.getElementById('user-name');
    if (input) {
      input.addEventListener('focus', function () { this.classList.add('focus-ring-active'); });
      input.addEventListener('blur', function () { this.classList.remove('focus-ring-active'); });
      input.addEventListener('input', function () { ans.name = Utils.toTitleCase(this.value); });
    }

    document.getElementById('shelf-next-name').addEventListener('click', function () {
      if (!ans.name) ans.name = 'Friend';
      startState.step = 1;
      renderBathroomShelfSetup(container);
    });
    return;
  }

  // Step 1: Concern Selection
  if (step === 1) {
    var html = '<div class="container">' +
      '<div class="card" style="max-width:580px;margin:0 auto;padding:32px 24px;">' +
        '<div class="guide-speech-card">' +
          '<div class="guide-avatar-circle">' + ICONS.guideAvatar + '</div>' +
          '<div class="guide-speech-body">' +
            '<div class="guide-speech-title">' + escHTML(CONTENT.guide.avatarTitle) + '</div>' +
            '<div class="guide-speech-text">' + escHTML(speech.step2) + '</div>' +
          '</div>' +
        '</div>' +
        '<h2 class="section-title mb-4">Choose your focus area</h2>' +
        '<p class="muted mb-16" style="font-size:0.86rem;">We tailor your routine steps to this concern.</p>' +
        '<div class="chip-group" role="radiogroup">';

    CONTENT.quiz.concerns.forEach(function (opt) {
      var sel = (ans.concern === opt.value);
      html += '<button type="button" class="chip' + (sel ? ' selected focus-ring-active' : '') + '" data-concern="' + opt.value + '">' +
        escHTML(opt.label) +
      '</button>';
    });

    html += '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:24px;">' +
          '<button type="button" class="btn btn-secondary" id="shelf-back-concern">Back</button>' +
          '<button type="button" class="btn btn-primary" id="shelf-next-concern"' + (ans.concern ? '' : ' disabled') + '>Next step \u2192</button>' +
        '</div>' +
      '</div></div>';

    container.innerHTML = html;

    container.querySelectorAll('[data-concern]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        ans.concern = this.getAttribute('data-concern');
        ans.ownedProducts = [];
        container.querySelectorAll('[data-concern]').forEach(function (c) { c.classList.remove('selected', 'focus-ring-active'); });
        this.classList.add('selected', 'focus-ring-active');
        document.getElementById('shelf-next-concern').disabled = false;
      });
    });

    document.getElementById('shelf-back-concern').addEventListener('click', function () {
      startState.step = 0;
      renderBathroomShelfSetup(container);
    });

    document.getElementById('shelf-next-concern').addEventListener('click', function () {
      if (ans.concern) {
        startState.step = 2;
        renderBathroomShelfSetup(container);
      }
    });
    return;
  }

  // Step 2: Check off Owned Products
  if (step === 2) {
    var catalog = CONTENT.catalog[ans.concern] || [];
    var html = '<div class="container">' +
      '<div class="card" style="max-width:640px;margin:0 auto;padding:32px 24px;">' +
        '<div class="guide-speech-card">' +
          '<div class="guide-avatar-circle">' + ICONS.guideAvatar + '</div>' +
          '<div class="guide-speech-body">' +
            '<div class="guide-speech-title">' + escHTML(CONTENT.guide.avatarTitle) + '</div>' +
            '<div class="guide-speech-text">' + escHTML(speech.step3) + '</div>' +
          '</div>' +
        '</div>' +
        '<h2 class="section-title mb-4">Your bathroom shelf</h2>' +
        '<p class="muted mb-16" style="font-size:0.86rem;">Select every formula you currently have with you.</p>' +
        '<div class="shelf-products-grid">';

    catalog.forEach(function (p) {
      var isChecked = ans.ownedProducts.indexOf(p.id) >= 0;
      html += '<div class="shelf-product-item' + (isChecked ? ' selected focus-ring-active' : '') + '" data-prod-id="' + p.id + '">' +
        '<div class="shelf-checkbox">' + (isChecked ? ICONS.check : '') + '</div>' +
        '<span style="font-size:0.92rem;font-weight:600;color:var(--deep-navy);">' + escHTML(p.name) + '</span>' +
      '</div>';
    });

    html += '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:24px;">' +
          '<button type="button" class="btn btn-secondary" id="shelf-back-concern">Back</button>' +
          '<button type="button" class="btn btn-primary" id="shelf-next-products"' + (ans.ownedProducts.length ? '' : ' disabled') + '>Next step \u2192</button>' +
        '</div>' +
      '</div></div>';

    container.innerHTML = html;

    container.querySelectorAll('.shelf-product-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var pid = this.getAttribute('data-prod-id');
        var idx = ans.ownedProducts.indexOf(pid);
        if (idx >= 0) {
          ans.ownedProducts.splice(idx, 1);
        } else {
          ans.ownedProducts.push(pid);
        }
        renderBathroomShelfSetup(container);
      });
    });

    document.getElementById('shelf-back-concern').addEventListener('click', function () {
      startState.step = 1;
      renderBathroomShelfSetup(container);
    });

    document.getElementById('shelf-next-products').addEventListener('click', function () {
      if (ans.ownedProducts.length) {
        startState.step = 3;
        renderBathroomShelfSetup(container);
      }
    });
    return;
  }

  // Step 3: Routine Timing & Start Date -> "Build my daily routine"
  if (step === 3) {
    var html = '<div class="container">' +
      '<div class="card" style="max-width:580px;margin:0 auto;padding:32px 24px;">' +
        '<div class="guide-speech-card">' +
          '<div class="guide-avatar-circle">' + ICONS.guideAvatar + '</div>' +
          '<div class="guide-speech-body">' +
            '<div class="guide-speech-title">' + escHTML(CONTENT.guide.avatarTitle) + '</div>' +
            '<div class="guide-speech-text">' + escHTML(speech.step4) + '</div>' +
          '</div>' +
        '</div>' +
        '<h2 class="section-title mb-4">When can you fit it in?</h2>' +
        '<p class="muted mb-16" style="font-size:0.86rem;">We will set your AM / PM daily ritual steps.</p>' +
        '<div class="chip-group mb-20">' +
          '<button type="button" class="chip' + (ans.routineTime === 'morning' ? ' selected focus-ring-active' : '') + '" data-time="morning">Morning only</button>' +
          '<button type="button" class="chip' + (ans.routineTime === 'night' ? ' selected focus-ring-active' : '') + '" data-time="night">Night only</button>' +
          '<button type="button" class="chip' + (ans.routineTime === 'both' ? ' selected focus-ring-active' : '') + '" data-time="both">Both morning & night</button>' +
        '</div>' +

        '<h3 class="card-title mb-4" style="font-size:1rem;">When did you start?</h3>' +
        '<div class="chip-group mb-24">' +
          '<button type="button" class="chip' + (ans.startBucket === 'notYet' ? ' selected focus-ring-active' : '') + '" data-bucket="notYet">Starting today</button>' +
          '<button type="button" class="chip' + (ans.startBucket === 'under1m' ? ' selected focus-ring-active' : '') + '" data-bucket="under1m">Past 2 weeks</button>' +
          '<button type="button" class="chip' + (ans.startBucket === '1to3m' ? ' selected focus-ring-active' : '') + '" data-bucket="1to3m">1 to 2 months ago</button>' +
        '</div>' +

        '<div style="display:flex;justify-content:space-between;margin-top:24px;">' +
          '<button type="button" class="btn btn-secondary" id="shelf-back-products">Back</button>' +
          '<button type="button" class="btn btn-primary" id="btn-save-shelf">Build my daily routine \u2192</button>' +
        '</div>' +
      '</div></div>';

    container.innerHTML = html;

    document.getElementById('shelf-back-products').addEventListener('click', function () {
      startState.step = 2;
      renderBathroomShelfSetup(container);
    });

    container.querySelectorAll('[data-time]').forEach(function (b) {
      b.addEventListener('click', function () {
        ans.routineTime = b.getAttribute('data-time');
        renderBathroomShelfSetup(container);
      });
    });

    container.querySelectorAll('[data-bucket]').forEach(function (b) {
      b.addEventListener('click', function () {
        ans.startBucket = b.getAttribute('data-bucket');
        renderBathroomShelfSetup(container);
      });
    });

    document.getElementById('btn-save-shelf').addEventListener('click', function () {
      var concern = ans.concern || 'hair';
      var cfg = Utils.getConcernConfig(concern);
      var catalogList = CONTENT.catalog[concern] || [];
      var ownedList = (ans.ownedProducts || []).map(function (pid) {
        var match = catalogList.find(function (c) { return c.id === pid; });
        return match || { id: pid, name: 'Targeted formula', sizeDays: 30 };
      });
      if (!ownedList.length && catalogList.length) {
        ownedList.push(catalogList[0]);
      }

      var startDate = Utils.getStartDateFromBucket(ans.startBucket || 'notYet');
      var profile = {
        version: 3,
        name: ans.name || 'Friend',
        concern: concern,
        startDate: startDate,
        startBucket: ans.startBucket || 'notYet',
        routineTime: ans.routineTime || 'morning',
        products: ownedList,
        marker: (cfg.markers && cfg.markers[0]) || 'Observed change',
        checkins: [],
        flags: { seenExpect: true },
        baseline: { primary: 3, secondary: 3, date: startDate }
      };

      Storage.save(profile);
      clearDraft();
      startState.editing = false;

      // Completion badge with animated character
      var cardEl = container.querySelector('.card');
      if (cardEl) {
        var badge = document.createElement('div');
        badge.className = 'guide-completion-badge';
        var badgeText = (CONTENT.guide && CONTENT.guide.routineReady) ? CONTENT.guide.routineReady.replace(/\n/g, ' ') : 'Your routine is ready.';
        badge.innerHTML = '<div class="guide-avatar-circle" style="width:36px;height:36px;background:#fff;">' + ICONS.guideAvatar + '</div>' +
          '<span>' + escHTML(badgeText) + '</span>';
        cardEl.insertBefore(badge, cardEl.firstChild);
      }

      // Complete all section DOM updates, smoothly transition to #today
      setTimeout(function () {
        renderAllSections();
        scrollToSection('today');

        var floatBtn = document.getElementById('guide-floating-btn');
        if (floatBtn) {
          floatBtn.classList.add('guide-docked-badge');
          var existingChip = floatBtn.querySelector('.guide-floating-speech-chip');
          if (existingChip) existingChip.remove();
          var chip = document.createElement('span');
          chip.className = 'guide-floating-speech-chip';
          chip.textContent = (CONTENT.guide && CONTENT.guide.tapDoubts) || 'Tap me anytime you have doubts.';
          floatBtn.appendChild(chip);
          setTimeout(function () {
            if (chip && chip.parentNode) chip.remove();
          }, 5000);
        }

        var todaySec = document.getElementById('today');
        if (todaySec) {
          todaySec.classList.add('fade-in-entry');
          setTimeout(function () { todaySec.classList.remove('fade-in-entry'); }, 1200);
        }
      }, 350);
      UI.toast('Bathroom shelf ready. Daily ritual generated.');
    });
  }
}

// Override renderStart for direct compatibility
function renderStart() {
  var setupSec = document.getElementById('setup');
  if (setupSec) {
    renderSetupSection(setupSec);
    scrollToSection('setup');
  }
}

/* ---- Section 4: Daily Ritual (with Guide Greeting & Independent Step Toggles) ---- */
function renderCheckinSection(container) {
  var profile = Storage.load();

  if (!profile) {
    var p = (CONTENT.landing && CONTENT.landing.placeholder) || { title: "Set up your routine first", text: "Complete your quick setup to unlock this section.", cta: "Set up my plan" };
    container.innerHTML = '<div class="container">' +
      '<div class="section-header text-center">' +
        '<h2 class="section-title">Daily ritual</h2>' +
        '<p class="section-subline">Ten seconds a day to record your routine and note how you feel.</p>' +
      '</div>' +
      '<div class="card text-center" style="max-width:540px;margin:0 auto;padding:36px 24px;">' +
        '<h3 class="card-title mb-8">' + escHTML(p.title) + '</h3>' +
        '<p class="card-text mb-20">' + escHTML(p.text) + '</p>' +
        '<button type="button" class="btn btn-primary" data-scroll="setup">' + escHTML(p.cta) + '</button>' +
      '</div>' +
    '</div>';
    container.querySelector('[data-scroll]').addEventListener('click', function (e) {
      e.preventDefault();
      scrollToSection('setup');
    });
    return;
  }

  var today = Utils.getToday();
  var isCheckedIn = Utils.isCheckedInToday(profile);
  var checkinToday = Utils.getCheckinForDate(profile, today) || { ritualDone: [] };
  var ritualDone = checkinToday.ritualDone || [];
  var streak = Utils.getStreak(profile.checkins);

  // Time-of-day greeting
  var hour = new Date().getHours();
  var timeSlot = (hour < 12) ? 'morning' : ((hour < 17) ? 'afternoon' : 'evening');
  var greetingTpl = CONTENT.guide.greetings[timeSlot];
  var greetingText = Utils.templateStr(greetingTpl, { name: profile.name, streak: Math.max(1, streak) });

  var mindset = Utils.getDailyMindsetQuote(today);
  var templates = CONTENT.ritualTemplates || {};
  var template = templates[profile.concern] || templates.hair;
  var rTime = profile.routineTime || 'morning';

  var allStepIds = [];
  if (rTime === 'morning' || rTime === 'both') {
    (template.am || []).forEach(function (s) { allStepIds.push(s.id); });
  }
  if (rTime === 'night' || rTime === 'both') {
    (template.pm || []).forEach(function (s) { allStepIds.push(s.id); });
  }

  var html = '<div class="container">' +
    '<div class="section-header">' +
      '<h2 class="section-title">Daily ritual</h2>' +
      '<p class="section-subline">' + Utils.formatDate(today) + ' · Day ' + (Utils.daysBetween(profile.startDate, today) + 1) + '</p>' +
    '</div>' +

    // Living Guide Persona Greeting Banner
    '<div class="guide-speech-card">' +
      '<div class="guide-avatar-circle">' + ICONS.guideAvatar + '</div>' +
      '<div class="guide-speech-body">' +
        '<div class="guide-speech-title">' + escHTML(CONTENT.guide.avatarTitle) + '</div>' +
        '<div class="guide-speech-text">' + escHTML(greetingText) + '</div>' +
      '</div>' +
    '</div>' +

    // Daily Mindset & Motivation Card
    '<div class="mindset-card mb-24">' +
      '<div class="mindset-badge">Daily mindset</div>' +
      '<div class="mindset-quote">' + escHTML(mindset.quote) + '</div>' +
      '<div class="mindset-author">' + escHTML(mindset.author) + '</div>' +
    '</div>' +

    '<div class="checkin-grid">' +
      // Left Column: Step-by-Step Interactive Ritual Checklist
      '<div class="checkin-left-col">' +
        '<div class="card ritual-checklist-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<h3 class="card-title" style="margin-bottom:0;">Today\'s formula checklist</h3>' +
            '<span class="badge badge-blue">' + ritualDone.length + '/' + allStepIds.length + ' done</span>' +
          '</div>' +
          '<p class="card-text mb-14" style="font-size:0.86rem;color:var(--text-secondary);">' +
            'Tap each step as you complete it. Uncheck anytime to redo.' +
          '</p>';

  // Render AM steps
  if (rTime === 'morning' || rTime === 'both') {
    (template.am || []).forEach(function (step) {
      var isStepDone = ritualDone.indexOf(step.id) >= 0;
      html += '<div class="ritual-step-item' + (isStepDone ? ' checked' : '') + '" data-step-id="' + step.id + '">' +
        '<div class="ritual-checkbox">' + (isStepDone ? ICONS.check : '') + '</div>' +
        '<span class="ritual-step-text"><strong>AM:</strong> ' + escHTML(step.text) + '</span>' +
      '</div>';
    });
  }

  // Render PM steps
  if (rTime === 'night' || rTime === 'both') {
    (template.pm || []).forEach(function (step) {
      var isStepDone = ritualDone.indexOf(step.id) >= 0;
      html += '<div class="ritual-step-item' + (isStepDone ? ' checked' : '') + '" data-step-id="' + step.id + '">' +
        '<div class="ritual-checkbox">' + (isStepDone ? ICONS.check : '') + '</div>' +
        '<span class="ritual-step-text"><strong>PM:</strong> ' + escHTML(step.text) + '</span>' +
      '</div>';
    });
  }

  html += '<button type="button" class="btn-mark-all-done" id="btn-mark-all-done">' +
      ICONS.check +
      '<span>Mark all steps done today</span>' +
    '</button>' +
  '</div></div>' +

      // Right Column: Circular 180px Check-in Ring Card
      '<div class="checkin-right-col">' +
        '<div class="card text-center" style="padding:28px 20px;">' +
          '<div class="ring-container mb-16" style="display:flex;justify-content:center;">' +
            '<svg class="checkin-ring' + (isCheckedIn ? ' done pulse' : '') + '" width="140" height="140" viewBox="0 0 180 180" id="ring-btn" role="button" tabindex="0" aria-label="Toggle today check-in" style="cursor:pointer;">' +
              '<circle cx="90" cy="90" r="76" stroke="#E6F2FC" stroke-width="12" fill="none"/>' +
              '<circle class="ring-track" cx="90" cy="90" r="76" stroke="#0B5E9E" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="477.5" stroke-dashoffset="' + (isCheckedIn ? '0' : '477.5') + '" style="transition:stroke-dashoffset 0.6s var(--ease-out);"/>' +
              (isCheckedIn ?
                '<path class="ring-check" d="M 60 92 L 80 112 L 122 70" stroke="#0B5E9E" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' :
                '<text x="90" y="86" text-anchor="middle" font-family="Figtree, sans-serif" font-size="14" font-weight="600" fill="#6B7280">TAP TO</text><text x="90" y="108" text-anchor="middle" font-family="Figtree, sans-serif" font-size="17" font-weight="700" fill="#0F2D5E">COMPLETE</text>'
              ) +
            '</svg>' +
          '</div>' +
          '<h3 class="card-title mb-6">' + (isCheckedIn ? 'Ritual complete today' : 'Daily status') + '</h3>' +
          '<p class="card-text mb-16" style="font-size:0.9rem;">' +
            (isCheckedIn ? 'Great consistency! Your streak is ' + streak + ' days.' : 'Complete your ritual to log today.') +
          '</p>' +
          '<div class="dot-row-container mb-12">' +
            renderDotGrid(profile) +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  container.innerHTML = html;

  // Independent Step Clicks (Clicking toggles ONLY that step)
  container.querySelectorAll('.ritual-step-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var stepId = item.getAttribute('data-step-id');
      var ci = Utils.getCheckinForDate(profile, today);
      if (!ci) {
        ci = { date: today, done: false, rest: false, mood: null, ritualDone: [] };
        profile.checkins.push(ci);
      }
      ci.ritualDone = ci.ritualDone || [];
      var sIdx = ci.ritualDone.indexOf(stepId);
      if (sIdx >= 0) {
        ci.ritualDone.splice(sIdx, 1);
      } else {
        ci.ritualDone.push(stepId);
      }

      // Mark done if all steps are completed
      ci.done = (ci.ritualDone.length === allStepIds.length && allStepIds.length > 0);

      Storage.save(profile);
      renderCheckinSection(container);
      renderDesktopRail();
      UI.toast(ci.done ? 'All steps complete. Checked in!' : 'Step toggled');
    });
  });

  // Explicit "Mark All Done" button
  var markAllBtn = container.querySelector('#btn-mark-all-done');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', function () {
      var ci = Utils.getCheckinForDate(profile, today);
      if (!ci) {
        ci = { date: today, done: true, rest: false, mood: null, ritualDone: allStepIds.slice() };
        profile.checkins.push(ci);
      } else {
        ci.ritualDone = allStepIds.slice();
        ci.done = true;
      }
      Storage.save(profile);
      renderCheckinSection(container);
      renderDesktopRail();
      UI.toast('All ritual steps completed!');
    });
  }

  // Ring button full check-in toggle
  var ringBtn = document.getElementById('ring-btn');
  if (ringBtn) {
    ringBtn.addEventListener('click', function () {
      var ci = Utils.getCheckinForDate(profile, today);
      if (!ci) {
        ci = { date: today, done: true, rest: false, mood: null, ritualDone: allStepIds.slice() };
        profile.checkins.push(ci);
      } else {
        ci.done = !ci.done;
        if (ci.done && (!ci.ritualDone || !ci.ritualDone.length)) {
          ci.ritualDone = allStepIds.slice();
        }
      }
      Storage.save(profile);
      renderCheckinSection(container);
      renderDesktopRail();
      UI.toast(ci.done ? 'Ritual recorded for today' : 'Check-in undone');
    });
  }
}

/* ---- Section 5: Timeline (Upgraded Timeline Placards with Beneath & Expect Bullets) ---- */
function renderTimelineSection(container) {
  var profile = Storage.load();

  if (!profile) {
    var p = (CONTENT.landing && CONTENT.landing.placeholder) || { title: "Set up your routine first", text: "Complete your quick setup to unlock this section.", cta: "Set up my plan" };
    container.innerHTML = '<div class="container">' +
      '<div class="section-header text-center">' +
        '<h2 class="section-title">Your timeline</h2>' +
        '<p class="section-subline">What to expect and when to look for changes.</p>' +
      '</div>' +
      '<div class="card text-center" style="max-width:540px;margin:0 auto;padding:36px 24px;">' +
        '<h3 class="card-title mb-8">' + escHTML(p.title) + '</h3>' +
        '<p class="card-text mb-20">' + escHTML(p.text) + '</p>' +
        '<button type="button" class="btn btn-primary" data-scroll="setup">' + escHTML(p.cta) + '</button>' +
      '</div>' +
    '</div>';
    container.querySelector('[data-scroll]').addEventListener('click', function (e) {
      e.preventDefault();
      scrollToSection('setup');
    });
    return;
  }

  var cfg = Utils.getConcernConfig(profile.concern);
  var currentWk = Utils.getWeekNumber(profile.startDate);
  var weeksLeft = cfg.earlyWindowWeeks - currentWk;
  var etaText = (weeksLeft > 0)
    ? ('First changes usually from week ' + cfg.earlyWindowWeeks + '. About ' + weeksLeft + ' weeks to go.')
    : ('Past week ' + cfg.earlyWindowWeeks + '. Deeper changes build with continued routine.');

  var html = '<div class="container">' +
    '<div class="section-header">' +
      '<h2 class="section-title">Your timeline</h2>' +
      '<p class="section-subline">Week ' + currentWk + ' of ' + cfg.fullWindowWeeks + ' · ' + escHTML(cfg.label) + ' routine</p>' +
    '</div>' +

    '<div class="timeline-grid">' +
      // Left Column: Modern Timeline Placards with Duration & Status Tags
      '<div class="timeline-left-col">' +
        '<div class="timeline-placards-list timeline">';

  (cfg.milestones || []).forEach(function (ms) {
    var fromW = ms.fromWeek || 1;
    var toW = ms.toWeek || fromW;
    var durationLabel = (fromW === toW) ? ('Week ' + fromW) : ('Weeks ' + fromW + '–' + toW);

    var isPassed = (currentWk > toW);
    var isCurrent = (currentWk >= fromW && currentWk <= toW);
    var statusClass = isPassed ? 'completed' : (isCurrent ? 'current' : 'upcoming');
    var statusText = isPassed ? 'Completed' : (isCurrent ? 'Current' : 'Upcoming');

    var beneathText = ms.beneath || (ms.text ? ms.text.split('.')[0] + '.' : 'Cellular adjustments underway.');
    var expectText = ms.expect || (ms.text && ms.text.indexOf('.') !== -1 ? ms.text.substring(ms.text.indexOf('.') + 1).trim() : (ms.text || 'Normal pace of progress.'));

    html += '<div class="timeline-placard milestone' + (isPassed ? ' passed passed-placard' : '') + (isCurrent ? ' current current-placard' : '') + '">' +
      '<div class="placard-header">' +
        '<span class="placard-duration milestone-badge">' + durationLabel + '</span>' +
        '<span class="placard-status-badge milestone-badge-tag ' + statusClass + '">' +
          (isCurrent ? '<span class="status-pulse-dot"></span> ' : '') + statusText +
        '</span>' +
      '</div>' +
      (isCurrent ? '<div class="placard-you-are-here">You are here in your journey</div>' : '') +
      '<h3 class="placard-title milestone-title">' + escHTML(ms.title) + '</h3>' +
      '<div class="placard-bullets milestone-content">' +
        '<div class="placard-bullet">' +
          '<span class="placard-bullet-label">What is happening beneath:</span>' +
          '<span class="placard-bullet-text">' + escHTML(beneathText) + '</span>' +
        '</div>' +
        '<div class="placard-bullet">' +
          '<span class="placard-bullet-label">What to expect:</span>' +
          '<span class="placard-bullet-text">' + escHTML(expectText) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  });

  html += '</div></div>' +

      // Right Column: Forecast strip & expectation comparison
      '<div class="timeline-sticky-col">' +
        renderForecastStripHTML(cfg, profile) +
        '<p class="status-line mb-16" style="font-weight:600;">' + etaText + '</p>' +
        '<div class="card mb-16">' +
          '<h3 class="card-title" style="font-size:1.05rem;margin-bottom:8px;">Why pace matters</h3>' +
          '<p class="card-text" style="font-size:0.9rem;">' + escHTML(cfg.why) + '</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  container.innerHTML = html;
}

/* ---- Section 6: Mind Space (Breathing Pacer, Affirmation & Emotional Weather) ---- */
function renderMindSection(container) {
  var profile = Storage.load();
  var mind = CONTENT.mindSpace || {};
  var today = Utils.getToday();
  var ci = profile ? Utils.getCheckinForDate(profile, today) : null;
  var currentMood = (ci && ci.mood) || null;
  var affirmation = Utils.getDailyAffirmation(today);

  var html = '<div class="container">' +
    '<div class="section-header text-center">' +
      '<h2 class="section-title">' + escHTML(mind.title || 'Mind Space') + '</h2>' +
      '<p class="section-subline">' + escHTML(mind.subline) + '</p>' +
    '</div>' +

    '<div class="mind-space-grid">' +
      // 1. 60-Second Calm Breathing Pacer
      '<div class="breathing-card">' +
        '<div class="badge badge-blue mb-8">Nervous system reset</div>' +
        '<h3 class="card-title" style="font-size:1.2rem;margin-bottom:4px;">' + escHTML(mind.breathing.title) + '</h3>' +
        '<p class="card-text mb-16" style="font-size:0.88rem;color:var(--text-secondary);">' + escHTML(mind.breathing.hint) + '</p>' +

        '<div class="breathing-circle-wrapper">' +
          '<div class="breathing-circle-track"></div>' +
          '<div class="breathing-circle-core" id="breathing-core">' +
            '<span id="breathing-label">Ready</span>' +
          '</div>' +
        '</div>' +

        '<button type="button" class="btn btn-primary" id="btn-toggle-breathing">' + escHTML(mind.breathing.btnStart) + '</button>' +
      '</div>' +

      // 2. Daily Grounding Affirmation Card
      '<div class="affirmation-card">' +
        '<div>' +
          '<div class="badge badge-blue mb-8">Daily grounding reflection</div>' +
          '<div class="affirmation-quote-mark">&ldquo;</div>' +
          '<div class="affirmation-text">' + escHTML(affirmation) + '</div>' +
        '</div>' +
        '<p class="muted" style="font-size:0.82rem;margin-bottom:0;">' +
          'Mental patience is essential. Cells rebuild during quiet rest.' +
        '</p>' +
      '</div>' +
    '</div>' +

    // 3. Emotional Weather Check-in
    '<div class="weather-selector-card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div>' +
          '<h3 class="card-title" style="font-size:1.1rem;margin-bottom:4px;">' + escHTML(mind.weather.title) + '</h3>' +
          '<p class="card-text" style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:0;">' + escHTML(mind.weather.subline) + '</p>' +
        '</div>' +
        '<span class="badge badge-blue" id="mood-status-badge">' + (currentMood ? 'Logged: ' + escHTML(currentMood) : 'Not logged today') + '</span>' +
      '</div>' +
      '<div class="mood-selector-grid">';

  (mind.weather.moods || []).forEach(function (m) {
    var isSel = (currentMood === m.label);
    html += '<button type="button" class="mood-chip-btn' + (isSel ? ' selected focus-ring-active' : '') + '" data-mood="' + escHTML(m.label) + '">' +
      '<span>' + escHTML(m.label) + '</span>' +
      '<span style="font-size:0.75rem;font-weight:400;color:var(--text-secondary);">' + escHTML(m.note) + '</span>' +
    '</button>';
  });

  html += '</div></div>' +
  '</div>';

  container.innerHTML = html;

  // Breathing pacer controller
  var isBreathingActive = false;
  var breathTimer = null;
  var coreEl = document.getElementById('breathing-core');
  var labelEl = document.getElementById('breathing-label');
  var btnBreathing = document.getElementById('btn-toggle-breathing');

  function runBreathCycle() {
    if (!isBreathingActive) return;
    labelEl.textContent = mind.breathing.inhale;
    coreEl.className = 'breathing-circle-core inhaling';
    
    breathTimer = setTimeout(function () {
      if (!isBreathingActive) return;
      labelEl.textContent = mind.breathing.hold;
      coreEl.className = 'breathing-circle-core holding';

      breathTimer = setTimeout(function () {
        if (!isBreathingActive) return;
        labelEl.textContent = mind.breathing.exhale;
        coreEl.className = 'breathing-circle-core exhaling';

        breathTimer = setTimeout(function () {
          if (isBreathingActive) runBreathCycle();
        }, 4000);
      }, 4000);
    }, 4000);
  }

  if (btnBreathing) {
    btnBreathing.addEventListener('click', function () {
      isBreathingActive = !isBreathingActive;
      if (isBreathingActive) {
        btnBreathing.textContent = mind.breathing.btnPause;
        runBreathCycle();
      } else {
        clearTimeout(breathTimer);
        btnBreathing.textContent = mind.breathing.btnStart;
        coreEl.className = 'breathing-circle-core';
        labelEl.textContent = 'Paused';
      }
    });
  }

  // Emotional weather mood chip handler
  container.querySelectorAll('[data-mood]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var moodVal = this.getAttribute('data-mood');
      if (profile) {
        var c = Utils.getCheckinForDate(profile, today);
        if (!c) {
          c = { date: today, done: false, rest: false, mood: moodVal, ritualDone: [] };
          profile.checkins.push(c);
        } else {
          c.mood = moodVal;
        }
        Storage.save(profile);
      }
      container.querySelectorAll('[data-mood]').forEach(function (b) { b.classList.remove('selected', 'focus-ring-active'); });
      this.classList.add('selected', 'focus-ring-active');
      var badge = document.getElementById('mood-status-badge');
      if (badge) badge.textContent = 'Logged: ' + moodVal;
      UI.toast(mind.weather.loggedNotice);
    });
  });
}

/* ---- Section 7: Tangible Micro-markers (Results) ---- */
function renderResultsSection(container) {
  var profile = Storage.load();

  if (!profile) {
    var p = (CONTENT.landing && CONTENT.landing.placeholder) || { title: "Set up your routine first", text: "Complete your quick setup to unlock this section.", cta: "Set up my plan" };
    container.innerHTML = '<div class="container">' +
      '<div class="section-header text-center">' +
        '<h2 class="section-title">Your results</h2>' +
        '<p class="section-subline">Track your watched marker and compare against the typical range.</p>' +
      '</div>' +
      '<div class="card text-center" style="max-width:540px;margin:0 auto;padding:36px 24px;">' +
        '<h3 class="card-title mb-8">' + escHTML(p.title) + '</h3>' +
        '<p class="card-text mb-20">' + escHTML(p.text) + '</p>' +
        '<button type="button" class="btn btn-primary" data-scroll="setup">' + escHTML(p.cta) + '</button>' +
      '</div>' +
    '</div>';
    container.querySelector('[data-scroll]').addEventListener('click', function (e) {
      e.preventDefault();
      scrollToSection('setup');
    });
    return;
  }

  var verdict = Utils.getVerdict(profile);
  var currentWk = Utils.getWeekNumber(profile.startDate);
  var markersList = (CONTENT.microMarkers && CONTENT.microMarkers[profile.concern]) || [];

  var html = '<div class="container">' +
    '<div class="section-header">' +
      '<h2 class="section-title">Your results</h2>' +
      '<p class="section-subline">Tangible physical micro-markers · Week ' + currentWk + '</p>' +
    '</div>' +

    '<div class="results-grid">' +
      // Left Column: Biology Verdict Card
      '<div class="results-left-col">' +
        '<div class="card ' + escHTML(verdict.cssClass) + ' mb-20" style="padding:28px 24px;">' +
          '<div class="badge mb-8" style="background:#fff;font-weight:700;">' + escHTML(verdict.label) + '</div>' +
          '<h3 class="card-title" style="font-size:1.35rem;margin-bottom:8px;">' + escHTML(verdict.label) + '</h3>' +
          '<p class="card-text mb-16" style="font-size:1.02rem;">' + escHTML(verdict.message) + '</p>' +
          '<ul style="margin:0;padding-left:18px;font-size:0.88rem;color:var(--text-secondary);">' +
            verdict.reasons.map(function (r) { return '<li>' + escHTML(r) + '</li>'; }).join('') +
          '</ul>' +
        '</div>' +

        '<button type="button" class="btn btn-primary" id="btn-log-micromarkers">' +
          'Record weekly micro-marker check \u2192' +
        '</button>' +
      '</div>' +

      // Right Column: Micro-marker Guide
      '<div class="results-right-col">' +
        '<div class="card">' +
          '<h3 class="card-title" style="font-size:1.1rem;margin-bottom:8px;">Observable signs for ' + escHTML(profile.concern) + '</h3>' +
          '<div style="display:flex;flex-direction:column;gap:14px;margin-top:12px;">';

  markersList.forEach(function (m) {
    html += '<div class="micro-marker-card">' +
      '<div style="font-weight:700;color:var(--deep-navy);margin-bottom:4px;">' + escHTML(m.name) + '</div>' +
      '<p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:8px;">' + escHTML(m.hint) + '</p>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        m.options.map(function (opt) {
          return '<span class="tag-chip morning" style="font-size:0.75rem;">' + escHTML(opt.label) + '</span>';
        }).join('') +
      '</div>' +
    '</div>';
  });

  html += '</div></div></div>' +
    '</div>' +
  '</div>';

  container.innerHTML = html;

  var logMarkerBtn = document.getElementById('btn-log-micromarkers');
  if (logMarkerBtn) {
    logMarkerBtn.addEventListener('click', function () {
      openWeeklyReviewDrawer();
    });
  }
}

/* ---- Section 8: Next Step & Bottle Burn-Rate ---- */
function renderNextStepSection(container) {
  var profile = Storage.load();

  if (!profile) {
    var p = (CONTENT.landing && CONTENT.landing.placeholder) || { title: "Set up your routine first", text: "Complete your quick setup to unlock this section.", cta: "Set up my plan" };
    container.innerHTML = '<div class="container">' +
      '<div class="section-header text-center">' +
        '<h2 class="section-title">What next?</h2>' +
        '<p class="section-subline">Clear next steps based on your progress and timeline.</p>' +
      '</div>' +
      '<div class="card text-center" style="max-width:540px;margin:0 auto;padding:36px 24px;">' +
        '<h3 class="card-title mb-8">' + escHTML(p.title) + '</h3>' +
        '<p class="card-text mb-20">' + escHTML(p.text) + '</p>' +
        '<button type="button" class="btn btn-primary" data-scroll="setup">' + escHTML(p.cta) + '</button>' +
      '</div>' +
    '</div>';
    container.querySelector('[data-scroll]').addEventListener('click', function (e) {
      e.preventDefault();
      scrollToSection('setup');
    });
    return;
  }

  var verdict = Utils.getVerdict(profile);
  var primaryProduct = (profile.products && profile.products[0]) || { name: 'Main formula', sizeDays: 30 };
  var burnRate = Utils.getBurnRate(primaryProduct, profile.checkins, profile.startDate);

  var html = '<div class="container">' +
    '<div class="section-header">' +
      '<h2 class="section-title">What next?</h2>' +
      '<p class="section-subline">Guidance and pack pace for your routine.</p>' +
    '</div>' +

    // Bottle Burn-Rate Meter Card
    (burnRate ? (
      '<div class="card burn-rate-card mb-24">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<div>' +
            '<h3 class="card-title" style="margin-bottom:2px;">' + escHTML(primaryProduct.name) + ' pace meter</h3>' +
            '<p class="card-text" style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0;">' +
              'Used ' + burnRate.usedDoses + ' of ' + burnRate.totalDoses + ' doses (' + burnRate.remainingDoses + ' remaining)' +
            '</p>' +
          '</div>' +
          (burnRate.isLow ? '<span class="badge" style="background:#FEF2F2;color:#991B1B;font-weight:700;">Reorder soon</span>' : '<span class="badge badge-blue">Stock healthy</span>') +
        '</div>' +
        '<div class="burn-rate-meter">' +
          '<div class="burn-rate-fill" style="width:' + burnRate.pctUsed + '%;"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-secondary);margin-top:8px;">' +
          '<span>Estimated empty: ' + Utils.formatDate(burnRate.estimatedFinish) + '</span>' +
          '<span>Reorder date: ' + Utils.formatDate(burnRate.reorderDate) + ' (5 days prior)</span>' +
        '</div>' +
      '</div>'
    ) : '') +

    '<div class="outcomes-grid mb-32">' +
      '<div class="card' + (verdict.type === 'onTrack' || verdict.type === 'tooEarly' ? ' active-outcome' : '') + '" style="border-top:4px solid var(--verdict-ontrack-border);">' +
        '<h3 class="card-title" style="color:var(--verdict-ontrack-text);">1. Keep going</h3>' +
        '<p class="card-text" style="font-size:0.9rem;">You are in the biological adjustment window. Maintain steady daily application.</p>' +
      '</div>' +

      '<div class="card' + (verdict.type === 'consistency' ? ' active-outcome' : '') + '" style="border-top:4px solid var(--verdict-consistency-border);">' +
        '<h3 class="card-title" style="color:var(--verdict-consistency-text);">2. Adjust routine</h3>' +
        '<p class="card-text" style="font-size:0.9rem;">Pair with morning or bedtime routines to keep your habit cadence steady.</p>' +
      '</div>' +

      '<div class="card' + (verdict.type === 'closer' ? ' active-outcome' : '') + '" style="border-top:4px solid var(--verdict-closer-border);">' +
        '<h3 class="card-title" style="color:var(--verdict-closer-text);">3. Closer look</h3>' +
        '<p class="card-text" style="font-size:0.9rem;">If no changes appear after the full window, consider adjusting products.</p>' +
      '</div>' +
    '</div>' +

    '<div class="card text-center" style="padding:28px 20px;">' +
      '<h3 class="card-title mb-6">Feeling stuck with your routine?</h3>' +
      '<p class="card-text mb-16">Doubt, slow progress, or missed days? Explore kind re-engagement options.</p>' +
      '<button type="button" class="btn btn-secondary" id="btn-open-support">Feeling stuck? Explore options</button>' +
    '</div>' +
  '</div>';

  container.innerHTML = html;

  var suppBtn = document.getElementById('btn-open-support');
  if (suppBtn) {
    suppBtn.addEventListener('click', function () {
      openSupportDrawer();
    });
  }
}

/* ---- Section 9: Closing Section ---- */
function renderClosingSection(container) {
  var c = CONTENT.closing || { title: "Small steps, every day", text: "Real change takes time. Your body is doing the quiet work." };
  var html = '<div class="container">' +
    '<div class="closing-card">' +
      '<h2 style="font-size:1.45rem;font-weight:700;color:var(--deep-navy);margin-bottom:8px;">' + escHTML(c.title) + '</h2>' +
      '<p style="font-size:0.98rem;color:var(--text-secondary);">' + escHTML(c.text) + '</p>' +
    '</div>' +
  '</div>';
  container.innerHTML = html;
}

/* ---- Site Footer ---- */
function renderSiteFooter() {
  var footEl = document.getElementById('site-footer');
  if (!footEl) return;
  var f = CONTENT.footer || { line: "Built for quiet daily consistency.", privacy: "Private. Saved only on your device." };
  footEl.innerHTML = '<div class="container">' +
    '<p style="margin-bottom:4px;">' + escHTML(f.line) + '</p>' +
    '<p class="muted" style="font-size:0.8rem;">' + escHTML(f.privacy) + '</p>' +
  '</div>';
}

/* ==================== DRAWERS (OFFLINE CHATBOT & MENU RESET) ==================== */

// 1. Offline Reassurance Chatbot Drawer
function openChatbotDrawer(initialTopicId) {
  var chatData = CONTENT.chatbot || {};
  var categories = chatData.categories || [
    {
      id: 'bio',
      label: 'Biological Concerns',
      questions: (chatData.topics || []).slice(0, 3)
    },
    {
      id: 'habits',
      label: 'Habits & Motivation Drops',
      questions: (chatData.topics || []).slice(1, 4)
    },
    {
      id: 'hacks',
      label: 'Product & Routine Hacks',
      questions: (chatData.topics || []).slice(2, 5)
    }
  ];

  var currentCatId = 'bio';
  if (initialTopicId) {
    categories.forEach(function (cat) {
      if ((cat.questions || []).some(function (q) { return q.id === initialTopicId; })) {
        currentCatId = cat.id;
      }
    });
  }

  function renderCategoryOptionsHTML(catId) {
    var cat = categories.find(function (c) { return c.id === catId; }) || categories[0];
    var html = '<div class="chat-batch-header">' +
      '<span class="chat-batch-title">' + escHTML(cat.label) + '</span>' +
      '<span class="chat-batch-badge">3 targeted questions</span>' +
    '</div>' +
    '<div class="chat-quick-chips">';

    (cat.questions || []).forEach(function (t) {
      html += '<button type="button" class="chat-chip-btn" data-topic-id="' + t.id + '">' +
        '<div style="font-weight:700;color:var(--text-primary);font-size:0.88rem;margin-bottom:3px;">' + escHTML(t.shortTitle || t.chip || t.question) + '</div>' +
        '<div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.35;">' + escHTML(t.question) + '</div>' +
      '</button>';
    });

    html += '</div>';
    return html;
  }

  var html = '<div class="chatbot-header-card">' +
    '<div class="chatbot-hero-avatar">' + (ICONS.guideHero || ICONS.guideAvatar) + '</div>' +
    '<div class="chatbot-hero-meta">' +
      '<h4 class="chatbot-hero-title">' + escHTML(CONTENT.guide.avatarTitle || 'The Bodywise Guide') + '</h4>' +
      '<span class="chatbot-hero-badge"><span class="chatbot-status-pulse"></span> Instant reassurance &middot; Offline</span>' +
    '</div>' +
  '</div>' +

  // Category Switcher Tabs
  '<div class="chat-category-tabs">' +
    categories.map(function (c) {
      return '<button type="button" class="chat-tab-btn' + (c.id === currentCatId ? ' active' : '') + '" data-cat-id="' + c.id + '">' +
        escHTML(c.label) +
      '</button>';
    }).join('') +
  '</div>' +

  '<div class="chatbot-conversation" id="chat-messages">' +
    '<div class="chat-msg guide">' +
      '<div class="guide-avatar-circle" style="width:34px;height:34px;">' + ICONS.guideAvatar + '</div>' +
      '<div class="chat-bubble">' + (chatData.welcome ? escHTML(chatData.welcome).split(String.fromCharCode(10)).join('<br>') : 'Wellness takes time, and doubts are normal.') + '</div>' +
    '</div>' +
  '</div>' +

  '<div id="chat-options-area">' +
    renderCategoryOptionsHTML(currentCatId) +
  '</div>';

  Drawer.open(chatData.title || 'Ask the Guide', html, function (panelEl) {
    function bindCategoryTabs() {
      panelEl.querySelectorAll('[data-cat-id]').forEach(function (tab) {
        tab.addEventListener('click', function () {
          currentCatId = this.getAttribute('data-cat-id');
          panelEl.querySelectorAll('[data-cat-id]').forEach(function (t) { t.classList.remove('active'); });
          this.classList.add('active');

          var optsEl = panelEl.querySelector('#chat-options-area');
          if (optsEl) {
            optsEl.innerHTML = renderCategoryOptionsHTML(currentCatId);
            bindQuestionChips();
          }
        });
      });
    }

    function bindQuestionChips() {
      panelEl.querySelectorAll('[data-topic-id]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tid = this.getAttribute('data-topic-id');
          showTopicAnswer(tid);
        });
      });
    }

    function showTopicAnswer(topicId) {
      var topic = (chatData.topics || []).find(function (t) { return t.id === topicId; });
      if (!topic) {
        categories.forEach(function (cat) {
          (cat.questions || []).forEach(function (q) {
            if (q.id === topicId) topic = q;
          });
        });
      }
      if (!topic) return;

      var msgsEl = panelEl.querySelector('#chat-messages');
      var optsEl = panelEl.querySelector('#chat-options-area');

      // Append User Question Bubble
      var userMsg = document.createElement('div');
      userMsg.className = 'chat-msg user';
      userMsg.innerHTML = '<div class="chat-bubble">' + escHTML(topic.question) + '</div>';
      msgsEl.appendChild(userMsg);
      msgsEl.scrollTop = msgsEl.scrollHeight;

      // Append Guide 3-Part Answer
      setTimeout(function () {
        var guideMsg = document.createElement('div');
        guideMsg.className = 'chat-msg guide fade-in-entry';

        var reassHtml = topic.reassurance ? escHTML(topic.reassurance).split(String.fromCharCode(10)).join('<br>') : escHTML(topic.answer).split(String.fromCharCode(10)).join('<br>');
        var scienceHtml = topic.science ? escHTML(topic.science).split(String.fromCharCode(10)).join('<br>') : 'Active compounds require 28 to 90 days to harmonize with normal cellular renewal.';
        var actionHtml = topic.action ? escHTML(topic.action).split(String.fromCharCode(10)).join('<br>') : 'Stay consistent with your daily steps and observe subtle micro-markers.';

        guideMsg.innerHTML = '<div class="guide-avatar-circle" style="width:34px;height:34px;flex-shrink:0;">' + ICONS.guideAvatar + '</div>' +
          '<div class="chat-structured-answer" style="flex:1;">' +
            '<div class="answer-card answer-reassurance">' +
              '<div class="answer-card-header">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
                '<span>Direct Reassurance</span>' +
              '</div>' +
              '<p class="answer-card-text">' + reassHtml + '</p>' +
            '</div>' +

            '<div class="answer-card answer-science">' +
              '<div class="answer-card-header">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B5E9E" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
                '<span>The Science (Biology)</span>' +
              '</div>' +
              '<p class="answer-card-text">' + scienceHtml + '</p>' +
            '</div>' +

            '<div class="answer-card answer-action">' +
              '<div class="answer-card-header">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' +
                '<span>Your Action Today</span>' +
              '</div>' +
              '<p class="answer-card-text">' + actionHtml + '</p>' +
            '</div>' +
          '</div>';

        msgsEl.appendChild(guideMsg);
        msgsEl.scrollTop = msgsEl.scrollHeight;

        // Render follow up options
        optsEl.innerHTML = '<div class="chat-followups" style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">' +
          '<button type="button" class="btn btn-primary btn-block" id="btn-chat-more">' + escHTML(chatData.anotherQuestion || 'Ask another question') + '</button>' +
          '<div style="display:flex;gap:12px;justify-content:center;font-size:0.85rem;margin-top:4px;">' +
            '<a href="#today" class="chat-shortcut-link" data-close-drawer="true" style="color:var(--primary-blue);font-weight:600;text-decoration:none;">Daily ritual</a>' +
            '<span style="color:var(--border-subtle);">&middot;</span>' +
            '<a href="#mind" class="chat-shortcut-link" data-close-drawer="true" style="color:var(--primary-blue);font-weight:600;text-decoration:none;">Mind Space</a>' +
            '<span style="color:var(--border-subtle);">&middot;</span>' +
            '<a href="#timeline" class="chat-shortcut-link" data-close-drawer="true" style="color:var(--primary-blue);font-weight:600;text-decoration:none;">Timeline</a>' +
          '</div>' +
        '</div>';

        var moreBtn = optsEl.querySelector('#btn-chat-more');
        if (moreBtn) {
          moreBtn.addEventListener('click', function () {
            optsEl.innerHTML = renderCategoryOptionsHTML(currentCatId);
            bindQuestionChips();
          });
        }

        optsEl.querySelectorAll('[data-close-drawer="true"]').forEach(function (link) {
          link.addEventListener('click', function (e) {
            e.preventDefault();
            var target = link.getAttribute('href').replace(/^#/, '');
            Drawer.close();
            scrollToSection(target);
          });
        });
      }, 160);
    }

    bindCategoryTabs();
    bindQuestionChips();

    if (initialTopicId) {
      showTopicAnswer(initialTopicId);
    }
  });
}

// 2. Settings & Menu Drawer with In-Drawer Reset Confirmation
function openSettingsDrawer() {
  var html = '<div class="card mb-16">' +
    '<h3 class="card-title" style="font-size:1rem;margin-bottom:8px;">Brand Intro</h3>' +
    '<p class="card-text mb-12" style="font-size:0.88rem;">Watch the 6-second lilac handwritten logo story animation.</p>' +
    '<button type="button" class="btn btn-secondary btn-sm" id="btn-replay-intro">Replay Brand Intro</button>' +
  '</div>' +

  '<div class="card mb-16">' +
    '<h3 class="card-title" style="font-size:1rem;margin-bottom:8px;">Data & Backup</h3>' +
    '<p class="card-text mb-12" style="font-size:0.88rem;">All your data is saved privately in your browser.</p>' +
    '<div style="display:flex;gap:10px;">' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btn-export-json">Export data</button>' +
    '</div>' +
  '</div>' +

  '<div class="card mb-16" style="border:1.5px solid #FCA5A5;background:#FFF5F5;">' +
    '<h3 class="card-title" style="font-size:1rem;color:#991B1B;margin-bottom:6px;">Start Fresh / Reset</h3>' +
    '<p class="card-text mb-12" style="font-size:0.86rem;color:#7F1D1D;">' +
      'Want to test as a first-time visitor or clear your current routine?' +
    '</p>' +
    '<div id="reset-action-area">' +
      '<button type="button" class="btn btn-sm" id="btn-trigger-reset" style="background:#DC2626;color:#FFFFFF;border:none;">Reset all data & start fresh</button>' +
    '</div>' +
  '</div>' +

  '<div class="card">' +
    '<h3 class="card-title" style="font-size:1rem;margin-bottom:8px;">About Bodywise Companion</h3>' +
    '<p class="card-text" style="font-size:0.88rem;margin-bottom:8px;">Built for quiet daily consistency and objective micro-marker tracking.</p>' +
    '<p class="muted" style="font-size:0.8rem;">Version 3.2.0 · Private and offline capable.</p>' +
  '</div>';

  Drawer.open('Settings & Options', html, function (panelEl) {
    var replayBtn = panelEl.querySelector('#btn-replay-intro');
    if (replayBtn) {
      replayBtn.addEventListener('click', function () {
        Drawer.close();
        if (typeof window.replayIntro === 'function') {
          window.replayIntro();
        }
      });
    }

    var exportBtn = panelEl.querySelector('#btn-export-json');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(Storage.exportJSON());
        var dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', 'bodywise-companion-backup.json');
        dlAnchor.click();
      });
    }

    var triggerResetBtn = panelEl.querySelector('#btn-trigger-reset');
    var resetArea = panelEl.querySelector('#reset-action-area');
    if (triggerResetBtn && resetArea) {
      triggerResetBtn.addEventListener('click', function () {
        resetArea.innerHTML = '<div style="background:#FFFFFF;border:1px solid #EF4444;border-radius:8px;padding:12px;margin-top:6px;">' +
          '<p style="font-size:0.84rem;font-weight:600;color:#991B1B;margin-bottom:10px;">Clear saved routine and test as a first-time visitor?</p>' +
          '<div style="display:flex;gap:8px;">' +
            '<button type="button" class="btn btn-sm" id="btn-confirm-reset" style="background:#DC2626;color:#FFFFFF;border:none;">Yes, clear all data</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-reset">Cancel</button>' +
          '</div>' +
        '</div>';

        panelEl.querySelector('#btn-cancel-reset').addEventListener('click', function () {
          openSettingsDrawer();
        });

        panelEl.querySelector('#btn-confirm-reset').addEventListener('click', function () {
          Storage.reset();
          clearDraft();
          Drawer.close();
          window.location.hash = '';
          window.location.reload();
        });
      });
    }
  });
}

function openAboutDrawer() {
  openSettingsDrawer();
}

/* ---- Weekly Review Drawer ---- */
function openWeeklyReviewDrawer() {
  var profile = Storage.load();
  if (!profile) return;
  var currentWk = Utils.getWeekNumber(profile.startDate);
  var markersList = (CONTENT.microMarkers && CONTENT.microMarkers[profile.concern]) || [];

  var html = '<form id="weekly-review-form">' +
    '<p class="card-text mb-16" style="font-size:0.92rem;">' +
      'Check tangible markers for Week ' + currentWk + '. These help your biological verdict.' +
    '</p>';

  markersList.forEach(function (m, idx) {
    html += '<div class="field mb-16">' +
      '<label style="font-weight:700;color:var(--deep-navy);">' + escHTML(m.name) + '</label>' +
      '<p class="muted mb-8" style="font-size:0.82rem;">' + escHTML(m.hint) + '</p>' +
      '<div class="chip-group" data-marker-field="' + m.id + '">';
    m.options.forEach(function (opt, oIdx) {
      html += '<button type="button" class="chip' + (oIdx === 1 ? ' selected' : '') + '" data-score="' + opt.score + '">' +
        escHTML(opt.label) +
      '</button>';
    });
    html += '</div></div>';
  });

  html += '<button type="submit" class="btn btn-primary btn-full mt-16">Save weekly micro-marker check</button>' +
  '</form>';

  Drawer.open('Weekly review · Week ' + currentWk, html, function (panelEl) {
    panelEl.querySelectorAll('.chip-group').forEach(function (cg) {
      cg.querySelectorAll('.chip').forEach(function (c) {
        c.addEventListener('click', function () {
          cg.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('selected'); });
          c.classList.add('selected');
        });
      });
    });

    var form = panelEl.querySelector('#weekly-review-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        profile.weeklyRatings = profile.weeklyRatings || [];
        profile.weeklyRatings.push({
          date: Utils.getToday(),
          week: currentWk,
          primary: 4,
          secondary: 4
        });
        Storage.save(profile);
        Drawer.close();
        renderResultsSection(document.getElementById('results'));
        renderTimelineSection(document.getElementById('timeline'));
        UI.toast('Weekly review saved. Verdict updated.');
      });
    }
  });
}

/* ---- Desktop Rail ---- */
function renderDesktopRail() {
  var profile = Storage.load();
  var railEl = document.getElementById('desktop-rail');
  if (!railEl) return;
  if (!profile) {
    railEl.style.display = 'none';
    document.body.classList.remove('has-profile');
    return;
  }
  document.body.classList.add('has-profile');
  railEl.style.display = 'block';

  var isCiDone = Utils.isCheckedInToday(profile);
  var isRevDue = Utils.isWeeklyRatingDue(profile);

  var steps = [
    { id: 'setup', label: 'Bathroom shelf', done: true },
    { id: 'today', label: 'Daily ritual', done: isCiDone },
    { id: 'timeline', label: 'Timeline', done: true },
    { id: 'mind', label: 'Mind Space', done: false },
    { id: 'results', label: 'Results', done: !isRevDue },
    { id: 'decide', label: 'Next step', done: false }
  ];

  var html = '<div class="rail-stepper">' +
    '<div class="rail-track-line"></div>' +
    '<ul class="rail-stepper-list rail-list">';

  steps.forEach(function (s) {
    var nodeClass = s.done ? 'completed' : 'upcoming';
    html += '<li class="rail-step-item">' +
      '<button type="button" class="rail-step-btn rail-btn' + (s.done ? ' done' : '') + '" data-scroll="' + s.id + '">' +
        '<span class="rail-step-node rail-dot ' + nodeClass + '">' +
          (s.done ? ICONS.check : '<span class="node-inner-dot"></span>') +
        '</span>' +
        '<span class="rail-step-label rail-label">' + escHTML(s.label) + '</span>' +
      '</button>' +
    '</li>';
  });
  html += '</ul></div>';

  railEl.innerHTML = html;

  railEl.querySelectorAll('[data-scroll]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var target = el.getAttribute('data-scroll');
      scrollToSection(target);
    });
  });
}

/* ==================== ROOT RENDERING ==================== */
function renderAllSections() {
  UI.renderHeader();

  var contentEl = document.getElementById('app-content');
  if (!contentEl) return;

  var currentStructure = contentEl.querySelector('#companion');
  if (!currentStructure) {
    var structureHtml = '<div id="desktop-rail" aria-label="Quick jump rail"></div>' +
      '<div class="sections-wrapper">';
    SECTIONS.forEach(function (sec) {
      structureHtml += '<section id="' + sec.id + '" class="app-section section-' + sec.id + '"></section>';
    });
    structureHtml += '<footer id="site-footer" class="site-footer"></footer>';
    structureHtml += '</div>';

    structureHtml += '<div id="app-drawer" class="drawer-overlay" aria-hidden="true">' +
      '<div id="drawer-backdrop" class="drawer-backdrop"></div>' +
      '<div id="drawer-panel" class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">' +
        '<div class="drawer-header">' +
          '<h2 class="drawer-title" id="drawer-title"></h2>' +
          '<button type="button" class="drawer-close" id="drawer-close" aria-label="Close dialog">&times;</button>' +
        '</div>' +
        '<div class="drawer-body" id="drawer-body"></div>' +
      '</div>' +
    '</div>';

    structureHtml += '<div id="toast" class="toast" role="status" aria-live="polite"></div>';

    contentEl.innerHTML = structureHtml;
  }

  // Render each section
  SECTIONS.forEach(function (sec) {
    var secEl = document.getElementById(sec.id);
    if (secEl && typeof sec.render === 'function') {
      sec.render(secEl);
    }
  });

  renderDesktopRail();
  renderSiteFooter();

  // Tab bar click binding
  var tabBar = document.getElementById('tab-bar');
  if (tabBar) {
    tabBar.querySelectorAll('[data-scroll]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var target = el.getAttribute('data-scroll');
        scrollToSection(target);
      });
    });
  }

  // Floating Chatbot button
  var floatingGuideBtn = document.getElementById('guide-floating-btn');
  if (floatingGuideBtn) {
    floatingGuideBtn.addEventListener('click', function () {
      openChatbotDrawer();
    });
  }

  // Drawer close bindings
  var drawerClose = document.getElementById('drawer-close');
  var drawerBackdrop = document.getElementById('drawer-backdrop');
  if (drawerClose) drawerClose.addEventListener('click', function () { Drawer.close(); });
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', function () { Drawer.close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') Drawer.close();
  });

  initScrollspy();

  var initialHash = (window.location.hash || '').replace(/^#[/]*/, '');
  if (initialHash && document.getElementById(initialHash)) {
    setTimeout(function () {
      scrollToSection(initialHash);
    }, 100);
  }
}

/* ==================== BRAND INTRO ANIMATION CONTROLLER ==================== */
function initIntroAnimation() {
  var introEl = document.getElementById('intro-stage');
  if (!introEl) return;

  var skipBtn = document.getElementById('intro-skip-btn');
  var finalFigure = document.getElementById('intro-final-figure');
  var wordmark = document.getElementById('intro-wordmark');
  var canvas = document.getElementById('intro-canvas');
  var animTimer1 = null;
  var animTimer2 = null;
  var animTimer3 = null;

  function clearTimers() {
    if (animTimer1) clearTimeout(animTimer1);
    if (animTimer2) clearTimeout(animTimer2);
    if (animTimer3) clearTimeout(animTimer3);
  }

  function dismissIntro(skipAnimation) {
    clearTimers();
    try { sessionStorage.setItem('bwc_intro_seen', 'true'); } catch (e) {}
    if (skipAnimation) {
      introEl.classList.add('dismissed');
      introEl.setAttribute('aria-hidden', 'true');
      return;
    }
    if (canvas) canvas.classList.add('docking');
    setTimeout(function () {
      introEl.classList.add('dismissed');
      introEl.setAttribute('aria-hidden', 'true');
      setTimeout(function () {
        if (canvas) canvas.classList.remove('docking');
      }, 900);
    }, 600);
  }

  window.replayIntro = function () {
    clearTimers();
    try { sessionStorage.removeItem('bwc_intro_seen'); } catch (e) {}
    introEl.classList.remove('dismissed');
    introEl.setAttribute('aria-hidden', 'false');
    if (finalFigure) finalFigure.classList.remove('revealed');
    if (wordmark) wordmark.classList.remove('revealed');
    if (canvas) canvas.classList.remove('docking');
    runSequence();
  };

  if (skipBtn) {
    skipBtn.addEventListener('click', function () {
      dismissIntro(true);
    });
  }

  // Brand logo in header can replay intro
  var brandLogo = document.getElementById('brand-logo');
  if (brandLogo) {
    brandLogo.addEventListener('click', function (e) {
      if (e.shiftKey) {
        e.preventDefault();
        window.replayIntro();
      }
    });
  }

  // Check prefers-reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    dismissIntro(true);
    return;
  }

  // Check if intro has already played in this session
  var alreadySeen = false;
  try { alreadySeen = (sessionStorage.getItem('bwc_intro_seen') === 'true'); } catch (e) {}
  if (alreadySeen) {
    dismissIntro(true);
    return;
  }

  function runSequence() {
    // 0ms: Soft lilac backdrop visible, stroke B is drawing
    // 1200ms: Plus draws
    // 1600ms: W draws
    // 3600ms: B and W glide together to center; curves unfurl, arms sweep out, head pops in -> final figure revealed!
    animTimer1 = setTimeout(function () {
      if (finalFigure) finalFigure.classList.add('revealed');
    }, 3600);

    // 4800ms: Finished logo holds for a beat with a gentle settle, and the "Bodywise" wordmark fades in
    animTimer2 = setTimeout(function () {
      if (wordmark) wordmark.classList.add('revealed');
    }, 4800);

    // 6200ms: Logo shrinks and glides into top-left of nav bar while backdrop lifts away
    animTimer3 = setTimeout(function () {
      dismissIntro(false);
    }, 6200);
  }

  runSequence();
}

/* ==================== INIT ==================== */
function init() {
  renderAllSections();
  initIntroAnimation();

  var currentRenderedDate = Utils.getToday();
  function checkMidnightRollover() {
    var nowToday = Utils.getToday();
    if (nowToday !== currentRenderedDate) {
      currentRenderedDate = nowToday;
      var prof = Storage.load();
      if (prof) {
        var dayN = Utils.daysBetween(prof.startDate, currentRenderedDate) + 1;
        UI.toast('New day. Day ' + dayN + '.');
        renderCheckinSection(document.getElementById('today'));
        renderTimelineSection(document.getElementById('timeline'));
        renderMindSection(document.getElementById('mind'));
        renderDesktopRail();
      }
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') checkMidnightRollover();
  });
  window.addEventListener('focus', checkMidnightRollover);
  setInterval(checkMidnightRollover, 60000);

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.deferredPrompt = e;
  });

  if ('serviceWorker' in navigator && location.protocol && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  }
}

window.addEventListener('DOMContentLoaded', init);
