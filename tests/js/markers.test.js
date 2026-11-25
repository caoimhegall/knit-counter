import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    emptyState, addProject, bump, setPattern, setMarkers, setTotalStitches,
    parseRow, parseStitches, parseMarkers, planRow, tapAt, stitchesUsed,
    sectionsNow, needlesNow, stitchLabel,
} from '../../resources/js/counter.js';

// The knitter's raglan, typed close to how the pattern words it.
const ROUND_1 = '*k to next marker, M1R, slip marker, k2, slip marker, M1L* four times in total, k to BOR';
const raglan = [
    { side: '', stitches: ROUND_1, rows: 1 },
    { side: '', stitches: 'k', rows: 1 },
];
// 8 markers + BOR: 9 stretches of stitches, counted from BOR.
const START = [10, 2, 6, 2, 20, 2, 6, 2, 10];

test('parseRow understands markers, "to marker", "to end" and groups', () => {
    assert.deepEqual(parseRow('k to m, sm, k2'), [{ st: 'k', to: 'm' }, { sm: true }, { st: 'k' }, { st: 'k' }]);
    assert.deepEqual(parseRow('k to end'), [{ st: 'k', to: 'end' }]);
    assert.deepEqual(parseRow('p to bor marker'), [{ st: 'p', to: 'end' }]);
    assert.equal(parseRow('(k1 sm) x3').length, 6);
    assert.equal(parseRow('[k1, p1] 2 times').length, 4);
    assert.equal(parseRow('*k2* twice').length, 4);
    assert.equal(parseRow(ROUND_1).length, 7 * 4 + 1);
});

test('parseRow rejects what it does not understand', () => {
    assert.equal(parseRow('k to the moon'), null);
    assert.equal(parseRow('(k1 p1 x2'), null);
    assert.equal(parseRow('m1 to m'), null);   // an increase can't go "to marker"
    assert.equal(parseRow('*k2* lots of times'), null);
});

test('simple rows are still simple; marker rows are not', () => {
    assert.deepEqual(parseStitches('(k1 p1) x2'), ['k', 'p', 'k', 'p']);
    assert.equal(parseStitches('k to m'), null);
});

test('parseMarkers', () => {
    assert.deepEqual(parseMarkers('10 2 6, 2'), [10, 2, 6, 2]);
    assert.equal(parseMarkers(''), null);
    assert.equal(parseMarkers('10 two'), undefined);
    assert.equal(parseMarkers('40'), undefined);
    // Phone keyboards: whatever separator is easiest to reach.
    assert.deepEqual(parseMarkers('10.2.6.2'), [10, 2, 6, 2]);
    assert.deepEqual(parseMarkers('10-2-6/2'), [10, 2, 6, 2]);
    assert.deepEqual(parseMarkers(' 10, 2, '), [10, 2]);
});

test('the raglan round: k to each marker, increase either side of the seams', () => {
    const plan = planRow(raglan, 0, null, START);
    assert.equal(plan.fixed, true);
    assert.deepEqual(tapAt(plan, 0), { st: 'k', toGo: 10, to: 'm' });
    assert.deepEqual(tapAt(plan, 9), { st: 'k', toGo: 1, to: 'm' });
    assert.equal(tapAt(plan, 10).st, 'm1r');
    assert.equal(tapAt(plan, 11).st, 'sm');
    assert.equal(tapAt(plan, 12).st, 'k');
    assert.equal(tapAt(plan, 14).st, 'sm');
    assert.equal(tapAt(plan, 15).st, 'm1l');
    assert.deepEqual(tapAt(plan, 16), { st: 'k', toGo: 6, to: 'm' });
    assert.equal(plan.taps.length, 52 + 8 + 8 + 8);
    assert.equal(tapAt(plan, plan.taps.length), null);          // round done
    assert.equal(tapAt(plan, plan.taps.length - 1).toGo, 1);    // last k to BOR
    assert.deepEqual(plan.end, [11, 2, 8, 2, 22, 2, 8, 2, 11]); // +8 stitches
    assert.equal(stitchLabel('sm'), 'slip marker');
});

test('stitchesUsed: markers and increases use no stitches', () => {
    assert.equal(stitchesUsed(raglan, 0, 12, null, START), 10);   // k×10, m1r, sm
    assert.equal(stitchesUsed(raglan, 0, 76, null, START), 60);
});

test('every increase round makes the stretches between markers longer', () => {
    let s = addProject(emptyState(), 'Raglan');
    const id = s.projects[0].id;
    s = setMarkers(setPattern(s, id, raglan, 19), id, START);
    assert.equal(needlesNow(s.projects[0]), 60);
    s = bump(bump(s, id, 'rows', 1), id, 'rows', 1);
    assert.deepEqual(sectionsNow(s.projects[0]), [11, 2, 8, 2, 22, 2, 8, 2, 11]);
    s = bump(bump(s, id, 'rows', 1), id, 'rows', 1);
    assert.equal(needlesNow(s.projects[0]), 76);
    // Next "k to marker" knows the first stretch is now 12.
    const p = s.projects[0];
    assert.deepEqual(tapAt(planRow(p.pattern, p.rows, p.repeats, sectionsNow(p)), 0), { st: 'k', toGo: 12, to: 'm' });
    // After all 19 repeats: 60 + 19 × 8.
    for (let i = 4; i < 38; i++) s = bump(s, id, 'rows', 1);
    assert.equal(needlesNow(s.projects[0]), 60 + 19 * 8);
});

test('a plain count replaces the markers', () => {
    let s = addProject(emptyState(), 'X');
    const id = s.projects[0].id;
    s = setTotalStitches(setMarkers(s, id, START), id, 30);
    assert.equal(s.projects[0].markers, null);
    assert.equal(needlesNow(s.projects[0]), 30);
});

test('a marker row without marker counts asks for them', () => {
    assert.deepEqual(planRow(raglan, 0, null, null), { fixed: true, taps: null, end: null });
});
