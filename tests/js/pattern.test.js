import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    emptyState, addProject, bump, setPattern, setTotalStitches,
    parseStitches, stepForRow, nextStitch, loadState, STORAGE_KEY,
} from '../../resources/js/counter.js';

test('parseStitches expands a repeat', () => {
    assert.deepEqual(parseStitches('k1 p1'), ['k', 'p']);
    assert.deepEqual(parseStitches('k2 p2'), ['k', 'k', 'p', 'p']);
    assert.deepEqual(parseStitches('k3 p1'), ['k', 'k', 'k', 'p']);
});

test('parseStitches accepts spaces, commas, capitals and bare letters', () => {
    assert.deepEqual(parseStitches('k 1 p 1'), ['k', 'p']);
    assert.deepEqual(parseStitches('K2, P2'), ['k', 'k', 'p', 'p']);
    assert.deepEqual(parseStitches('k'), ['k']);
    assert.deepEqual(parseStitches('kp'), ['k', 'p']);
});

test('parseStitches rejects blanks, unknown stitches and zero counts', () => {
    assert.equal(parseStitches(''), null);
    assert.equal(parseStitches('   '), null);
    assert.equal(parseStitches('k2tog'), null);
    assert.equal(parseStitches('yo k1'), null);
    assert.equal(parseStitches('k0'), null);
});

const rib = [
    { side: 'RS', stitches: 'k1 p1', rows: 1 },
    { side: 'WS', stitches: 'p1 k1', rows: 1 },
];
const garterThenRib = [
    { side: '', stitches: 'k', rows: 4 },
    { side: 'RS', stitches: 'k2 p2', rows: 1 },
    { side: 'WS', stitches: 'p2 k2', rows: 1 },
];

test('stepForRow cycles through steps using rows done', () => {
    assert.equal(stepForRow(rib, 0).index, 0);
    assert.equal(stepForRow(rib, 1).index, 1);
    assert.equal(stepForRow(rib, 2).index, 0);
    assert.equal(stepForRow(garterThenRib, 3).index, 0);
    assert.equal(stepForRow(garterThenRib, 4).index, 1);
    assert.equal(stepForRow(garterThenRib, 5).index, 2);
    assert.equal(stepForRow(garterThenRib, 6).index, 0);
    assert.equal(stepForRow(garterThenRib, 5).step.side, 'WS');
});

test('stepForRow returns null with no pattern', () => {
    assert.equal(stepForRow([], 3), null);
});

test('nextStitch follows the step repeat and stitch count', () => {
    assert.equal(nextStitch(rib, 0, 0), 'k');
    assert.equal(nextStitch(rib, 0, 1), 'p');
    assert.equal(nextStitch(rib, 0, 2), 'k');
    assert.equal(nextStitch(rib, 1, 0), 'p');
    assert.equal(nextStitch(garterThenRib, 4, 2), 'p');
    assert.equal(nextStitch(garterThenRib, 4, 5), 'k');
    assert.equal(nextStitch([], 0, 0), null);
});

test('Row + sets stitches back to 0; Row − leaves them', () => {
    let s = addProject(emptyState(), 'Scarf');
    const id = s.currentId;
    s = bump(bump(bump(s, id, 'stitches', 1), id, 'stitches', 1), id, 'stitches', 1);
    s = bump(s, id, 'rows', 1);
    assert.equal(s.projects[0].stitches, 0);
    s = bump(bump(s, id, 'stitches', 1), id, 'rows', -1);
    assert.equal(s.projects[0].stitches, 1);
    assert.equal(s.projects[0].rows, 0);
});

test('Row − at 0 does not touch stitches', () => {
    let s = addProject(emptyState(), 'Scarf');
    s = bump(bump(s, s.currentId, 'stitches', 1), s.currentId, 'rows', -1);
    assert.equal(s.projects[0].stitches, 1);
});

test('setPattern stores cleaned steps', () => {
    let s = addProject(emptyState(), 'Scarf');
    s = setPattern(s, s.currentId, [
        { side: 'RS', stitches: '  k1 p1 ', rows: '2' },
        { side: 'bogus', stitches: 'p', rows: 0 },
    ]);
    assert.deepEqual(s.projects[0].pattern, [
        { side: 'RS', stitches: 'k1 p1', rows: 2 },
        { side: '', stitches: 'p', rows: 1 },
    ]);
});

test('setTotalStitches stores a positive whole number, or null when blank', () => {
    let s = addProject(emptyState(), 'Scarf');
    s = setTotalStitches(s, s.currentId, '40');
    assert.equal(s.projects[0].totalStitches, 40);
    s = setTotalStitches(s, s.currentId, '');
    assert.equal(s.projects[0].totalStitches, null);
    s = setTotalStitches(s, s.currentId, '-3');
    assert.equal(s.projects[0].totalStitches, null);
});

test('new projects start with no pattern and no total', () => {
    const p = addProject(emptyState(), 'Scarf').projects[0];
    assert.deepEqual(p.pattern, []);
    assert.equal(p.totalStitches, null);
});

test('projects saved before patterns existed still load', () => {
    const storage = { getItem: () => JSON.stringify({
        projects: [{ id: 'a', name: 'Old', rows: 2, stitches: 3 }], currentId: 'a',
    }) };
    const p = loadState(storage).projects[0];
    assert.deepEqual(p, { id: 'a', name: 'Old', rows: 2, stitches: 3, pattern: [], totalStitches: null });
});
