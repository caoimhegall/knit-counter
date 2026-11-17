import Alpine from 'alpinejs';
import {
    addProject, renameProject, deleteProject, bump, resetCounter,
    loadState, saveState,
} from './counter.js';

const storage = (() => {
    try { return window.localStorage ?? null; } catch { return null; }
})() ?? { getItem: () => null, setItem: () => {} };

Alpine.data('knitCounter', () => ({
    state: loadState(storage),
    newName: '',

    get current() {
        return this.state.projects.find((p) => p.id === this.state.currentId) ?? null;
    },

    commit(next) {
        this.state = next;
        saveState(storage, next);
    },

    add() {
        this.commit(addProject(this.state, this.newName));
        this.newName = '';
    },
    select(id) { this.commit({ ...this.state, currentId: id }); },
    rename() {
        const name = window.prompt('Rename project', this.current.name);
        if (name !== null) this.commit(renameProject(this.state, this.current.id, name));
    },
    remove() {
        if (window.confirm(`Delete "${this.current.name}"? This can't be undone.`)) {
            this.commit(deleteProject(this.state, this.current.id));
        }
    },
    bump(field, delta) { this.commit(bump(this.state, this.current.id, field, delta)); },
    reset(field) {
        if (this.current[field] === 0 || window.confirm(`Reset ${field} to 0?`)) {
            this.commit(resetCounter(this.state, this.current.id, field));
        }
    },
}));

window.Alpine = Alpine;
Alpine.start();
