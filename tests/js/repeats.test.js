import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    emptyState, addProject, bump, resetCounter, setPattern, setTotalStitches,
    stepForRow, nextStitch, patternDone, needlesNow, loadState,
} from '../../resources/js/counter.js';

// Row 1: k2 m1r for 1 row; row 2: knit around. Worked 25 times = 50 rows.
const pattern = [
    { side: '', stitches: 'k2 m1r', rows: 1 },
    { side: '', stitches: 'k', rows: 1 },
];

test('stepForRow reports which repeat you are on', () => {
    assert.deepEqual(stepForRow(pattern, 0, 25), { index: 0, step: pattern[0], repeat: 1 });
    assert.equal(stepForRow(pattern, 1, 25).index, 1);
    assert.equal(stepForRow(pattern, 4, 25).repeat, 3);
    assert.equal(stepForRow(pattern, 49, 25).repeat, 25);
});

test('the pattern stops after its repeats', () => {
    assert.equal(patternDone(pattern, 49, 25), false);
    assert.equal(patternDone(pattern, 50, 25), true);
    assert.equal(stepForRow(pattern, 50, 25), null);
    assert.equal(nextStitch(pattern, 50, 0, 25), null);
});

test('no repeat count means it repeats forever', () => {
    assert.equal(patternDone(pattern, 5000, null), false);
    assert.equal(stepForRow(pattern, 5000).repeat, 2501);
});

const project = (state) => state.projects[0];

test('needle count grows with each increase row', () => {
    let s = addProject(emptyState(), 'Hat');
    const id = project(s).id;
    s = setTotalStitches(setPattern(s, id, pattern, 25), id, 40);
    assert.equal(needlesNow(project(s)), 40);
    s = bump(s, id, 'rows', 1);          // after row 1 (k2 m1r x20)
    assert.equal(needlesNow(project(s)), 60);
    s = bump(s, id, 'rows', 1);          // after row 2 (plain)
    assert.equal(needlesNow(project(s)), 60);
    s = bump(s, id, 'rows', -1);         // going back undoes it
    s = bump(s, id, 'rows', -1);
    assert.equal(needlesNow(project(s)), 40);
});

test('the entered count counts from the row it was entered on', () => {
    let s = addProject(emptyState(), 'Hat');
    const id = project(s).id;
    s = setPattern(s, id, pattern, 25);
    s = bump(bump(s, id, 'rows', 1), id, 'rows', 1);
    s = setTotalStitches(s, id, 60);
    assert.equal(needlesNow(project(s)), 60);
    s = bump(s, id, 'rows', 1);
    assert.equal(needlesNow(project(s)), 90);
    s = resetCounter(s, id, 'rows');
    assert.equal(needlesNow(project(s)), 60);
});

test('older saves load with forever repeats and their count kept', () => {
    const storage = { getItem: () => JSON.stringify({
        projects: [{ id: 'a', name: 'Old', rows: 7, stitches: 0, pattern, totalStitches: 40 }],
        currentId: 'a',
    }) };
    const p = loadState(storage).projects[0];
    assert.equal(p.repeats, null);
    assert.equal(p.totalAtRow, 7);
    assert.equal(needlesNow(p), 40);
});
