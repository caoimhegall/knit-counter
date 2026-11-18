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

    // In-page "tap again to confirm" (native dialogs are blocked in some browsers).
    armed: null,
    armTimer: null,
    isArmed(key) { return this.armed === key; },
    disarm() {
        clearTimeout(this.armTimer);
        this.armed = null;
    },
    confirmTap(key, action) {
        if (this.armed === key) {
            this.disarm();
            action();
            return;
        }
        this.disarm();
        this.armed = key;
        this.armTimer = setTimeout(() => { this.armed = null; }, 3000);
    },

    // Inline rename
    editing: false,
    editName: '',

    add() {
        this.commit(addProject(this.state, this.newName));
        this.newName = '';
        this.disarm();
        this.editing = false;
    },
    select(id) {
        this.commit({ ...this.state, currentId: id });
        this.disarm();
        this.editing = false;
    },
    startRename() {
        this.disarm();
        this.editName = this.current.name;
        this.editing = true;
        this.$nextTick(() => this.$refs.renameInput?.select());
    },
    saveRename() {
        if (!this.editing) return;
        this.commit(renameProject(this.state, this.current.id, this.editName));
        this.editing = false;
    },
    cancelRename() { this.editing = false; },
    remove() {
        this.confirmTap('delete', () => this.commit(deleteProject(this.state, this.current.id)));
    },
    bump(field, delta) {
        this.disarm();
        this.commit(bump(this.state, this.current.id, field, delta));
    },
    reset(field) {
        if (this.current[field] === 0) return;
        this.confirmTap(`reset-${field}`, () => this.commit(resetCounter(this.state, this.current.id, field)));
    },
}));

window.Alpine = Alpine;
Alpine.start();
