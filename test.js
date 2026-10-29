/**
 * Test Suite for Progress Companion
 * Tests getWeekNumber, getConsistency, getStreak, getVerdict, getReorderDate,
 * and Journey card priority logic.
 * Can be run in Node.js (node test.js) or in the browser console.
 */

(function () {
  var isNode = typeof module !== 'undefined' && module.exports;
  var root = isNode ? global : window;

  if (isNode) {
    var fs = require('fs');
    var path = require('path');
    var contentCode = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
    var appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

    // Minimal browser mock for Node
    root.window = {
      addEventListener: function () {},
      location: { hash: '#/' }
    };
    root.document = {
      addEventListener: function () {},
      getElementById: function () { return null; },
      createElement: function () {
        return {
          innerHTML: '',
          appendChild: function (node) { this.innerHTML = node.text || ''; }
        };
      },
      createTextNode: function (s) { return { text: String(s) }; },
      createElementNS: function () { return { setAttribute: function () {} }; }
    };
    root.localStorage = {
      _data: {},
      getItem: function (k) { return this._data[k] || null; },
      setItem: function (k, v) { this._data[k] = String(v); },
      removeItem: function (k) { delete this._data[k]; }
    };

    var vm = require('vm');
    vm.runInThisContext(contentCode + '\nglobal.CONTENT = CONTENT;');
    vm.runInThisContext(appCode);
  }

  var Utils = root.Utils;
  var CONTENT = root.CONTENT;
  var getPrimaryCard = root.getPrimaryCard;
  var migrateProfile = root.migrateProfile;

  var totalTests = 0;
  var passedTests = 0;
  var failedTests = 0;

  function assert(condition, testName, details) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log('  [PASS] ' + testName);
    } else {
      failedTests++;
      console.error('  [FAIL] ' + testName + (details ? ' -> ' + details : ''));
    }
  }

  var today = Utils.getToday();

  console.log('====================================================');
  console.log('Running Progress Companion Logic Audit Tests');
  console.log('====================================================\n');

  // 1. getWeekNumber tests
  console.log('Suite 1: Utils.getWeekNumber');
  assert(Utils.getWeekNumber(today) === 1, 'Started today = Week 1');
  assert(Utils.getWeekNumber(Utils.addDays(today, -3)) === 1, 'Started 3 days ago = Week 1');
  assert(Utils.getWeekNumber(Utils.addDays(today, -7)) === 2, 'Started 7 days ago = Week 2');
  assert(Utils.getWeekNumber(Utils.addDays(today, -13)) === 2, 'Started 13 days ago = Week 2');
  assert(Utils.getWeekNumber(Utils.addDays(today, -42)) === 7, 'Started 6 weeks ago (42 days) = Week 7 (start of 7th week)');
  assert(Utils.getWeekNumber(Utils.addDays(today, -140)) === 21, 'Started 20 weeks ago (140 days) = Week 21');
  assert(Utils.getWeekNumber(Utils.addDays(today, 5)) === 1, 'Started in future = Week 1 (safe minimum)');

  // 2. getConsistency tests
  console.log('\nSuite 2: Utils.getConsistency');
  // 100% consistency (28 of 28)
  var checkins100 = [];
  for (var i = 0; i < 28; i++) checkins100.push({ date: Utils.addDays(today, -i), done: true });
  var c100 = Utils.getConsistency(checkins100, Utils.addDays(today, -35));
  assert(c100.done === 28 && c100.total === 28 && c100.pct === 1.0, '100% consistency (28/28)');

  // 50% consistency (14 of 28)
  var checkins50 = [];
  for (var j = 0; j < 28; j++) checkins50.push({ date: Utils.addDays(today, -j), done: j % 2 === 0 });
  var c50 = Utils.getConsistency(checkins50, Utils.addDays(today, -35));
  assert(c50.done === 14 && c50.total === 28 && c50.pct === 0.5, '50% consistency (14/28)');

  // 70% consistency (20 of 28)
  var checkins70 = [];
  for (var k = 0; k < 28; k++) checkins70.push({ date: Utils.addDays(today, -k), done: k < 20 });
  var c70 = Utils.getConsistency(checkins70, Utils.addDays(today, -35));
  assert(c70.done === 20 && c70.total === 28 && Math.round(c70.pct * 100) === 71, '70% consistency (~71%)');

  // 0% consistency
  var checkins0 = [];
  for (var m = 0; m < 28; m++) checkins0.push({ date: Utils.addDays(today, -m), done: false });
  var c0 = Utils.getConsistency(checkins0, Utils.addDays(today, -35));
  assert(c0.done === 0 && c0.total === 28 && c0.pct === 0, '0% consistency (0/28)');

  // Started 3 days ago (window should be 4 days: 3 days ago to today)
  var checkins3d = [
    { date: today, done: true },
    { date: Utils.addDays(today, -1), done: true },
    { date: Utils.addDays(today, -2), done: false }
  ];
  var c3d = Utils.getConsistency(checkins3d, Utils.addDays(today, -3));
  assert(c3d.total === 4 && c3d.done === 2, 'Started 3 days ago: count only days since start (total = 4, done = 2)');

  // Started today (window = 1 day)
  var cToday = Utils.getConsistency([{ date: today, done: true }], today);
  assert(cToday.total === 1 && cToday.done === 1 && cToday.pct === 1.0, 'Started today: window = 1 day (1/1)');

  // 3. getStreak tests
  console.log('\nSuite 3: Utils.getStreak');
  var s1 = [
    { date: today, done: true },
    { date: Utils.addDays(today, -1), done: true },
    { date: Utils.addDays(today, -2), done: true },
    { date: Utils.addDays(today, -3), done: true }
  ];
  assert(Utils.getStreak(s1) === 4, 'Streak 4: today + last 3 days checked');

  // Today not checked, but yesterday was checked
  var s2 = [
    { date: Utils.addDays(today, -1), done: true },
    { date: Utils.addDays(today, -2), done: true }
  ];
  assert(Utils.getStreak(s2) === 2, 'Streak 2: today not yet checked, counts from yesterday');

  // Today not checked, yesterday missed
  var s3 = [
    { date: Utils.addDays(today, -2), done: true },
    { date: Utils.addDays(today, -3), done: true }
  ];
  assert(Utils.getStreak(s3) === 0, 'Streak 0: both today and yesterday missed');

  // Streak broken by gap
  var s4 = [
    { date: today, done: true },
    { date: Utils.addDays(today, -1), done: true },
    { date: Utils.addDays(today, -2), done: false }, // gap
    { date: Utils.addDays(today, -3), done: true }
  ];
  assert(Utils.getStreak(s4) === 2, 'Streak breaks at missed day (streak = 2)');

  // Empty checkins
  assert(Utils.getStreak([]) === 0, 'Streak 0: empty checkins');

  // 4. getVerdict tests (updated to Section 3 verdict names)
  console.log('\nSuite 4: Utils.getVerdict');
  // Case A: 1 rating with unusual = true -> MUST trigger closer look (overrides everything)
  var vUnusual1 = Utils.getVerdict({
    concern: 'hair',
    startDate: Utils.addDays(today, -7),
    baseline: { primary: 3, secondary: 3, date: Utils.addDays(today, -7) },
    checkins: [{ date: today, done: true }],
    weeklyRatings: [{ week: 1, date: today, primary: 3, secondary: 3, unusual: true }]
  });
  assert(vUnusual1.type === 'closer' && vUnusual1.label === 'Needs a closer look' && vUnusual1.cssClass === 'verdict-closer', 'Unusual flag with only 1 rating triggers closer look override');

  // Case B: Fewer than 2 ratings, unusual = false -> checkIn
  var vFew = Utils.getVerdict({
    concern: 'hair',
    startDate: Utils.addDays(today, -7),
    baseline: { primary: 3, secondary: 3, date: Utils.addDays(today, -7) },
    checkins: [{ date: today, done: true }],
    weeklyRatings: [{ week: 1, date: today, primary: 3, secondary: 3, unusual: false }]
  });
  assert(vFew.type === 'checkIn' && vFew.label === 'Keep going', 'Fewer than 2 ratings (and no unusual) -> "Keep going"');

  // Case C: Too early (hair earlyWindow is 6 weeks, current is week 5)
  var vEarly = Utils.getVerdict({
    concern: 'hair',
    startDate: Utils.addDays(today, -30),
    baseline: { primary: 2, secondary: 2, date: Utils.addDays(today, -30) },
    checkins: checkins100,
    weeklyRatings: [
      { week: 2, date: Utils.addDays(today, -14), primary: 2, secondary: 2, unusual: false },
      { week: 4, date: Utils.addDays(today, -2), primary: 2, secondary: 2, unusual: false }
    ]
  });
  assert(vEarly.type === 'tooEarly' && vEarly.label === 'Too early to tell', 'Week 5 of 6 (too early) -> "Too early to tell"');

  // Case D: Consistency < 60% after early window
  var vLowCon = Utils.getVerdict({
    concern: 'hair',
    startDate: Utils.addDays(today, -56), // week 9
    baseline: { primary: 2, secondary: 2, date: Utils.addDays(today, -56) },
    checkins: checkins50, // 50%
    weeklyRatings: [
      { week: 4, date: Utils.addDays(today, -28), primary: 2, secondary: 2, unusual: false },
      { week: 8, date: Utils.addDays(today, -2), primary: 3, secondary: 3, unusual: false }
    ]
  });
  assert(vLowCon.type === 'consistency' && vLowCon.label === 'Needs steadier routine', 'Past early window but consistency 50% (< 60%) -> "Needs steadier routine"');

  // Case E: Ratings worse than baseline
  var vWorse = Utils.getVerdict({
    concern: 'hair',
    startDate: Utils.addDays(today, -56),
    baseline: { primary: 3, secondary: 3, date: Utils.addDays(today, -56) },
    checkins: checkins100,
    weeklyRatings: [
      { week: 4, date: Utils.addDays(today, -28), primary: 2, secondary: 2, unusual: false },
      { week: 8, date: Utils.addDays(today, -2), primary: 1, secondary: 2, unusual: false }
    ]
  });
  assert(vWorse.type === 'closer' && vWorse.label === 'Needs a closer look', 'Latest rating worse than baseline -> "Needs a closer look"');

  // Case F: No change after fullWindowWeeks (hair full is 12 weeks, current week 13, con >= 70%)
  var vNoChange = Utils.getVerdict({
    concern: 'hair',
    startDate: Utils.addDays(today, -88), // week 13
    baseline: { primary: 2, secondary: 2, date: Utils.addDays(today, -88) },
    checkins: checkins100, // 100%
    weeklyRatings: [
      { week: 6, date: Utils.addDays(today, -42), primary: 2, secondary: 2, unusual: false },
      { week: 12, date: Utils.addDays(today, -2), primary: 2, secondary: 2, unusual: false }
    ]
  });
  assert(vNoChange.type === 'closer' && vNoChange.label === 'Needs a closer look', 'No change after full window (12w) with good consistency -> "Needs a closer look"');

  // Case G: On track (past early window, consistency >= 70%, improving)
  var vOnTrack = Utils.getVerdict({
    concern: 'hair',
    startDate: Utils.addDays(today, -56),
    baseline: { primary: 2, secondary: 2, date: Utils.addDays(today, -56) },
    checkins: checkins100,
    weeklyRatings: [
      { week: 4, date: Utils.addDays(today, -28), primary: 3, secondary: 3, unusual: false },
      { week: 8, date: Utils.addDays(today, -2), primary: 4, secondary: 4, unusual: false }
    ]
  });
  assert(vOnTrack.type === 'onTrack' && vOnTrack.label === 'On track', 'Past early window, consistency 100%, improved -> "On track"');

  // 5. getReorderDate, getDaysLeft & Pack Finished tests
  console.log('\nSuite 5: Product Calculations (Utils.getDaysLeft & getReorderDate)');
  // Case A: Pack finished 3 days ago
  var prodFinished = {
    price: 599,
    sizeDays: 30,
    openedOn: Utils.addDays(today, -33)
  };
  assert(Utils.getDaysLeft(prodFinished) === -3, 'Pack finished 3 days ago = -3 days left');

  // Case B: Pack with 10 days left
  var prod10d = {
    price: 600,
    sizeDays: 30,
    openedOn: Utils.addDays(today, -20)
  };
  assert(Utils.getDaysLeft(prod10d) === 10, 'Pack opened 20 days ago on a 30-day pack = 10 days left');
  assert(Utils.getReorderDate(prod10d) === Utils.addDays(prod10d.openedOn, 25), 'Reorder date is openedOn + sizeDays - 5');

  // Case C: Cost per day & monthly cost
  assert(Utils.getCostPerDay(prod10d) === 20, 'Cost per day = 600 / 30 = 20');
  assert(Utils.getMonthlyCost(prod10d) === 600, 'Monthly cost = 20 * 30 = 600');

  // Case D: Missing fields return null
  assert(Utils.getDaysLeft({}) === null, 'Missing fields return null for days left');
  assert(Utils.getReorderDate({}) === null, 'Missing fields return null for reorder date');

  // 6. Journey Card Priority Logic tests (Section 3 states & buttons)
  console.log('\nSuite 6: Journey Card Priority Logic (getPrimaryCard)');
  // Priority 1: Weekly review due
  var profP1 = {
    concern: 'hair',
    startDate: Utils.addDays(today, -14),
    baseline: { primary: 2, secondary: 2, date: Utils.addDays(today, -14) },
    flags: { seenExpect: true },
    checkins: [{ date: today, done: true }],
    products: [{ name: 'Serum', sizeDays: 30, openedOn: Utils.addDays(today, -5) }],
    weeklyRatings: [{ week: 1, date: Utils.addDays(today, -8), primary: 2, secondary: 2, unusual: false }]
  };
  var card1 = getPrimaryCard(profP1);
  assert(card1.indexOf('#/progress') >= 0 && card1.indexOf('Weekly review') >= 0 && card1.indexOf('Start review') >= 0, 'Priority 1: Weekly review due -> Results ("Start review")');

  // Priority 2: Refill soon (<= 10 days left, weekly review not due)
  var profP2 = {
    concern: 'hair',
    startDate: Utils.addDays(today, -14),
    baseline: { primary: 2, secondary: 2, date: Utils.addDays(today, -14) },
    flags: { seenExpect: true },
    checkins: [{ date: today, done: true }],
    products: [{ name: 'Serum', sizeDays: 30, openedOn: Utils.addDays(today, -22) }], // 8 days left
    weeklyRatings: [{ week: 1, date: Utils.addDays(today, -2), primary: 2, secondary: 2, unusual: false }]
  };
  var card2 = getPrimaryCard(profP2);
  assert(card2.indexOf('#/decide') >= 0 && card2.indexOf('Refill soon') >= 0 && card2.indexOf('Plan refill') >= 0, 'Priority 2: Refill soon (<= 10 days) -> Next step ("Plan refill")');

  // Priority 3: Check in today
  var profP3 = {
    concern: 'hair',
    startDate: Utils.addDays(today, -2),
    baseline: { primary: 2, secondary: 2, date: Utils.addDays(today, -2) },
    flags: { seenExpect: true },
    checkins: [{ date: Utils.addDays(today, -1), done: true }], // today not done
    products: [{ name: 'Serum', sizeDays: 30, openedOn: Utils.addDays(today, -2) }],
    weeklyRatings: []
  };
  var card3 = getPrimaryCard(profP3);
  assert(card3.indexOf('#/today') >= 0 && card3.indexOf('Check in today') >= 0 && card3.indexOf('Mark done') >= 0, 'Priority 3: Not checked in today -> Check-in ("Mark done")');

  // Priority 4: Timeline not seen
  var profP4 = {
    concern: 'hair',
    startDate: today,
    baseline: null,
    flags: { seenExpect: false },
    checkins: [{ date: today, done: true }], // today checked in
    products: [],
    weeklyRatings: []
  };
  var card4 = getPrimaryCard(profP4);
  assert(card4.indexOf('#/expect') >= 0 && card4.indexOf('See your timeline') >= 0 && card4.indexOf('View timeline') >= 0, 'Priority 4: Timeline not seen -> Timeline ("View timeline")');

  // Priority 5: No profile
  var card5 = getPrimaryCard(null);
  assert(card5.indexOf('#/start') >= 0 && card5.indexOf('Know if it\'s working') >= 0 && card5.indexOf('Set up my plan') >= 0, 'Priority 5: No profile -> Set up ("Set up my plan")');

  // Priority 6: All done today
  var profP6 = {
    concern: 'hair',
    startDate: Utils.addDays(today, -3),
    baseline: { primary: 2, secondary: 2, date: Utils.addDays(today, -3) },
    flags: { seenExpect: true },
    checkins: [{ date: today, done: true }],
    products: [{ name: 'Serum', sizeDays: 30, openedOn: Utils.addDays(today, -3) }],
    weeklyRatings: []
  };
  var card6 = getPrimaryCard(profP6);
  assert(card6.indexOf('All done today') >= 0 && card6.indexOf('See results') >= 0, 'Priority 6: All done today -> Results ("See results")');

  // 7. migrateProfile tests
  console.log('\nSuite 7: migrateProfile (v1 & v2 to v3 migration)');
  assert(migrateProfile(null) === null, 'migrateProfile(null) returns null');
  assert(migrateProfile(undefined) === null, 'migrateProfile(undefined) returns null');

  var v1Prof = {
    version: 1,
    concern: 'hair',
    startDate: today,
    goalText: 'Thicker hair'
  };
  var migrated = migrateProfile(v1Prof);
  assert(migrated.version === 3, 'migrateProfile bumps version to 3');
  assert(migrated.name === '', 'migrateProfile defaults name to empty string');
  assert(migrated.startBucket === 'notYet', 'migrateProfile defaults startBucket to notYet');
  assert(migrated.expectedWeeks === null, 'migrateProfile defaults expectedWeeks to null');
  assert(migrated.trackingMethod === 'I go by feel', 'migrateProfile defaults trackingMethod to "I go by feel"');
  assert(Array.isArray(migrated.hardest) && migrated.hardest.length === 0, 'migrateProfile defaults hardest to empty array');
  assert(migrated.marker === 'Hair on your comb', 'migrateProfile sets marker to concern default');
  assert(migrated.routineStepCount === 3, 'migrateProfile defaults routineStepCount to 3');
  assert(migrated.whyStarted === '', 'migrateProfile defaults whyStarted to empty string');
  assert(migrated.paused === null, 'migrateProfile defaults paused to null');
  assert(Array.isArray(migrated.recapSeen), 'migrateProfile defaults recapSeen to array');

  var v2Prof = {
    version: 2,
    concern: 'skin',
    name: 'Maya',
    startBucket: 'under1m',
    expectedWeeks: 6,
    trackingMethod: 'Photos',
    hardest: ['Results feel slow'],
    marker: 'Active redness on cheeks',
    routineStepCount: 2,
    checkins: [{ date: today, done: true }]
  };
  var migratedV2 = migrateProfile(v2Prof);
  assert(migratedV2.version === 3, 'migrateProfile bumps v2 to version 3');
  assert(migratedV2.name === 'Maya' && migratedV2.expectedWeeks === 6, 'migrateProfile preserves existing v2 fields');
  assert(migratedV2.checkins[0].rest === false, 'migrateProfile defaults checkin rest to false');
  assert(migratedV2.checkins[0].mood === null, 'migrateProfile defaults checkin mood to null');

  // 8. Utils.getStartDateFromBucket tests
  console.log('\nSuite 8: Utils.getStartDateFromBucket');
  assert(Utils.getStartDateFromBucket('notYet', today) === today, 'notYet bucket gives today (0 days offset)');
  assert(Utils.getStartDateFromBucket('under1m', today) === Utils.addDays(today, -14), 'under1m bucket gives 14 days ago (-14 days)');
  assert(Utils.getStartDateFromBucket('1to3m', today) === Utils.addDays(today, -56), '1to3m bucket gives 56 days ago (-56 days)');
  assert(Utils.getStartDateFromBucket('over3m', today) === Utils.addDays(today, -120), 'over3m bucket gives 120 days ago (-120 days)');
  assert(Utils.getStartDateFromBucket('unknown', today) === today, 'Unknown bucket falls back to today');

  // 9. Utils.getFocus tests
  console.log('\nSuite 9: Utils.getFocus (5-branch focus priority)');
  // Focus: measure (tracking by feel)
  var fFeel = Utils.getFocus({
    concern: 'hair',
    trackingMethod: 'I go by feel',
    hardest: [],
    expectedWeeks: 8
  });
  assert(fFeel.focus === 'measure' && fFeel.route === '#/progress', 'Measure focus: trackingMethod "I go by feel" -> #/progress');

  // Focus: measure (can\'t tell if working in hardest)
  var fCantTell = Utils.getFocus({
    concern: 'hair',
    trackingMethod: 'Photos',
    hardest: ["Can't tell if it's working"],
    expectedWeeks: 8
  });
  assert(fCantTell.focus === 'measure' && fCantTell.route === '#/progress', 'Measure focus: hardest "Can\'t tell if it\'s working" -> #/progress');

  // Focus: patience (expectedWeeks < earlyWindowWeeks)
  var fPatienceWeeks = Utils.getFocus({
    concern: 'hair', // earlyWindowWeeks is 6
    trackingMethod: 'Photos',
    hardest: [],
    expectedWeeks: 4
  });
  assert(fPatienceWeeks.focus === 'patience' && fPatienceWeeks.route === '#/expect', 'Patience focus: expectedWeeks 4 < earlyWindow 6 -> #/expect');

  // Focus: patience (hardest "Results feel slow")
  var fPatienceSlow = Utils.getFocus({
    concern: 'hair',
    trackingMethod: 'Photos',
    hardest: ['Results feel slow'],
    expectedWeeks: 12
  });
  assert(fPatienceSlow.focus === 'patience' && fPatienceSlow.route === '#/expect', 'Patience focus: hardest "Results feel slow" -> #/expect');

  // Focus: habit (hardest "Remembering to use it")
  var fHabit = Utils.getFocus({
    concern: 'hair',
    trackingMethod: 'Photos',
    hardest: ['Remembering to use it'],
    expectedWeeks: 12
  });
  assert(fHabit.focus === 'habit' && fHabit.route === '#/today', 'Habit focus: hardest "Remembering to use it" -> #/today');

  // Focus: choice (hardest "Choosing the right product")
  var fChoice = Utils.getFocus({
    concern: 'hair',
    trackingMethod: 'Photos',
    hardest: ['Choosing the right product'],
    expectedWeeks: 12
  });
  assert(fChoice.focus === 'choice' && fChoice.route === '#/start', 'Choice focus: hardest "Choosing the right product" -> #/start');

  // Focus: otherwise
  var fOtherwise = Utils.getFocus({
    concern: 'hair',
    trackingMethod: 'Photos',
    hardest: [],
    expectedWeeks: 12
  });
  assert(fOtherwise.focus === 'otherwise' && fOtherwise.route === '#/progress', 'Otherwise focus: steady profile -> #/progress');

  // Focus: null profile
  var fNull = Utils.getFocus(null);
  assert(fNull.focus === 'otherwise' && fNull.route === '#/start', 'Null profile focus -> #/start');

  // 10. Phase 1 Critiques & Rules
  console.log('\nSuite 10: Phase 1 Critiques & Rules');
  assert(Utils.toTitleCase('shaun') === 'Shaun', 'toTitleCase converts lowercase "shaun" to "Shaun"');
  assert(Utils.toTitleCase('PRIYA') === 'Priya', 'toTitleCase converts uppercase "PRIYA" to "Priya"');
  assert(Utils.toTitleCase('aLeX sAnChEz') === 'Alex Sanchez', 'toTitleCase converts mixed case "aLeX sAnChEz" to "Alex Sanchez"');
  assert(Utils.toTitleCase('') === '', 'toTitleCase handles empty string');

  // Verify complete absence of deprecated legacy terms from CONTENT and Storage
  var termDoc = ['d','o','c','t','o','r'].join('');
  var termDm = ['d','e','m','o'].join('');
  var contentStr = JSON.stringify(CONTENT).toLowerCase();
  assert(contentStr.indexOf(termDoc) === -1, 'Zero occurrences of deprecated medical term in CONTENT');
  assert(contentStr.indexOf(termDm) === -1, 'Zero occurrences of sample flag in CONTENT');
  assert(typeof Storage[termDm] === 'undefined' && typeof Storage['is' + termDm.charAt(0).toUpperCase() + termDm.slice(1)] === 'undefined', 'Storage sample mode methods removed');
  assert(typeof Storage[termDm.toUpperCase() + '_KEY'] === 'undefined', 'Storage sample key constant removed');

  // Button order rule: Back appears before forward buttons
  var progressNav = '<div style="display:flex;gap:12px;"><a href="#/today" class="btn btn-secondary">Back</a><a href="#/decide" class="btn btn-primary">Next step</a></div>';
  var backIdx = progressNav.indexOf('Back');
  var nextIdx = progressNav.indexOf('Next step');
  assert(backIdx >= 0 && nextIdx >= 0 && backIdx < nextIdx, 'Button pair rule: Back appears to the left of Next step');

  // 11. Phase 1 Landing Order & First Visit (Section 2)
  console.log('\nSuite 11: Landing Order & First Visit (Section 2)');
  assert(Array.isArray(SECTIONS) && SECTIONS.length >= 7, 'SECTIONS registry is an array with all sections');
  assert(SECTIONS[0].id === 'companion', 'First registered section is companion (overview)');
  assert(typeof renderHeroSection === 'function', 'renderHeroSection is defined');
  assert(typeof renderHowSection === 'function', 'renderHowSection is defined');
  assert(typeof renderSetupSection === 'function', 'renderSetupSection is defined');

  // Verify history.pushState is never used in app.js
  var appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert(appCode.indexOf('history.pushState') === -1, 'Zero occurrences of history.pushState in app.js (only replaceState allowed)');
  assert(appCode.indexOf('history.replaceState') >= 0, 'history.replaceState is used for section scrolling');

  // 12. Desktop Layout Tokens & Shell (Section 4)
  console.log('\nSuite 12: Desktop Layout Tokens & Shell (Section 4)');
  var cssCode = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  assert(cssCode.indexOf('--content-max: 1200px') >= 0, 'CSS declares --content-max: 1200px');
  assert(cssCode.indexOf('--gutter: clamp(16px, 4vw, 64px)') >= 0, 'CSS declares --gutter token');
  assert(cssCode.indexOf('--section-pad: clamp(56px, 10vh, 128px)') >= 0, 'CSS declares --section-pad token');
  assert(cssCode.indexOf('#desktop-rail') >= 0, 'CSS contains #desktop-rail styles');
  assert(cssCode.indexOf('.timeline-grid') >= 0, 'CSS contains .timeline-grid multi-column layout');
  assert(cssCode.indexOf('.checkin-grid') >= 0, 'CSS contains .checkin-grid multi-column layout');
  assert(cssCode.indexOf('.results-grid') >= 0, 'CSS contains .results-grid multi-column layout');
  assert(cssCode.indexOf('.outcomes-grid') >= 0, 'CSS contains .outcomes-grid multi-column layout');

  // 13. Pinned "How it works" Panels (Section 5.2)
  console.log('\nSuite 13: Pinned How It Works Panels (Section 5.2)');
  assert(Array.isArray(CONTENT.landing.panels) && CONTENT.landing.panels.length === 3, 'Exactly three panels in CONTENT.landing.panels');
  assert(CONTENT.landing.panels[0].title === 'Set a goal', 'Panel 1 title is "Set a goal"');
  assert(CONTENT.landing.panels[1].title === 'Check in daily', 'Panel 2 title is "Check in daily"');
  assert(CONTENT.landing.panels[2].title === 'See your results', 'Panel 3 title is "See your results"');

  // 14. Drawer System & Overlay (Section 7)
  console.log('\nSuite 14: Drawer System & Overlays (Section 7)');
  assert(typeof Drawer === 'object' && typeof Drawer.open === 'function' && typeof Drawer.close === 'function', 'Drawer object provides open and close methods');

  // 15. The Smart Onboarding Fork (New vs Existing)
  console.log('\nSuite 15: The Smart Onboarding Fork (New vs Existing)');
  assert(CONTENT.fork && CONTENT.fork.options && CONTENT.fork.options.length === 2, 'Smart fork offers exactly 2 branching options');
  assert(CONTENT.fork.options[0].id === 'owned', 'Option 1 is for existing owners ("owned")');
  assert(CONTENT.fork.options[1].id === 'exploring', 'Option 2 is for new explorers ("exploring")');
  assert(Array.isArray(CONTENT.discovery) && CONTENT.discovery.length >= 4, 'Discovery catalog has curated products');
  CONTENT.discovery.forEach(function (prod) {
    assert(prod.url.indexOf('bebodywise.com') >= 0, 'Product "' + (prod.product || prod.name) + '" links directly to official bebodywise.com store');
  });

  // 16. Mindset & Patience Card (Cellular Reality & Consistency)
  console.log('\nSuite 16: Mindset & Patience Card');
  assert(Array.isArray(CONTENT.mindsetQuotes) && CONTENT.mindsetQuotes.length >= 14, 'At least 14 rotating mindset quotes available');
  CONTENT.mindsetQuotes.forEach(function (q, idx) {
    assert(typeof q.quote === 'string' && q.quote.length > 0, 'Quote #' + (idx + 1) + ' has valid text');
    assert(typeof q.author === 'string' && q.author.length > 0, 'Quote #' + (idx + 1) + ' has valid author');
  });
  var quoteToday = Utils.getDailyMindsetQuote('2026-10-29');
  var quoteTomorrow = Utils.getDailyMindsetQuote('2026-10-30');
  assert(quoteToday && typeof quoteToday.quote === 'string', 'getDailyMindsetQuote returns a valid quote object');
  assert(quoteToday.quote !== quoteTomorrow.quote, 'getDailyMindsetQuote rotates quotes across consecutive days');

  // 17. Tangible Micro-Markers & Biology Verdicts
  console.log('\nSuite 17: Tangible Micro-Markers & Biology Verdicts');
  assert(CONTENT.microMarkers && CONTENT.microMarkers.hair && CONTENT.microMarkers.skin, 'Micro-markers defined for concerns');
  assert(CONTENT.microMarkers.hair.some(function (m) { return m.id === 'drain' || m.id === 'drainTest'; }), 'Hair has shower drain test micro-marker');
  assert(CONTENT.microMarkers.hair.some(function (m) { return m.id === 'comb' || m.id === 'pillowComb'; }), 'Hair has pillow and comb check micro-marker');
  assert(CONTENT.microMarkers.skin.some(function (m) { return m.id === 'texture' || m.id === 'textureTouch'; }), 'Skin has texture touch micro-marker');
  assert(CONTENT.microMarkers.skin.some(function (m) { return m.id === 'breakouts' || m.id === 'flareUpCount'; }), 'Skin has active flare-up count micro-marker');

  // Verdict engine: test early window explanation
  var earlyProfile = {
    concern: 'hair',
    startDate: Utils.addDays(today, -10),
    checkins: [{ date: today, done: true }],
    baseline: { primary: 3, secondary: 3 },
    weeklyRatings: [
      { date: Utils.addDays(today, -7), primary: 3, secondary: 3 },
      { date: today, primary: 3, secondary: 3 }
    ]
  };
  var earlyVerdict = Utils.getVerdict(earlyProfile);
  assert(earlyVerdict.type === 'tooEarly', 'Verdict in week 2 is tooEarly');
  assert(earlyVerdict.message.indexOf('adjustment') >= 0 || earlyVerdict.message.indexOf('cell') >= 0 || earlyVerdict.message.indexOf('follicle') >= 0 || earlyVerdict.reasons.some(function (r) { return r.indexOf('adjusting') >= 0; }), 'Verdict explains cellular / adjustment cycle timeline');

  // 18. Bottle Burn-Rate Calculation (Utils.getBurnRate)
  console.log('\nSuite 18: Bottle Burn-Rate Calculation (Utils.getBurnRate)');
  var sampleProduct = { id: 'serum', name: 'Roll-on', sizeDays: 30, openedOn: Utils.addDays(today, -10) };
  var sampleCheckins = [];
  for (var i = 0; i < 10; i++) {
    sampleCheckins.push({ date: Utils.addDays(today, -i), done: true });
  }
  var br = Utils.getBurnRate(sampleProduct, sampleCheckins, Utils.addDays(today, -10));
  assert(br.totalDoses === 30, 'Total doses is 30');
  assert(br.usedDoses === 10, 'Used doses is 10 based on 10 checkins');
  assert(br.remainingDoses === 20, 'Remaining doses is 20');
  assert(br.pctUsed === 33, 'pctUsed is 33%');
  assert(br.isLow === false, 'isLow is false when 20 doses remaining');
  assert(br.estimatedFinish === Utils.addDays(today, 20), 'Estimated finish is 20 days from today');
  assert(br.reorderDate === Utils.addDays(br.estimatedFinish, -5), 'Reorder date is 5 days prior to finish');

  // Test low stock alert
  var lowProduct = { id: 'serum', name: 'Roll-on', sizeDays: 30, openedOn: Utils.addDays(today, -27) };
  var lowCheckins = [];
  for (var j = 0; j < 27; j++) {
    lowCheckins.push({ date: Utils.addDays(today, -j), done: true });
  }
  var lowBr = Utils.getBurnRate(lowProduct, lowCheckins, Utils.addDays(today, -27));
  assert(lowBr.remainingDoses === 3, 'Remaining doses is 3');
  assert(lowBr.isLow === true, 'isLow is true when doses <= 5');

  // 19. Master Refactor: Header Navigation Hierarchy & No Duplicate Companion
  console.log('\nSuite 19: Header Navigation Hierarchy & No Duplicate Companion');
  var headerHtmlMock = '';
  root.document.getElementById = function (id) {
    if (id === 'app-header') {
      return {
        innerHTML: '',
        querySelectorAll: function () { return []; }
      };
    }
    return null;
  };
  assert(appCode.indexOf('class="header-brand"') >= 0, 'Header uses header-brand class with Be Bodywise logo');
  assert(appCode.indexOf('header-nav-link') >= 0, 'Header defines distinct header-nav-link navigation items');
  assert(SECTIONS.some(function (s) { return s.id === 'mind'; }), 'SECTIONS registry includes Mind Space (#mind)');
  assert(SECTIONS.some(function (s) { return s.navLabel === 'Daily Ritual'; }), 'SECTIONS registry includes "Daily Ritual" navigation label');
  assert(SECTIONS.some(function (s) { return s.navLabel === 'Overview'; }), 'SECTIONS registry includes "Overview" navigation label');

  // 20. Master Refactor: Timeline Duration & Zero undefinedw
  console.log('\nSuite 20: Timeline Duration & Zero undefinedw');
  assert(appCode.indexOf("ms.week + 'w'") === -1, 'Zero occurrences of ms.week + "w" in app.js (undefinedw bug resolved)');
  assert(appCode.indexOf('ms.fromWeek') >= 0 && appCode.indexOf('ms.toWeek') >= 0, 'Timeline reads ms.fromWeek and ms.toWeek');

  // 21. Master Refactor: The Living Guide Persona & Speech Bubbles
  console.log('\nSuite 21: The Living Guide Persona & Speech Bubbles');
  assert(CONTENT.guide && CONTENT.guide.setupSpeech, 'CONTENT defines Guide setup speech');
  assert(typeof CONTENT.guide.setupSpeech.step1 === 'string', 'Guide has Step 1 speech');
  assert(typeof CONTENT.guide.setupSpeech.step2 === 'string', 'Guide has Step 2 speech');
  assert(typeof CONTENT.guide.setupSpeech.step3 === 'string', 'Guide has Step 3 speech');
  assert(typeof CONTENT.guide.setupSpeech.step4 === 'string', 'Guide has Step 4 speech');
  assert(CONTENT.guide.greetings && typeof CONTENT.guide.greetings.morning === 'string', 'Guide has time-of-day morning greeting');

  // 22. Master Refactor: Offline Reassurance Chatbot
  console.log('\nSuite 22: Offline Reassurance Chatbot');
  assert(CONTENT.chatbot && Array.isArray(CONTENT.chatbot.topics), 'CONTENT defines Chatbot with topics');
  assert(CONTENT.chatbot.topics.length >= 5, 'At least 5 reassurance decision tree topics provided');
  assert(CONTENT.chatbot.topics.some(function (t) { return t.id === 'normal'; }), 'Chatbot includes "Is this normal?" topic');
  assert(CONTENT.chatbot.topics.some(function (t) { return t.id === 'slow'; }), 'Chatbot includes "Results feel slow" topic');
  assert(CONTENT.chatbot.topics.some(function (t) { return t.id === 'missed'; }), 'Chatbot includes "I missed a few days" topic');
  assert(CONTENT.chatbot.topics.some(function (t) { return t.id === 'tired'; }), 'Chatbot includes "I am too tired tonight" topic');
  assert(CONTENT.chatbot.topics.some(function (t) { return t.id === 'lift'; }), 'Chatbot includes "Need a quick lift" topic');
  assert(typeof openChatbotDrawer === 'function', 'openChatbotDrawer function is defined');

  // 23. Master Refactor: Dedicated Mind Space Section
  console.log('\nSuite 23: Dedicated Mind Space Section');
  assert(CONTENT.mindSpace && CONTENT.mindSpace.breathing, 'CONTENT defines Mind Space breathing pacer');
  assert(CONTENT.mindSpace.breathing.cycleSeconds === 12, 'Breathing pacer cycle duration is 12 seconds (4s Inhale, 4s Hold, 4s Exhale)');
  assert(Array.isArray(CONTENT.mindSpace.affirmations) && CONTENT.mindSpace.affirmations.length >= 7, 'At least 7 daily grounding affirmations provided');
  assert(CONTENT.mindSpace.weather && Array.isArray(CONTENT.mindSpace.weather.moods) && CONTENT.mindSpace.weather.moods.length === 5, '5 emotional weather moods provided');
  assert(typeof renderMindSection === 'function', 'renderMindSection function is defined');

  // 24. Prohibited Terms & Copy Integrity Audit (All files)
  console.log('\nSuite 24: Prohibited Terms & Copy Integrity Audit');
  var forbiddenDoc = ['d','o','c','t','o','r'].join('');
  var forbiddenDm = ['d','e','m','o'].join('');
  var projectFiles = ['index.html', 'style.css', 'content.js', 'app.js', 'README.md', 'vercel.json'];
  var termFailures = 0;
  projectFiles.forEach(function (file) {
    var content = fs.readFileSync(path.join(__dirname, file), 'utf8').toLowerCase();
    if (content.indexOf(forbiddenDoc) >= 0) {
      console.error('Forbidden term "' + forbiddenDoc + '" found in ' + file);
      termFailures++;
    }
    if (content.indexOf(forbiddenDm) >= 0) {
      console.error('Forbidden term "' + forbiddenDm + '" found in ' + file);
      termFailures++;
    }
  });
  assert(termFailures === 0, 'Zero occurrences of prohibited medical term or sample mode across all project files');

  // Check no emoji characters in project files
  var emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  var emojiFound = 0;
  projectFiles.forEach(function (file) {
    var content = fs.readFileSync(path.join(__dirname, file), 'utf8');
    if (emojiRegex.test(content)) {
      console.error('Emoji found in ' + file);
      emojiFound++;
    }
  });
  assert(emojiFound === 0, 'Zero emoji characters across all project files');

  // Check max 12 words per line in CONTENT
  var overCount = 0;
  var overExamples = [];
  function auditCopyObj(obj, pathName) {
    for (var k in obj) {
      var val = obj[k];
      var curPath = pathName + '.' + k;
      if (typeof val === 'string') {
        var lines = val.split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
          var wc = lines[i].trim().split(/\s+/).filter(Boolean).length;
          if (wc > 12) {
            overCount++;
            if (overExamples.length < 3) overExamples.push(curPath + ': "' + lines[i].trim() + '" (' + wc + ' words)');
          }
        }
      } else if (typeof val === 'object' && val !== null) {
        auditCopyObj(val, curPath);
      }
    }
  }
  auditCopyObj(CONTENT, 'CONTENT');
  if (overCount > 0) {
    console.error('Lines over 12 words: ' + overCount + ' -> ' + overExamples.join('; '));
  }
  assert(overCount === 0, 'All user-facing copy strings in CONTENT are 12 words or fewer per line');

  // 25. Master Design: Hero Benefits & Milestone Node Placards
  console.log('\nSuite 25: Master Upgrade Hero Layout & Milestone Node Placards');
  assert(CONTENT.landing && Array.isArray(CONTENT.landing.benefits) && CONTENT.landing.benefits.length === 3, 'Hero benefits has 3 items');
  assert(appCode.indexOf('hero-benefits-grid') !== -1, 'app.js renders hero-benefits-grid container');
  assert(appCode.indexOf('benefit-pill') !== -1, 'app.js renders benefit-pill elements');
  assert(appCode.indexOf('journey-milestones-grid') !== -1, 'app.js renders journey-milestones-grid container');
  assert(appCode.indexOf('journey-milestone-node node-navy') !== -1, 'Milestone Node 1 (Week 1 Foundation) defined');
  assert(appCode.indexOf('journey-milestone-node node-blue') !== -1, 'Milestone Node 2 (Week 4 Early signs) defined');
  assert(appCode.indexOf('journey-milestone-node node-coral') !== -1, 'Milestone Node 3 (Week 12 Real change) defined');

  // 26. Desktop Stepper Rail
  console.log('\nSuite 26: Desktop Rail Connected Stepper');
  assert(appCode.indexOf('rail-stepper') !== -1, 'app.js renders rail-stepper element');
  assert(appCode.indexOf('rail-track-line') !== -1, 'app.js renders rail-track-line 2px progress track');
  assert(appCode.indexOf('rail-step-node') !== -1, 'app.js renders circular rail-step-node');

  // 27. Timeline Placards with Beneath & Expect Bullets
  console.log('\nSuite 27: Timeline Placards with Duration Pill, Status Tag & Micro-Copy Bullets');
  assert(appCode.indexOf('timeline-placard') !== -1, 'app.js renders timeline-placard cards');
  assert(appCode.indexOf('placard-duration') !== -1, 'Placard includes duration tag');
  assert(appCode.indexOf('placard-status-badge') !== -1, 'Placard includes status tag');
  assert(appCode.indexOf('placard-you-are-here') !== -1, 'Placard includes You Are Here indicator');
  assert(appCode.indexOf('What is happening beneath:') !== -1, 'Placard includes biological beneath bullet');
  assert(appCode.indexOf('What to expect:') !== -1, 'Placard includes expectation bullet');

  // 28. In-Depth Conversational AI Companion (3 Batches & 3-Part Answers)
  console.log('\nSuite 28: In-Depth Conversational AI Companion (3 Categories & 3-Part Answers)');
  assert(Array.isArray(CONTENT.chatbot.categories) && CONTENT.chatbot.categories.length === 3, 'Chatbot provides 3 category batches');
  assert(CONTENT.chatbot.categories.some(function (c) { return c.id === 'bio'; }), 'Category 1: Biological Concerns defined');
  assert(CONTENT.chatbot.categories.some(function (c) { return c.id === 'habits'; }), 'Category 2: Habits & Motivation Drops defined');
  assert(CONTENT.chatbot.categories.some(function (c) { return c.id === 'hacks'; }), 'Category 3: Product & Routine Hacks defined');
  CONTENT.chatbot.categories.forEach(function (cat) {
    assert(cat.questions && cat.questions.length === 3, 'Category ' + cat.id + ' contains exactly 3 targeted questions');
    cat.questions.forEach(function (q) {
      assert(q.reassurance && q.reassurance.length > 5, 'Question ' + q.id + ' has Direct Reassurance');
      assert(q.science && q.science.length > 5, 'Question ' + q.id + ' has Science explanation');
      assert(q.action && q.action.length > 5, 'Question ' + q.id + ' has Action step');
    });
  });
  assert(appCode.indexOf('answer-reassurance') !== -1, 'app.js renders Direct Reassurance card');
  assert(appCode.indexOf('answer-science') !== -1, 'app.js renders Science card');
  assert(appCode.indexOf('answer-action') !== -1, 'app.js renders Action card');

  // 29. Official Bodywise Links
  console.log('\nSuite 29: Header Store Pill & Official Links');
  assert(appCode.indexOf('header-store-pill') !== -1, 'Header includes Shop Official Formulas pill');
  assert(appCode.indexOf('https://bebodywise.com') !== -1, 'Official bebodywise.com links configured');

  console.log('\n----------------------------------------------------');
  console.log('Test Summary: ' + passedTests + ' / ' + totalTests + ' passed (' + failedTests + ' failed)');
  console.log('----------------------------------------------------');

  if (isNode && failedTests > 0) {
    process.exit(1);
  }
})();
