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

    // Pearl pop-up used for Reset, Delete and Rename
    // (native browser dialogs are blocked in some browsers and web views).
    modal: {
        open: false, title: '', message: '', confirmLabel: 'OK',
        danger: false, withInput: false, value: '', onConfirm: null,
    },
    openModal(opts, onConfirm) {
        this.modal = {
            open: true, title: '', message: '', confirmLabel: 'OK',
            danger: false, withInput: false, value: '', ...opts, onConfirm,
        };
        this.$nextTick(() => {
            const el = this.modal.withInput ? this.$refs.modalInput : this.$refs.modalConfirm;
            el?.focus();
            if (this.modal.withInput) el?.select();
        });
    },
    closeModal() { this.modal.open = false; },
    confirmModal() {
        const { onConfirm, value } = this.modal;
        this.closeModal();
        onConfirm?.(value);
    },

    add() {
        this.commit(addProject(this.state, this.newName));
        this.newName = '';
    },
    select(id) { this.commit({ ...this.state, currentId: id }); },
    rename() {
        const id = this.current.id;
        this.openModal(
            { title: 'Rename project', confirmLabel: 'Save', withInput: true, value: this.current.name },
            (name) => this.commit(renameProject(this.state, id, name)),
        );
    },
    remove() {
        const { id, name } = this.current;
        this.openModal(
            { title: `Delete “${name}”?`, message: 'Its row and stitch counts will be gone for good.', confirmLabel: 'Delete', danger: true },
            () => this.commit(deleteProject(this.state, id)),
        );
    },
    bump(field, delta) { this.commit(bump(this.state, this.current.id, field, delta)); },
    reset(field) {
        if (this.current[field] === 0) return;
        const id = this.current.id;
        this.openModal(
            { title: `Reset ${field}?`, message: `This sets ${field} back to 0.`, confirmLabel: 'Reset', danger: true },
            () => this.commit(resetCounter(this.state, id, field)),
        );
    },
}));

window.Alpine = Alpine;
Alpine.start();
