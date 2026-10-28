/* ============================================================
   app.js — Progress Companion
   Full guided story flow: Onboarding, Journey Path, Timeline,
   Check-in, Results with Observable Markers, Decision Aid.
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

/* ==================== ROUTER ==================== */
var Router = {
  routes: {},

  register: function (hash, fn) { this.routes[hash] = fn; },

  navigate: function (hash) { window.location.hash = hash; },

  resolve: function () {
    var hash = window.location.hash || '#/';
    if (this.routes[hash]) {
      this.routes[hash]();
    } else {
      window.location.hash = '#/';
    }
  },

  start: function () {
    var self = this;
    window.addEventListener('hashchange', function () { self.resolve(); });
    self.resolve();
  }
};

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

  renderHeader: function (opts) {
    opts = opts || {};
    var h = this.$header();
    var html = '';
    if (opts.back) {
      html += '<a href="' + opts.back + '" class="header-back" aria-label="Go back">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a>';
    }
    html += '<span class="header-title">' + (opts.title || CONTENT.appName) + '</span>';
    if (opts.menu) {
      html += '<div class="header-menu">' +
        '<button class="header-menu-btn" aria-label="Menu" aria-expanded="false" id="menu-toggle">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
        '</button>' +
        '<div class="header-menu-dropdown" id="menu-dropdown">' +
        '<a href="#/welcome">How it works</a><a href="#/about">About</a><a href="#/settings">Settings</a></div></div>';
    }
    h.innerHTML = html;
    if (opts.menu) {
      var btn = document.getElementById('menu-toggle');
      var dd = document.getElementById('menu-dropdown');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = dd.classList.toggle('open');
        btn.setAttribute('aria-expanded', open);
      });
      document.addEventListener('click', function handler() {
        dd.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }, { once: false });
    }
  },

  updateTabBar: function (route) {
    var tabRoutes = ['#/', '#/today', '#/progress', '#/decide'];
    var bar = this.$tabBar();
    var app = this.$app();
    if (tabRoutes.indexOf(route) >= 0) {
      bar.classList.remove('hidden');
      app.classList.remove('no-tab-bar');
      var tabs = bar.querySelectorAll('a');
      tabs.forEach(function (t) {
        var href = t.getAttribute('href');
        t.classList.toggle('active', href === route);
      });
    } else {
      bar.classList.add('hidden');
      app.classList.add('no-tab-bar');
    }
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

  disclaimerHTML: function () {
    return '';
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

/* ==================== SCREEN: WELCOME (LANDING L1) ==================== */
function renderWelcome() {
  var route = '#/welcome';
  UI.updateTabBar(route);
  UI.renderHeader({ title: CONTENT.appName });

  var c = UI.$content();
  var l = CONTENT.landing;
  var html = '';

  html += '<div class="landing-page">';
  html += '<div class="landing-wordmark">' + escHTML(l.wordmark) + '</div>';
  html += '<h1 class="landing-headline">' + escHTML(l.headline) + '</h1>';
  html += '<p class="landing-subline">' + escHTML(l.subline) + '</p>';

  // Signature Hero Visual: Journey curve with typical range band and milestone bloom dots
  html += '<svg class="landing-hero-svg" viewBox="0 0 320 84" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Progress curve illustration">';
  // Typical range shaded band
  html += '<path d="M 10 74 C 70 70, 140 58, 200 48 C 250 40, 280 32, 310 24 L 310 44 C 280 54, 250 64, 200 70 C 140 76, 70 80, 10 82 Z" fill="#E6F2FC" opacity="0.8"/>';
  // Journey line
  html += '<path class="journey-path-line" d="M 12 76 C 80 72, 140 56, 200 44 C 250 34, 280 24, 308 16" stroke="#0B5E9E" stroke-width="3" stroke-linecap="round" fill="none"/>';
  // Milestone bloom dots
  html += '<circle cx="70" cy="73" r="5" fill="#FFFFFF" stroke="#0B5E9E" stroke-width="2.5"/>';
  html += '<circle cx="170" cy="51" r="5" fill="#FFFFFF" stroke="#0B5E9E" stroke-width="2.5"/>';
  html += '<circle cx="280" cy="22" r="6" fill="#F26B1D" stroke="#FFFFFF" stroke-width="2"/>';
  html += '</svg>';

  // "How it works"
  html += '<div class="card mb-16">';
  html += '<h2 class="card-title" style="font-size:0.95rem;margin-bottom:6px;">How it works</h2>';
  (l.howItWorks || []).forEach(function (h) {
    html += '<div class="landing-feature-row">';
    html += '<div class="landing-feature-badge">' + h.step + '</div>';
    html += '<div><strong>' + escHTML(h.title) + '.</strong> <span class="muted">' + escHTML(h.time) + '</span></div>';
    html += '</div>';
  });
  html += '</div>';

  // "Why it helps"
  html += '<div class="mb-16">';
  html += '<h2 class="section-title mb-8" style="font-size:0.95rem;">Why it helps</h2>';
  (l.benefits || []).forEach(function (b) {
    html += '<div class="landing-benefit-chip">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B5E9E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
      '<span>' + escHTML(b) + '</span>' +
      '</div>';
  });
  html += '</div>';

  // Privacy chip
  html += '<div class="text-center">';
  html += '<div class="privacy-chip">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
    '<span>' + escHTML(l.privacyBadge) + '</span>' +
    '</div>';
  html += '</div>';

  // Primary CTA
  html += '<a href="#/welcome-intro" class="btn btn-primary btn-full">' + escHTML(l.cta) + '</a>';
  html += '</div>';

  c.innerHTML = html;
}

/* ==================== SCREEN: SETUP INTRO (LANDING L2) ==================== */
function renderWelcomeIntro() {
  var route = '#/welcome-intro';
  UI.updateTabBar(route);
  UI.renderHeader({ title: 'Set up your plan', back: '#/welcome' });

  var c = UI.$content();
  var intro = CONTENT.landing.intro;
  var html = '';

  html += '<div class="landing-page">';
  html += '<h1 class="landing-headline">' + escHTML(intro.heading) + '</h1>';
  html += '<p class="landing-subline">' + escHTML(intro.subline) + '</p>';

  (intro.chapters || []).forEach(function (ch, idx) {
    html += '<div class="chapter-preview-card">';
    html += '<div class="chapter-preview-num">0' + (idx + 1) + '</div>';
    html += '<div><div style="font-weight:700;color:var(--deep-navy);">' + escHTML(ch.title) + '</div>';
    html += '<div style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(ch.text) + '</div></div>';
    html += '</div>';
  });

  html += '<div class="mt-20" style="display:flex;gap:12px;">' +
    '<a href="#/welcome" class="btn btn-secondary" style="flex:1;text-align:center;">' + escHTML(intro.back) + '</a>' +
    '<a href="#/start" class="btn btn-primary" style="flex:1;text-align:center;">' + escHTML(intro.continue) + '</a>' +
    '</div>';
  html += '</div>';

  c.innerHTML = html;
}

/* ==================== SCREEN: JOURNEY (HOME) ==================== */
function renderHome() {
  var profile = Storage.load();
  if (!profile) {
    Router.navigate('#/welcome');
    return;
  }
  var route = '#/';
  UI.updateTabBar(route);
  UI.renderHeader({ title: CONTENT.appName, menu: true });

  var c = UI.$content();
  var html = '';

  // Top greeting & status
  var cfg = Utils.getConcernConfig(profile.concern);
  var week = Utils.getWeekNumber(profile.startDate);
  var dayN = Utils.daysBetween(profile.startDate, Utils.getToday()) + 1;
  var greeting = profile.name ? ('Hi ' + escHTML(Utils.toTitleCase(profile.name))) : 'Welcome back';
  html += '<h1 style="font-size:1.25rem;font-weight:800;color:var(--deep-navy);margin-bottom:2px;">' + greeting + '</h1>';
  html += '<p class="status-line">Week ' + week + ' of ' + cfg.fullWindowWeeks + ' · ' + escHTML(cfg.label) + '</p>';

  // F10: Three Concentric Rings
  var isCiDone = Utils.isCheckedInToday(profile);
  var isRevDue = Utils.isWeeklyRatingDue(profile);
  var con = Utils.getConsistency(profile.checkins, profile.startDate);
  
  var cOffset1 = isCiDone ? 0 : 276.46;
  var cOffset2 = (!isRevDue && (profile.ratings && profile.ratings.length > 0)) ? 0 : 201.06;
  var conRatio = Math.min(1, con.pct / 0.8);
  var cOffset3 = 125.66 * (1 - conRatio);

  var ariaRings = 'Check-in ' + (isCiDone ? 'done' : 'not done') + '. Weekly review ' + (isRevDue ? 'due' : 'up to date') + '. Consistency ' + Math.round(con.pct * 100) + ' percent.';

  html += '<div class="rings-container" aria-label="' + ariaRings + '" role="img">';
  html += '<div class="rings-svg-wrap">';
  html += '<svg viewBox="0 0 110 110" style="width:100%;height:100%;transform:rotate(-90deg);">';
  html += '<circle cx="55" cy="55" r="44" fill="none" stroke="#e2e8f0" stroke-width="6"/>';
  html += '<circle cx="55" cy="55" r="32" fill="none" stroke="#e2e8f0" stroke-width="6"/>';
  html += '<circle cx="55" cy="55" r="20" fill="none" stroke="#e2e8f0" stroke-width="6"/>';
  html += '<circle cx="55" cy="55" r="44" fill="none" stroke="#1c4ed8" stroke-width="6" stroke-linecap="round" stroke-dasharray="276.46" stroke-dashoffset="' + cOffset1 + '" style="transition:stroke-dashoffset 800ms ease;"/>';
  html += '<circle cx="55" cy="55" r="32" fill="none" stroke="#0284c7" stroke-width="6" stroke-linecap="round" stroke-dasharray="201.06" stroke-dashoffset="' + cOffset2 + '" style="transition:stroke-dashoffset 800ms ease 150ms;"/>';
  html += '<circle cx="55" cy="55" r="20" fill="none" stroke="#0d9488" stroke-width="6" stroke-linecap="round" stroke-dasharray="125.66" stroke-dashoffset="' + cOffset3 + '" style="transition:stroke-dashoffset 800ms ease 300ms;"/>';
  html += '</svg></div>';

  html += '<div class="rings-legend">';
  html += '<div class="ring-legend-item"><span class="ring-legend-dot ring-dot-checkin"></span><span>' + (isCiDone ? 'Check-in done' : 'Check-in today') + '</span></div>';
  html += '<div class="ring-legend-item"><span class="ring-legend-dot ring-dot-review"></span><span>' + (isRevDue ? 'Weekly review due' : 'Review on track') + '</span></div>';
  html += '<div class="ring-legend-item"><span class="ring-legend-dot ring-dot-consistency"></span><span>' + Math.round(con.pct * 100) + '% consistency</span></div>';
  html += '</div></div>';

  // F9: Memory Card (at weeks 2, 4, 8)
  if (profile && profile.whyStarted && (week === 2 || week === 4 || week === 8 || week > 2)) {
    var baseR = (profile.ratings && profile.ratings[0]) ? profile.ratings[0].primary : 3;
    var curR = (profile.ratings && profile.ratings.length > 0) ? profile.ratings[profile.ratings.length - 1].primary : baseR;
    html += '<div class="memory-card">';
    html += '<div class="memory-heading">Memory · ' + week + ' weeks in</div>';
    html += '<p class="memory-quote">“' + escHTML(profile.whyStarted) + '”</p>';
    html += '<p class="memory-sub">Starting point was ' + baseR + '/5. Today it is ' + curR + '/5.</p>';
    html += '</div>';
  }

  // F7: Week Recap Trigger Card
  var recapWeeks = [1, 2, 4, 8, 12];
  if (recapWeeks.indexOf(week) !== -1 && (!profile.recapSeen || profile.recapSeen.indexOf(week) === -1)) {
    html += '<div class="card" style="background:#eff6ff;border-color:#bfdbfe;margin-bottom:16px;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">';
    html += '<div><h3 class="card-title" style="margin:0 0 2px 0;font-size:0.95rem;">Week ' + week + ' recap</h3><p class="card-text" style="font-size:0.82rem;margin:0;">See your highlights and progress.</p></div>';
    html += '<a href="#/recap" class="btn btn-sm btn-primary">View recap</a>';
    html += '</div></div>';
  }

  // F4: Feeling Stuck Trigger Card
  var streak0 = (Utils.getStreak(profile.checkins) === 0 && dayN >= 4);
  var ratingDropped = false;
  if (profile.ratings && profile.ratings.length >= 2) {
    var lR = profile.ratings[profile.ratings.length - 1].primary;
    var pR = profile.ratings[profile.ratings.length - 2].primary;
    if (lR < pR) ratingDropped = true;
  }
  if (streak0 || ratingDropped) {
    html += '<div class="card" style="margin-bottom:16px;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">';
    html += '<div><h3 class="card-title" style="margin:0 0 2px 0;font-size:0.92rem;">Feeling stuck?</h3><p class="card-text" style="font-size:0.82rem;margin:0;">Progress takes practice. We can help you adjust.</p></div>';
    html += '<a href="#/stuck" class="btn btn-sm btn-secondary">Get support</a>';
    html += '</div></div>';
  }

  // PWA Install Hint Card
  var totalCheckins = (profile.checkins || []).filter(function (ci) { return ci.done; }).length;
  if (totalCheckins >= 3 && !profile.installHintDismissed) {
    html += '<div class="install-hint-card" id="pwa-install-banner">';
    html += '<div><p class="install-hint-title">Add to your home screen</p><p class="install-hint-sub">Quick 1-tap daily access</p></div>';
    html += '<div style="display:flex;gap:8px;align-items:center;">';
    html += '<button type="button" class="btn btn-sm btn-primary" id="btn-pwa-install">Add</button>';
    html += '<button type="button" class="btn-text-link" id="btn-dismiss-install" style="font-size:0.75rem;">Dismiss</button>';
    html += '</div></div>';
  }

  // Vertical Story Path of 5 Nodes
  var currentStage = getCurrentStage(profile);
  var stages = [
    { key: 'set up',    title: 'Set up',    hash: '#/start' },
    { key: 'timeline',  title: 'Timeline',  hash: '#/expect' },
    { key: 'check-in',  title: 'Check-in',  hash: '#/today' },
    { key: 'results',   title: 'Results',   hash: '#/progress' },
    { key: 'next step', title: 'Next step', hash: '#/decide' }
  ];

  var checkIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  html += '<div class="story-path">';
  stages.forEach(function (s, idx) {
    var order = getStageOrder(s.key);
    var currentOrder = getStageOrder(currentStage);
    var state = 'upcoming';
    if (order < currentOrder) state = 'done';
    else if (order === currentOrder) state = 'current';

    html += '<div class="story-node ' + state + '">';
    html += '<a href="' + s.hash + '" class="story-node-header">';
    html += '<span class="story-node-indicator">' + (state === 'done' ? checkIcon : (idx + 1)) + '</span>';
    html += '<span class="story-node-title">' + s.title + '</span>';
    html += '</a>';

    // The current node expands to house the single primary card
    if (state === 'current') {
      html += '<div class="story-node-body">' + getPrimaryCard(profile) + '</div>';
    }
    html += '</div>';
  });
  html += '</div>';

  // Positive Ending Element: Next upcoming milestone
  if (profile && profile.concern) {
    var concernCfg = Utils.getConcernConfig(profile.concern);
    var currentWeekNum = Utils.getWeekNumber(profile.startDate);
    var upcomingMilestone = null;
    if (concernCfg.milestones) {
      for (var m = 0; m < concernCfg.milestones.length; m++) {
        if (concernCfg.milestones[m].toWeek >= currentWeekNum) {
          upcomingMilestone = concernCfg.milestones[m];
          break;
        }
      }
    }
    if (upcomingMilestone) {
      html += '<div class="card mt-16" style="background:var(--pale-blue);border:none;">' +
        '<div style="font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--primary-blue);margin-bottom:4px;">Next milestone \u00B7 Weeks ' + upcomingMilestone.fromWeek + '\u2013' + upcomingMilestone.toWeek + '</div>' +
        '<div style="font-weight:700;color:var(--deep-navy);margin-bottom:4px;">' + escHTML(upcomingMilestone.title) + '</div>' +
        '<div style="font-size:0.85rem;color:var(--text-secondary);">' + escHTML(upcomingMilestone.text) + '</div>' +
        '</div>';
    }
  }

  c.innerHTML = html;

  // Bind events
  var tipCloseBtn = document.getElementById('close-tip');
  if (tipCloseBtn) {
    tipCloseBtn.addEventListener('click', function () {
      try { localStorage.setItem(tipKey, '1'); } catch (e) {}
      var bar = document.getElementById('app-tip-bar');
      if (bar) bar.style.display = 'none';
    });
  }
}

function getPrimaryCard(profile) {
  // Priority 1: weekly review due
  if (profile && Utils.isWeeklyRatingDue(profile)) {
    return makeCard("Weekly review", "30 seconds. See how you're doing.", '#/progress', "Start review");
  }
  // Priority 2: refill soon (product low stock)
  if (profile) {
    var lowP = Utils.productLowStock(profile);
    if (lowP) {
      var daysLeft = Utils.getDaysLeft(lowP);
      var line = escHTML(lowP.name) + ": about " + Math.max(0, daysLeft) + " days left.";
      return makeCard("Refill soon", line, '#/decide', "Plan refill");
    }
  }
  // Priority 3: not checked in today
  if (profile && !Utils.isCheckedInToday(profile)) {
    return makeCard("Check in today", "Takes 10 seconds.", '#/today', "Mark done");
  }
  // Priority 4: timeline not seen
  if (profile && profile.flags && !profile.flags.seenExpect) {
    return makeCard("See your timeline", "Know what's normal, week by week.", '#/expect', "View timeline");
  }
  // Priority 5: no profile
  if (!profile) {
    return makeCard("Know if it's working", "Set a goal. Track it. See real change.", '#/start', "Set up my plan");
  }
  // Priority 6: all done
  return makeCard("All done today", "Next check-in tomorrow.", '#/progress', "See results");
}

function makeCard(title, text, href, btnText) {
  return '<div class="card"><h2 class="card-title">' + title + '</h2>' +
    '<p class="card-text">' + text + '</p>' +
    '<a href="' + href + '" class="btn btn-primary btn-full">' + (btnText || 'Open') + '</a></div>';
}

function getCurrentStage(profile) {
  if (!profile) return 'set up';
  if (!profile.flags || !profile.flags.seenExpect) return 'timeline';
  if (!profile.baseline) return 'results';
  return 'results';
}

function getStageOrder(stage) {
  var order = {
    'set up': 0, 'timeline': 1, 'check-in': 2, 'results': 3, 'next step': 4,
    start: 0, expect: 1, today: 2, progress: 3, decide: 4
  };
  return order[stage] !== undefined ? order[stage] : 0;
}

/* ==================== SCREEN: START (9-QUESTION ONBOARDING) ==================== */
function renderStart() {
  var route = '#/start';
  UI.updateTabBar(route);
  UI.renderHeader({ title: 'Set up your plan', back: '#/' });

  var c = UI.$content();

  // Pick up where you left off prompt if saved draft exists
  if (startState.step === 0 && !startState.editing && !startState.resuming) {
    var draft = loadDraft();
    if (draft && draft.step > 0) {
      var dp = CONTENT.landing.draftPrompt;
      var draftHtml = '<div class="card text-center" style="padding:24px 16px;">' +
        '<h2 class="card-title mb-8">' + escHTML(dp.title) + '</h2>' +
        '<p class="card-text mb-16">' + escHTML(dp.text) + ' (Step ' + (draft.step + 1) + ' of 9)</p>' +
        '<div style="display:flex;gap:12px;">' +
        '<button class="btn btn-secondary" id="btn-draft-restart" style="flex:1;">' + escHTML(dp.restart) + '</button>' +
        '<button class="btn btn-primary" id="btn-draft-resume" style="flex:1;">' + escHTML(dp.resume) + '</button>' +
        '</div></div>';
      c.innerHTML = draftHtml;

      document.getElementById('btn-draft-resume').addEventListener('click', function () {
        startState = draft;
        startState.resuming = true;
        renderStart();
      });
      document.getElementById('btn-draft-restart').addEventListener('click', function () {
        clearDraft();
        resetStartState();
        renderStart();
      });
      return;
    }
  }

  var step = startState.step;
  var ans = startState.answers;

  if (step === 0) renderQ1(c, ans);
  else if (step === 1) renderQ2(c, ans);
  else if (step === 2) renderQ3(c, ans);
  else if (step === 3) renderQ4(c, ans);
  else if (step === 4) renderQ5(c, ans);
  else if (step === 5) renderQ6(c, ans);
  else if (step === 6) renderQ7(c, ans);
  else if (step === 7) renderQ8(c, ans);
  else if (step === 8) renderQ9(c, ans);
  else if (step === 9) renderPlanSummary(c, ans);

  // Enter key continues
  bindEnterKey();
}

function bindEnterKey() {
  var handler = function (e) {
    if (e.key === 'Enter') {
      var nxt = document.getElementById('q-next');
      if (nxt && !nxt.disabled) {
        document.removeEventListener('keydown', handler);
        nxt.click();
      }
    }
  };
  document.addEventListener('keydown', handler, { once: true });
}

// Nav helpers for onboarding
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

/* ==================== SCREEN: TIMELINE (EXPECT) ==================== */
var expectPreviewConcern = null;

function renderExpect() {
  var route = '#/expect';
  UI.updateTabBar(route);
  UI.renderHeader({ title: 'Your timeline', back: '#/' });

  var profile = Storage.load();
  var c = UI.$content();

  if (!profile && !expectPreviewConcern) {
    renderExpectPicker(c);
    return;
  }

  var concern = expectPreviewConcern || (profile ? profile.concern : 'wellness');
  var cfg = Utils.getConcernConfig(concern);
  var isPreview = !!expectPreviewConcern && profile && expectPreviewConcern !== profile.concern;
  var week = profile ? Utils.getWeekNumber(profile.startDate) : 0;
  var goalText = profile ? profile.goalText : '';

  var html = '';

  // F5 Progress Forecast Strip
  var currentWk = profile ? Utils.getWeekNumber(profile.startDate) : 1;
  html += '<div class="forecast-strip">';
  for (var w = 1; w <= cfg.fullWindowWeeks; w++) {
    var isCurrent = (w === currentWk);
    var isEarly = (w < cfg.earlyWindowWeeks);
    var isMiddle = (w >= cfg.earlyWindowWeeks && w < cfg.earlyWindowWeeks + 4);
    html += '<div class="forecast-card' + (isCurrent ? ' current-week' : '') + '">';
    if (isCurrent) html += '<span class="forecast-you-are-here">You are here</span>';
    html += '<div class="forecast-week">W' + w + '</div>';
    if (isEarly) {
      html += '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>';
      html += '<div class="forecast-phase">Base</div>';
    } else if (isMiddle) {
      html += '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M20 12h2"/><path d="M17.5 19H9a5 5 0 0 1-2-9.6A6 6 0 0 1 17 8a4 4 0 0 1 2 7.5"/></svg>';
      html += '<div class="forecast-phase">Early</div>';
    } else {
      html += '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
      html += '<div class="forecast-phase">Clear</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  var weeksLeft = cfg.earlyWindowWeeks - currentWk;
  var etaText = '';
  if (weeksLeft > 0) {
    etaText = 'First changes usually from week ' + cfg.earlyWindowWeeks + '. About ' + weeksLeft + ' weeks to go.';
  } else if (weeksLeft === 0) {
    etaText = 'You are at week ' + cfg.earlyWindowWeeks + '. Early signs usually emerge around now.';
  } else {
    etaText = 'Past week ' + cfg.earlyWindowWeeks + '. Deeper changes build with continued routine.';
  }
  html += '<p class="status-line" style="margin:4px 0 16px 0;font-weight:600;">' + etaText + '</p>';

  // Pill tabs with active triangle indicator to preview concerns
  html += '<div style="overflow-x:auto;padding-bottom:8px;margin-bottom:12px;">';
  html += '<div class="pill-tabs">';
  CONTENT.quiz.concerns.forEach(function (q) {
    var active = q.value === concern;
    html += '<button class="pill-tab' + (active ? ' active' : '') + '" data-concern="' + q.value + '">' + escHTML(q.label) + '</button>';
  });
  html += '</div></div>';

  if (isPreview) {
    html += '<p class="muted mb-12">Previewing ' + escHTML(cfg.label) + ' timeline. Your saved profile is unchanged.</p>';
  }

  // Summary card
  html += '<div class="card">';
  html += '<h2 class="card-title">' + escHTML(cfg.label) + '</h2>';
  if (goalText) html += '<p class="card-text">Goal: ' + escHTML(goalText) + '</p>';
  if (profile) {
    html += '<p class="muted">Week ' + week + ' of about ' + cfg.fullWindowWeeks + '</p>';
    var pctBar = Math.min(100, Math.round((week / cfg.earlyWindowWeeks) * 100));
    html += '<div class="progress-bar-container"><div class="progress-bar-fill" style="width:' + pctBar + '%;"></div></div>';
    html += '<p class="muted" style="font-size:0.75rem;">' + week + ' of ' + cfg.earlyWindowWeeks + ' weeks (first change window)</p>';
  }
  html += '</div>';

  // Expectation vs reality card (from Q7)
  if (profile && profile.expectedWeeks !== undefined) {
    var expW = profile.expectedWeeks;
    var earlyW = cfg.earlyWindowWeeks;
    var line = '';
    if (expW === null) {
      line = 'You had no set timeframe. Most people see first changes around ' + earlyW + ' to ' + cfg.fullWindowWeeks + ' weeks.';
    } else if (expW < earlyW) {
      line = 'You expected ' + expW + ' weeks. Most see first changes around ' + earlyW + ' to ' + cfg.fullWindowWeeks + ' weeks.';
    } else {
      line = 'Your expected ' + expW + ' weeks fits the typical ' + earlyW + ' to ' + cfg.fullWindowWeeks + ' week window.';
    }
    html += '<div class="card" style="background:#F9FAFB;">' +
      '<h3 class="card-title" style="font-size:0.95rem;">Expectation vs biology</h3>' +
      '<p class="card-text mb-0" style="font-size:0.9rem;">' + escHTML(line) + '</p>' +
      '</div>';
  }

  // Milestone timeline
  html += '<div class="timeline">';
  cfg.milestones.forEach(function (ms, i) {
    var state = 'upcoming';
    if (profile) {
      if (week > ms.toWeek) state = 'done';
      else if (week >= ms.fromWeek && week <= ms.toWeek) state = 'current';
    }
    var cls = 'timeline-item ' + state;
    if (state === 'current') cls += ' expanded';
    html += '<div class="' + cls + '" data-idx="' + i + '" tabindex="0" role="button" aria-expanded="' + (state === 'current') + '">';
    html += '<span class="timeline-range">Weeks ' + ms.fromWeek + '\u2013' + ms.toWeek + '</span>';
    if (state === 'current') html += '<span class="timeline-tag">You are here</span>';
    html += '<div class="timeline-title">' + escHTML(ms.title) + '</div>';
    html += '<div class="timeline-text">' + escHTML(ms.text) + '</div>';
    html += '</div>';
  });
  html += '</div>';

  // Why explainer (max 25 words)
  html += '<div class="mb-16"><div class="collapsible-header" id="why-toggle" tabindex="0" role="button" aria-expanded="false">Why does it take time?</div>';
  html += '<div class="collapsible-body" id="why-body">' + escHTML(cfg.why) + '</div></div>';

  // Navigation buttons
  if (profile) {
    if (!profile.baseline) {
      html += '<a href="#/progress" class="btn btn-primary btn-full mb-12">Set my starting point</a>';
    }
    html += '<div class="mt-16" style="display:flex;gap:12px;">' +
      '<a href="#/" class="btn btn-secondary" style="flex:1;text-align:center;">Back</a>' +
      '<a href="#/today" class="btn btn-primary" style="flex:1;text-align:center;">Daily check-in</a>' +
      '</div>';
  } else {
    html += '<a href="#/start" class="btn btn-primary btn-full">Set up my plan</a>';
  }

  c.innerHTML = html;

  // Bind preview pill tabs
  c.querySelectorAll('.pill-tab[data-concern]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      expectPreviewConcern = this.getAttribute('data-concern');
      renderExpect();
    });
  });

  // Bind timeline expand/collapse
  c.querySelectorAll('.timeline-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var expanded = this.classList.toggle('expanded');
      this.setAttribute('aria-expanded', expanded);
    });
  });

  // Bind collapsible
  var whyToggle = document.getElementById('why-toggle');
  var whyBody = document.getElementById('why-body');
  if (whyToggle && whyBody) {
    whyToggle.addEventListener('click', function () {
      whyToggle.classList.toggle('open');
      whyBody.classList.toggle('open');
      whyToggle.setAttribute('aria-expanded', whyBody.classList.contains('open'));
    });
  }

  // Set seenExpect flag
  if (profile && profile.flags && !profile.flags.seenExpect) {
    profile.flags.seenExpect = true;
    Storage.save(profile);
  }
}

function renderExpectPicker(c) {
  var html = '<h2 class="section-title mb-12">Pick a focus to preview timeline</h2>';
  html += '<div class="chip-group">';
  CONTENT.quiz.concerns.forEach(function (q) {
    html += '<button class="chip" data-concern="' + q.value + '" tabindex="0">' + escHTML(q.label) + '</button>';
  });
  html += '</div>';
  html += '<p class="muted">Or <a href="#/start">set up your plan</a> first.</p>';
  c.innerHTML = html;

  c.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      expectPreviewConcern = this.getAttribute('data-concern');
      renderExpect();
    });
  });
}

/* ==================== SCREEN: CHECK-IN (TODAY) ==================== */
function renderToday() {
  var route = '#/today';
  UI.updateTabBar(route);
  UI.renderHeader({ title: 'Daily check-in' });

  var profile = Storage.load();
  var c = UI.$content();

  if (!profile) {
    c.innerHTML = '<div class="card"><p class="card-text">Set up your plan first.</p>' +
      '<a href="#/start" class="btn btn-primary">Set up my plan</a></div>';
    return;
  }

  var today = Utils.getToday();
  var dayN = Utils.daysBetween(profile.startDate, today) + 1;
  var checkedIn = Utils.isCheckedInToday(profile);
  var todayCheckin = Utils.getCheckinForDate(profile, today);

  var html = '';
  html += '<p class="status-line">' + Utils.formatDate(today) + ' \u2014 Day ' + dayN + '</p>';

  // Weekly review due banner
  if (Utils.isWeeklyRatingDue(profile)) {
    html += '<div class="banner"><a href="#/progress">Weekly review due \u2192</a> 30 seconds. See how you\u2019re doing.</div>';
  }

  // Done today button
  var checkDoneIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"/></svg>';
  html += '<button class="btn checkin-btn' + (checkedIn ? ' checked btn-primary' : '') +
    '" id="checkin-toggle" aria-pressed="' + checkedIn + '">' +
    (checkedIn ? (checkDoneIcon + 'Done today') : 'Done today') + '</button>';

  // Note
  html += '<div class="field"><label for="day-note">Note (optional)</label>' +
    '<input type="text" id="day-note" placeholder="How was today?" value="' +
    escHTML(todayCheckin ? todayCheckin.note : '') + '"></div>';

  // Weekly dots + 4-week grid
  html += renderDotGrid(profile);

  // Metrics: Consistency is primary, streak is secondary
  var con = Utils.getConsistency(profile.checkins, profile.startDate);
  var streak = Utils.getStreak(profile.checkins);
  html += '<div class="metrics-row">';
  html += '<div class="metric"><div class="metric-value">' + con.done + ' of ' + con.total + '</div><div class="metric-label">days (last ' + con.total + ')</div></div>';
  html += '<div class="metric"><div class="metric-value">' + streak + '</div><div class="metric-label">day streak</div></div>';
  html += '</div>';

  // Encouragement for missed days
  if (con.done < con.total && dayN > 1) {
    html += '<p class="callout">Missed a few days? Pick up today. Every day counts.</p>';
  }

  // Calendar reminder option (.ics)
  html += '<div class="card text-center" style="margin-top:16px;">' +
    '<h3 class="card-title" style="font-size:0.95rem;">Keep your routine steady</h3>' +
    '<p class="card-text" style="font-size:0.85rem;margin-bottom:12px;">Add a recurring reminder to your phone calendar.</p>' +
    '<button class="btn btn-sm" id="btn-reminder">Add a daily reminder</button>' +
    '<p class="muted mt-8" style="font-size:0.75rem;">The app itself cannot send push notifications.</p>' +
    '</div>';

  // Navigation: Back on left, Results on right
  html += '<div class="mt-16" style="display:flex;gap:12px;">' +
    '<a href="#/expect" class="btn btn-secondary" style="flex:1;text-align:center;">Back</a>' +
    '<a href="#/progress" class="btn btn-primary" style="flex:1;text-align:center;">Results</a>' +
    '</div>';

  c.innerHTML = html;

  // Bind toggle
  document.getElementById('checkin-toggle').addEventListener('click', function () {
    toggleCheckin(profile, today);
    renderToday();
  });

  // Bind note
  document.getElementById('day-note').addEventListener('change', function () {
    saveNote(profile, today, this.value);
  });

  // Bind backfill dots
  c.querySelectorAll('.dot.editable').forEach(function (dot) {
    dot.addEventListener('click', function () {
      var date = this.getAttribute('data-date');
      toggleCheckin(profile, date);
      renderToday();
    });
  });

  // Bind reminder
  var reminderBtn = document.getElementById('btn-reminder');
  if (reminderBtn) {
    reminderBtn.addEventListener('click', function () {
      Utils.downloadICS('Daily wellness check-in', 'Take 10 seconds to log your progress.', 'DAILY');
    });
  }
}

function toggleCheckin(profile, date) {
  if (!profile.checkins) profile.checkins = [];
  var existing = profile.checkins.find(function (c) { return c.date === date; });
  if (existing) {
    existing.done = !existing.done;
  } else {
    profile.checkins.push({ date: date, done: true, note: '' });
  }
  Storage.save(profile);
}

function saveNote(profile, date, note) {
  if (!profile.checkins) profile.checkins = [];
  var existing = profile.checkins.find(function (c) { return c.date === date; });
  if (existing) {
    existing.note = note;
  } else {
    profile.checkins.push({ date: date, done: false, note: note });
  }
  Storage.save(profile);
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

/* ==================== SCREEN: RESULTS (PROGRESS) ==================== */
var activeChartSeries = 'primary'; // 'primary' (marker) or 'secondary' (overall)

function renderProgress() {
  var route = '#/progress';
  UI.updateTabBar(route);
  UI.renderHeader({ title: 'Your results' });

  var profile = Storage.load();
  var c = UI.$content();

  if (!profile) {
    c.innerHTML = '<div class="card"><p class="card-text">Set up your plan to see your results.</p>' +
      '<a href="#/start" class="btn btn-primary">Set up my plan</a></div>';
    return;
  }

  var cfg = Utils.getConcernConfig(profile.concern);
  var html = '';

  // Step A: First visit -> Set starting point with observable markers
  if (!profile.baseline) {
    html += renderStartingPoint(cfg, profile);
    c.innerHTML = html;
    bindStartingPoint(profile, cfg);
    return;
  }

  // Verdict banner with icon and reasons
  var verdict = Utils.getVerdict(profile);
  if (verdict.type !== 'none') {
    var icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-3px;margin-right:6px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    if (verdict.type === 'onTrack') {
      icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-3px;margin-right:6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else if (verdict.type === 'consistency') {
      icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-3px;margin-right:6px;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
    } else if (verdict.type === 'closer') {
      icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-3px;margin-right:6px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    }

    html += '<div class="verdict-banner ' + verdict.cssClass + '">';
    html += '<div class="verdict-label">' + icon + ' ' + escHTML(verdict.label) + '</div>';
    html += '<div class="verdict-reason">' + escHTML(verdict.message) + '</div>';
    if (verdict.reasons && verdict.reasons.length) {
      html += '<ul style="margin-top:8px;padding-left:18px;font-size:0.85rem;">';
      verdict.reasons.forEach(function (r) { html += '<li>' + escHTML(r) + '</li>'; });
      html += '</ul>';
    }
    html += '</div>';
  }

  // "Starting point vs now" comparison cards
  var ratings = profile.weeklyRatings || [];
  var latest = ratings.length ? ratings[ratings.length - 1] : null;
  var markerLabel = profile.marker || 'Watched marker';

  html += '<div class="card">' +
    '<h3 class="card-title" style="font-size:0.95rem;">Starting point vs now</h3>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;">';

  // Marker comparison
  var curPri = latest ? latest.primary : profile.baseline.primary;
  var priDiff = curPri - profile.baseline.primary;
  var priText = priDiff > 0 ? ('Up by ' + priDiff) : (priDiff < 0 ? ('Down by ' + Math.abs(priDiff)) : 'Same as week 1');
  var priArrow = priDiff > 0 ? '\u2197' : (priDiff < 0 ? '\u2198' : '\u2192');
  html += '<div style="background:#F9FAFB;padding:12px;border-radius:var(--radius-card);border:1px solid var(--border-light);">' +
    '<div style="font-size:0.75rem;color:var(--text-secondary);">' + escHTML(markerLabel) + '</div>' +
    '<div style="font-size:1.2rem;font-weight:800;color:var(--deep-navy);margin:4px 0;">' + profile.baseline.primary + ' ' + priArrow + ' ' + curPri + '</div>' +
    '<div style="font-size:0.75rem;font-weight:600;color:var(--primary-blue);">' + priText + '</div>' +
    '</div>';

  // Overall comparison
  var curSec = latest ? latest.secondary : profile.baseline.secondary;
  var secDiff = curSec - profile.baseline.secondary;
  var secText = secDiff > 0 ? ('Up by ' + secDiff) : (secDiff < 0 ? ('Down by ' + Math.abs(secDiff)) : 'Same as week 1');
  var secArrow = secDiff > 0 ? '\u2197' : (secDiff < 0 ? '\u2198' : '\u2192');
  html += '<div style="background:#F9FAFB;padding:12px;border-radius:var(--radius-card);border:1px solid var(--border-light);">' +
    '<div style="font-size:0.75rem;color:var(--text-secondary);">Overall feeling</div>' +
    '<div style="font-size:1.2rem;font-weight:800;color:var(--deep-navy);margin:4px 0;">' + profile.baseline.secondary + ' ' + secArrow + ' ' + curSec + '</div>' +
    '<div style="font-size:0.75rem;font-weight:600;color:var(--primary-blue);">' + secText + '</div>' +
    '</div>';

  html += '</div></div>';

  // Chart with pill tabs [Marker] / [Overall]
  if (ratings.length > 0) {
    html += '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<h3 class="card-title" style="margin-bottom:0;font-size:0.95rem;">Rating trends</h3>' +
      '<div class="pill-tabs" style="margin-bottom:0;padding:2px;">' +
      '<button class="pill-tab' + (activeChartSeries === 'primary' ? ' active' : '') + '" id="chart-tab-pri" style="padding:4px 12px;min-height:32px;font-size:0.75rem;">' + escHTML(markerLabel) + '</button>' +
      '<button class="pill-tab' + (activeChartSeries === 'secondary' ? ' active' : '') + '" id="chart-tab-sec" style="padding:4px 12px;min-height:32px;font-size:0.75rem;">Overall</button>' +
      '</div></div>' +
      '<div class="chart-container" id="chart-area"></div>' +
      '<p class="muted mt-8" style="font-size:0.85rem;" id="chart-trend-line">' + getTrendSentence(profile) + '</p>' +
      '</div>';
  }

  // Weekly review form
  var ratingDue = Utils.isWeeklyRatingDue(profile);
  var weekNum = Utils.getWeekNumber(profile.startDate);
  var canEditLast = latest && Utils.daysBetween(latest.date, Utils.getToday()) <= 7;

  if (ratingDue) {
    html += renderWeeklyReview(cfg, profile, weekNum, null);
  } else if (canEditLast && latest) {
    html += '<div class="callout mb-12">You rated this week already. You can update it until next week.</div>';
    html += renderWeeklyReview(cfg, profile, latest.week, latest);
  }

  // "How we decide" sheet
  html += '<div class="mb-16"><div class="collapsible-header" id="decide-rules-toggle" tabindex="0" role="button" aria-expanded="false">How we decide your verdict</div>';
  html += '<div class="collapsible-body" id="decide-rules-body">' +
    '<ul style="padding-left:18px;line-height:1.6;font-size:0.85rem;">' +
    '<li><strong>Safety first:</strong> Any unusual reaction prompts a recommendation to pause and check with a health professional.</li>' +
    '<li><strong>Biology takes time:</strong> We wait for your body\u2019s natural renewal cycle before expecting visible changes.</li>' +
    '<li><strong>Consistency counts:</strong> Steadier routines give a fairer picture of how products perform.</li>' +
    '<li><strong>Observable trends:</strong> We compare your latest ratings to your original starting point.</li>' +
    '</ul></div></div>';

  // Progress summary (plain anonymous dl)
  html += renderProgressSummary(profile, cfg);

  // Nav buttons (Back on left, Next step on right)
  html += '<div class="mt-16" style="display:flex;gap:12px;">';
  html += '<a href="#/today" class="btn btn-secondary" style="flex:1;text-align:center;">Back</a>';
  html += '<a href="#/decide" class="btn btn-primary" style="flex:1;text-align:center;">Next step</a>';
  html += '</div>';

  c.innerHTML = html;

  // Bind chart tabs
  if (ratings.length > 0) {
    var chartArea = document.getElementById('chart-area');
    renderChart(profile.baseline, ratings, chartArea, activeChartSeries === 'primary', activeChartSeries === 'secondary', profile.concern);

    var tabPri = document.getElementById('chart-tab-pri');
    var tabSec = document.getElementById('chart-tab-sec');
    if (tabPri) {
      tabPri.addEventListener('click', function () {
        activeChartSeries = 'primary';
        renderProgress();
      });
    }
    if (tabSec) {
      tabSec.addEventListener('click', function () {
        activeChartSeries = 'secondary';
        renderProgress();
      });
    }
  }

  // Bind weekly review form
  if (ratingDue || canEditLast) {
    bindWeeklyReviewForm(profile, weekNum, ratingDue ? null : latest);
  }

  // Bind "How we decide" collapsible
  var hwdToggle = document.getElementById('decide-rules-toggle');
  var hwdBody = document.getElementById('decide-rules-body');
  if (hwdToggle && hwdBody) {
    hwdToggle.addEventListener('click', function () {
      hwdToggle.classList.toggle('open');
      hwdBody.classList.toggle('open');
      hwdToggle.setAttribute('aria-expanded', hwdBody.classList.contains('open'));
    });
  }

  // Bind Progress summary actions
  var btnPrint = document.getElementById('btn-print-summary');
  if (btnPrint) {
    btnPrint.addEventListener('click', function () { window.print(); });
  }
  var btnCopy = document.getElementById('btn-copy-summary');
  if (btnCopy) {
    btnCopy.addEventListener('click', function () {
      var con = Utils.getConsistency(profile.checkins, profile.startDate);
      var text = 'PROGRESS COMPANION SUMMARY\n' +
        'Focus area: ' + cfg.label + '\n' +
        'Goal: ' + (profile.goalText || 'Not set') + '\n' +
        'Watched marker: ' + (profile.marker || 'Not set') + '\n' +
        'Started: ' + Utils.formatDate(profile.startDate) + ' (Week ' + Utils.getWeekNumber(profile.startDate) + ')\n' +
        'Baseline: Marker ' + profile.baseline.primary + '/5, Overall ' + profile.baseline.secondary + '/5\n' +
        'Consistency: ' + Math.round(con.pct * 100) + '%\n';
      if (profile.weeklyRatings && profile.weeklyRatings.length) {
        text += 'Ratings:\n';
        profile.weeklyRatings.forEach(function (r) {
          text += 'Week ' + r.week + ': ' + r.primary + '/5 marker, ' + r.secondary + '/5 overall' + (r.unusual ? ' (unusual flagged)' : '') + '\n';
        });
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          btnCopy.textContent = 'Copied to clipboard';
          setTimeout(function () { btnCopy.textContent = 'Copy summary'; }, 2000);
        });
      }
    });
  }
}

function getTrendSentence(profile) {
  var ratings = profile.weeklyRatings || [];
  if (!ratings.length) return 'Check in next week to see your first trend.';
  var latest = ratings[ratings.length - 1];
  var diff = latest.primary - profile.baseline.primary;
  if (diff > 0) return 'Your rating is trending upwards compared to week 1.';
  if (diff < 0) return 'Your rating has dipped slightly compared to your starting point.';
  return 'Your rating has stayed steady for ' + ratings.length + ' week' + (ratings.length > 1 ? 's' : '') + '.';
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

/* ==================== SCREEN: NEXT STEP (DECISION AID) ==================== */
function renderDecide() {
  var route = '#/decide';
  UI.updateTabBar(route);
  UI.renderHeader({ title: 'What next?' });

  var profile = Storage.load();
  var c = UI.$content();

  if (!profile) {
    c.innerHTML = '<div class="card"><p class="card-text">Set up your plan first.</p>' +
      '<a href="#/start" class="btn btn-primary">Set up my plan</a></div>';
    return;
  }

  var cfg = Utils.getConcernConfig(profile.concern);
  var verdict = Utils.getVerdict(profile);
  var html = '';

  // Decision outcome card based on verdict (exactly 3 outcomes)
  if (verdict.type === 'closer') {
    // Outcome 3: Try a different approach
    var weeks = Utils.getWeekNumber(profile.startDate);
    html += '<div class="card" style="border-color:var(--verdict-closer-border);background:var(--verdict-closer-bg);">' +
      '<h2 class="card-title" style="color:var(--verdict-closer-text);">Try a different approach</h2>' +
      '<p class="card-text" style="color:var(--verdict-closer-text);">' +
      'Your ratings haven\'t moved after ' + weeks + ' weeks of steady use. Change one thing at a time, and keep tracking.' +
      '</p>' +
      '<a href="#/progress" class="btn" style="background:#fff;border-color:var(--verdict-closer-border);color:var(--verdict-closer-text);">See my progress summary</a>' +
      '</div>';
  } else if (verdict.type === 'consistency') {
    // Outcome 2: Adjust your routine (with 2 specific tips)
    var tips = cfg.adjustTips || ['Take your routine at the same time each day', 'Keep products near your bedside or sink'];
    html += '<div class="card" style="border-color:var(--verdict-consistency-border);background:var(--verdict-consistency-bg);">' +
      '<h2 class="card-title" style="color:var(--verdict-consistency-text);">Adjust your routine</h2>' +
      '<p class="card-text" style="color:var(--verdict-consistency-text);margin-bottom:8px;">' +
      'A steadier routine gives a clearer picture before you judge results. Try these two adjustments:' +
      '</p>' +
      '<ul style="padding-left:18px;color:var(--verdict-consistency-text);font-size:0.9rem;line-height:1.5;">' +
      '<li>' + escHTML(tips[0]) + '</li>' +
      '<li>' + escHTML(tips[1]) + '</li>' +
      '</ul>' +
      '</div>';
  } else {
    // Outcome 1: Keep going (on track or too early to tell)
    html += '<div class="card" style="border-color:var(--verdict-ontrack-border);background:var(--verdict-ontrack-bg);">' +
      '<h2 class="card-title" style="color:var(--verdict-ontrack-text);">Keep going</h2>' +
      '<p class="card-text" style="color:var(--verdict-ontrack-text);">' +
      'You are in the normal window. Keep your daily routine steady and check in each day.' +
      '</p>' +
      '</div>';
  }

  // Collapsible: Plan a refill (Decision aid: no price inputs, no cost per day, no shop link)
  html += '<div class="card mt-16">' +
    '<div class="collapsible-header" id="refill-toggle" tabindex="0" role="button" aria-expanded="false">' +
    'Plan a refill (optional)' +
    '</div>' +
    '<div class="collapsible-body" id="refill-body">';

  (profile.products || []).forEach(function (prod, idx) {
    var daysLeft = Utils.getDaysLeft(prod);
    var reorderDate = Utils.getReorderDate(prod);
    var packDone = daysLeft !== null && daysLeft <= 0;

    html += '<div class="product-card" id="product-' + idx + '">';
    html += '<h3>' + escHTML(prod.name) + '</h3>';
    if (packDone) {
      html += '<div class="callout mb-12">Your pack may have run out.</div>';
    }
    html += '<div class="field"><label for="size-' + idx + '">Pack size (days)</label>' +
      '<input type="number" id="size-' + idx + '" min="1" step="1" value="' + (prod.sizeDays || '') + '" placeholder="e.g. 30"></div>';
    html += '<div class="field"><label for="opened-' + idx + '">Date opened</label>' +
      '<input type="date" id="opened-' + idx + '" value="' + (prod.openedOn || '') + '"></div>';

    if (daysLeft !== null || reorderDate) {
      html += '<div class="product-outputs" style="grid-template-columns:1fr 1fr;">';
      if (daysLeft !== null) {
        html += '<div class="product-output"><div class="po-label">Days left</div><div class="po-value">' + Math.max(0, daysLeft) + '</div></div>';
      }
      if (reorderDate) {
        html += '<div class="product-output"><div class="po-label">Refill by</div><div class="po-value">' + Utils.formatDate(reorderDate) + '</div></div>';
      }
      html += '</div>';
    }
    html += '</div>';
  });

  html += '</div></div>';

  // Nav buttons (Back on left, Journey on right)
  html += '<div class="mt-16" style="display:flex;gap:12px;">' +
    '<a href="#/progress" class="btn btn-secondary" style="flex:1;text-align:center;">Back</a>' +
    '<a href="#/" class="btn btn-primary" style="flex:1;text-align:center;">Journey</a>' +
    '</div>';

  c.innerHTML = html;

  // Bind refill collapsible
  var refillToggle = document.getElementById('refill-toggle');
  var refillBody = document.getElementById('refill-body');
  if (refillToggle && refillBody) {
    refillToggle.addEventListener('click', function () {
      refillToggle.classList.toggle('open');
      refillBody.classList.toggle('open');
      refillToggle.setAttribute('aria-expanded', refillBody.classList.contains('open'));
    });
  }

  // Bind product inputs
  (profile.products || []).forEach(function (prod, idx) {
    var sizeInput = document.getElementById('size-' + idx);
    var openedInput = document.getElementById('opened-' + idx);
    function saveRefill() {
      var s = parseInt(sizeInput.value, 10);
      prod.sizeDays = (s && s >= 1) ? s : null;
      prod.openedOn = openedInput.value || prod.openedOn;
      Storage.save(profile);
      renderDecide();
    }
    if (sizeInput) sizeInput.addEventListener('change', saveRefill);
    if (openedInput) openedInput.addEventListener('change', saveRefill);
  });
}

/* ==================== SCREEN: ABOUT ==================== */
function renderAbout() {
  var route = '#/about';
  UI.updateTabBar(route);
  UI.renderHeader({ title: 'About', back: '#/' });

  var c = UI.$content();
  var html = '';

  html += '<h2 class="section-title mb-8">Why we built this</h2>';
  html += '<p class="card-text mb-16">Wellness routines take weeks to show results. We built Progress Companion to give you honest timelines, clear ways to measure change, and steady daily motivation.</p>';

  // Positive "What helps"
  html += '<h2 class="section-title mt-16 mb-12">What helps</h2>';
  html += '<div class="card mb-8"><p class="card-text mb-0"><strong>Small check-ins:</strong> Daily logging makes gradual change visible.</p></div>';
  html += '<div class="card mb-8"><p class="card-text mb-0"><strong>Observable markers:</strong> Watching one clear sign beats guessing by feel.</p></div>';
  html += '<div class="card mb-8"><p class="card-text mb-0"><strong>Patience:</strong> Biology takes weeks. Knowing your window keeps you steady.</p></div>';

  // Stage mapping
  var stats = CONTENT.stats;
  html += '<h2 class="section-title mt-16 mb-12">How each stage helps</h2>';
  (stats.stageMapping || []).forEach(function (sm) {
    html += '<div class="card"><h3 class="card-title">' + escHTML(sm.stage) + '</h3>' +
      '<p class="card-text mb-0">' + escHTML(sm.finding) + '</p></div>';
  });

  html += '<p class="disclaimer mt-16 text-center">' + escHTML(CONTENT.disclaimers.calm) + '</p>';
  c.innerHTML = html;
}

/* ==================== SCREEN: SETTINGS ==================== */
function renderSettings() {
  var route = '#/settings';
  UI.updateTabBar(route);
  UI.renderHeader({ title: 'Settings', back: '#/' });

  var profile = Storage.load();
  var c = UI.$content();
  var html = '';

  html += '<p class="callout mb-16">' + escHTML(CONTENT.disclaimers.data) + '</p>';

  // Edit plan
  html += '<button class="btn btn-full mb-12" id="settings-edit">Edit plan</button>';

  // Export data
  html += '<button class="btn btn-full mb-12" id="settings-export"' +
    (!profile ? ' disabled' : '') + '>Export data (JSON)</button>';

  // Delete all
  html += '<button class="btn btn-full mb-12" id="settings-delete" style="color:var(--danger-text);border-color:var(--danger-border);">Delete all data</button>';
  html += '<div id="delete-confirm" style="display:none;" class="confirm-panel">' +
    '<p>This will permanently delete your plan and ratings from this device.</p>' +
    '<div class="confirm-actions">' +
    '<button class="btn" id="delete-yes" style="color:var(--danger-text);border-color:var(--danger-border);">Yes, delete</button>' +
    '<button class="btn" id="delete-no">Cancel</button></div></div>';

  // Version & disclaimer
  html += '<p class="muted mt-16">Version ' + escHTML(CONTENT.version) + '</p>';
  html += '<p class="disclaimer mt-16 text-center">' + escHTML(CONTENT.disclaimers.calm) + '</p>';

  c.innerHTML = html;

  // Bind events
  document.getElementById('settings-edit').addEventListener('click', function () {
    resetStartState();
    if (profile) prefillStartState(profile);
    Router.navigate('#/start');
  });

  document.getElementById('settings-export').addEventListener('click', function () {
    if (!profile) return;
    var json = Storage.exportJSON();
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'progress-companion-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('settings-delete').addEventListener('click', function () {
    document.getElementById('delete-confirm').style.display = 'block';
  });

  document.getElementById('delete-yes').addEventListener('click', function () {
    Storage.reset();
    resetStartState();
    Router.navigate('#/');
  });

  document.getElementById('delete-no').addEventListener('click', function () {
    document.getElementById('delete-confirm').style.display = 'none';
  });
}


/* ==================== F4. SUPPORT FLOW (FEELING STUCK?) ==================== */
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

/* ==================== F7. WEEK RECAP STORIES ==================== */
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

/* ==================== INIT ==================== */
function init() {
  Router.register('#/', renderHome);
  Router.register('#/welcome', renderWelcome);
  Router.register('#/welcome-intro', renderWelcomeIntro);
  Router.register('#/start', renderStart);
  Router.register('#/expect', renderExpect);
  Router.register('#/today', renderToday);
  Router.register('#/progress', renderProgress);
  Router.register('#/decide', renderDecide);
  Router.register('#/about', renderAbout);
  Router.register('#/settings', renderSettings);
  Router.register('#/stuck', renderSupport);
  Router.register('#/recap', renderRecap);

  Router.start();

  // Midnight rollover listener
  var currentRenderedDate = Utils.getToday();
  function checkMidnightRollover() {
    var nowToday = Utils.getToday();
    if (nowToday !== currentRenderedDate) {
      currentRenderedDate = nowToday;
      var prof = Storage.load();
      if (prof) {
        var dayN = Utils.daysBetween(prof.startDate, currentRenderedDate) + 1;
        UI.toast('New day. Day ' + dayN + '.');
        Router.resolve();
      }
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') checkMidnightRollover();
  });
  window.addEventListener('focus', checkMidnightRollover);
  setInterval(checkMidnightRollover, 60000);

  // PWA beforeinstallprompt handler
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.deferredPrompt = e;
  });

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator && location.protocol && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  }
}

window.addEventListener('DOMContentLoaded', init);
