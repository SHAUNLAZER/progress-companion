/* Unit tests for bodymap.js logic. Run: node test-bodymap.js */
var fs = require('fs'), path = require('path'), vm = require('vm');
global.window = { addEventListener: function () {}, location: { hash: '#/' } };
global.document = { addEventListener: function () {}, getElementById: function () { return null; },
  createElement: function () { return { innerHTML: '', appendChild: function () {} }; },
  createTextNode: function (s) { return { text: String(s) }; }, createElementNS: function () { return { setAttribute: function () {} }; } };
global.localStorage = { _d: {}, getItem: function (k) { return this._d[k] || null; }, setItem: function (k, v) { this._d[k] = String(v); }, removeItem: function (k) { delete this._d[k]; } };
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8') + '\nglobal.CONTENT = CONTENT;');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'));
global.Utils = global.window.Utils; global.Storage = global.window.Storage;
var BM = require('./bodymap.js');
var pass = 0, fail = 0;
function ok(c, n) { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.error('  [FAIL] ' + n); } }

console.log('Body map logic');
var concerns = Object.keys(CONTENT.concerns);
ok(concerns.every(function (c) { return BM.REGIONS.some(function (r) { return r.id === c; }); }), 'every concern has a region');
ok(BM.getRegion('nonsense').id === 'wellness', 'unknown concern falls back to wellness');
BM.REGIONS.forEach(function (r) {
  var b = BM.getZoomBox(r.id);
  ok(b[0] >= -50 && b[1] >= -50 && b[0] + b[2] <= 500 && b[1] + b[3] <= 500, r.id + ' zoom box stays near the figure');
  ok(r.pin[0] > 0 && r.pin[0] < 447 && r.pin[1] > 0 && r.pin[1] < 447, r.id + ' pin is inside the figure box');
});
ok(BM.ease(0) === 0 && BM.ease(1) === 1 && BM.ease(0.5) === 0.5, 'ease endpoints and midpoint');
ok(BM.ease(-1) === 0 && BM.ease(2) === 1, 'ease clamps');
var mid = BM.lerpBox([0, 0, 100, 100], [50, 50, 20, 20], 0.5);
ok(mid[0] === 25 && mid[2] === 60, 'lerpBox midpoint');

var today = Utils.getToday();
var prof = { concern: 'hair', startDate: Utils.addDays(today, -9), paused: null,
  checkins: [0, 1, 2, 4].map(function (i) { return { date: Utils.addDays(today, -i), done: true, rest: false }; }) };
var st = BM.getRegionState(prof, 'hair');
ok(st.active && st.pct > 0 && st.pct <= 1, 'active region has consistency');
ok(st.streak === 3, 'streak counts consecutive days (3)');
ok(st.day === 10 && st.week === 2, 'day and week derived from start date');
ok(st.checkedIn === true, 'checked-in flag from today');
var other = BM.getRegionState(prof, 'pcos');
ok(!other.active && other.pct === 0, 'other regions are not tracking');
ok(!BM.getRegionState(null, 'hair').active, 'no profile means nothing active');

console.log('\n' + pass + ' / ' + (pass + fail) + ' passed');
if (fail) process.exit(1);
