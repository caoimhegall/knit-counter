import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    emptyState, addProject, renameProject, deleteProject,
    bump, resetCounter, loadState, saveState, STORAGE_KEY,
} from '../../resources/js/counter.js';

const memoryStorage = () => {
    const data = {};
    return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};

test('addProject creates a project at 0/0 and makes it current', () => {
    const s = addProject(emptyState(), 'Socks');
    assert.equal(s.projects.length, 1);
    assert.deepEqual({ ...s.projects[0], id: undefined }, { id: undefined, name: 'Socks', rows: 0, stitches: 0 });
    assert.equal(s.currentId, s.projects[0].id);
});

test('addProject with a blank name uses "Untitled project"', () => {
    assert.equal(addProject(emptyState(), '   ').projects[0].name, 'Untitled project');
});

test('addProject gives each project a unique id', () => {
    const s = addProject(addProject(emptyState(), 'A'), 'B');
    assert.notEqual(s.projects[0].id, s.projects[1].id);
});

test('renameProject trims; blank rename keeps the old name', () => {
    let s = addProject(emptyState(), 'Socks');
    const id = s.projects[0].id;
    s = renameProject(s, id, '  Hat  ');
    assert.equal(s.projects[0].name, 'Hat');
    assert.equal(renameProject(s, id, '  ').projects[0].name, 'Hat');
});

test('bump adds and subtracts, never below 0', () => {
    let s = addProject(emptyState(), 'Socks');
    const id = s.projects[0].id;
    s = bump(s, id, 'rows', 1);
    s = bump(s, id, 'rows', 1);
    s = bump(s, id, 'stitches', 1);
    assert.equal(s.projects[0].rows, 2);
    assert.equal(s.projects[0].stitches, 1);
    s = bump(s, id, 'stitches', -1);
    s = bump(s, id, 'stitches', -1);
    assert.equal(s.projects[0].stitches, 0);
});

test('adding a row does not reset stitches', () => {
    let s = addProject(emptyState(), 'Socks');
    const id = s.projects[0].id;
    s = bump(bump(s, id, 'stitches', 1), id, 'rows', 1);
    assert.equal(s.projects[0].stitches, 1);
});

test('resetCounter sets one counter to 0', () => {
    let s = addProject(emptyState(), 'Socks');
    const id = s.projects[0].id;
    s = bump(bump(s, id, 'rows', 1), id, 'stitches', 1);
    s = resetCounter(s, id, 'rows');
    assert.equal(s.projects[0].rows, 0);
    assert.equal(s.projects[0].stitches, 1);
});

test('functions do not mutate the input state', () => {
    const s = addProject(emptyState(), 'Socks');
    const snapshot = JSON.stringify(s);
    bump(s, s.projects[0].id, 'rows', 1);
    renameProject(s, s.projects[0].id, 'X');
    deleteProject(s, s.projects[0].id);
    assert.equal(JSON.stringify(s), snapshot);
});

test('deleting the current project picks the first remaining, or null', () => {
    let s = addProject(addProject(emptyState(), 'A'), 'B');
    const [a, b] = s.projects;
    assert.equal(s.currentId, b.id);
    s = deleteProject(s, b.id);
    assert.equal(s.currentId, a.id);
    s = deleteProject(s, a.id);
    assert.equal(s.currentId, null);
    assert.equal(s.projects.length, 0);
});

test('deleting a non-current project keeps the current one', () => {
    let s = addProject(addProject(emptyState(), 'A'), 'B');
    const [a, b] = s.projects;
    assert.equal(deleteProject(s, a.id).currentId, b.id);
});

test('save then load round-trips', () => {
    const storage = memoryStorage();
    const start = addProject(emptyState(), 'Socks');
    const s = bump(start, start.currentId, 'rows', 1);
    saveState(storage, s);
    assert.deepEqual(loadState(storage), s);
});

test('loadState returns empty state for missing, corrupt or wrong-shaped data', () => {
    const storage = memoryStorage();
    assert.deepEqual(loadState(storage), emptyState());
    storage.setItem(STORAGE_KEY, '{not json');
    assert.deepEqual(loadState(storage), emptyState());
    storage.setItem(STORAGE_KEY, '{"projects":"nope"}');
    assert.deepEqual(loadState(storage), emptyState());
});

test('loadState and saveState survive a storage that throws', () => {
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    assert.deepEqual(loadState(broken), emptyState());
    assert.doesNotThrow(() => saveState(broken, emptyState()));
});
