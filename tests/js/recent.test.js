import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, addProject, selectProject, recentProjects } from '../../resources/js/counter.js';

const names = (ps) => ps.map((p) => p.name);

function five() {
    let s = emptyState();
    for (const n of ['A', 'B', 'C', 'D', 'E']) s = addProject(s, n);
    let t = 1;
    for (const p of s.projects) s = selectProject(s, p.id, t++);   // E most recent
    return s;
}

test('shows the three most recently opened, in created order', () => {
    const s = five();
    assert.deepEqual(names(recentProjects(s)), ['C', 'D', 'E']);
});

test('opening a hidden project swaps out the least recent one', () => {
    let s = five();
    s = selectProject(s, s.projects[0].id, 100);   // A
    assert.deepEqual(names(recentProjects(s)), ['A', 'D', 'E']);
    assert.equal(s.currentId, s.projects[0].id);
});

test('tapping a visible chip keeps the same chips', () => {
    let s = five();
    s = selectProject(s, s.projects[3].id, 100);   // D
    assert.deepEqual(names(recentProjects(s)), ['C', 'D', 'E']);
});

test('the current project is always shown', () => {
    let s = five();
    s = { ...s, currentId: s.projects[0].id };     // e.g. after a delete
    assert.ok(names(recentProjects(s)).includes('A'));
    assert.equal(recentProjects(s).length, 3);
});

test('fewer than three projects shows them all; unknown ids are ignored', () => {
    let s = addProject(emptyState(), 'Only');
    assert.deepEqual(names(recentProjects(s)), ['Only']);
    assert.equal(selectProject(s, 'nope'), s);
});
