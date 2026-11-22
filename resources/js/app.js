import Alpine from 'alpinejs';
import {
    addProject, renameProject, deleteProject, bump, resetCounter, selectProject, recentProjects,
    loadState, saveState, setPattern, setTotalStitches, setMarkers, parseMarkers,
    parseRow, stepForRow, stitchesUsed, patternDone, sectionsNow, planRow, tapAt, stitchLabel,
} from './counter.js';

const total = (xs) => (xs ? xs.reduce((n, x) => n + x, 0) : null);

const storage = (() => {
    try { return window.localStorage ?? null; } catch { return null; }
})() ?? { getItem: () => null, setItem: () => {} };

Alpine.data('knitCounter', () => ({
    state: loadState(storage),

    get current() {
        return this.state.projects.find((p) => p.id === this.state.currentId) ?? null;
    },

    get currentStep() {
        const p = this.current;
        return p ? stepForRow(p.pattern, p.rows, p.repeats) : null;
    },
    get done() {
        const p = this.current;
        return !!p && patternDone(p.pattern, p.rows, p.repeats);
    },
    // Stitches between markers (or just [total]) at the start of this row;
    // shaping rows already worked change them.
    get sections() {
        return this.current ? sectionsNow(this.current) : null;
    },
    get needles() { return total(this.sections); },
    get plan() {
        const p = this.current;
        return p ? planRow(p.pattern, p.rows, p.repeats, this.sections) : null;
    },
    get tap() { return this.current ? tapAt(this.plan, this.current.stitches) : null; },
    get next() { return this.tap?.st ?? null; },
    get toGo() {
        const t = this.tap;
        if (!t?.toGo) return '';
        return `${t.toGo} to ${t.to === 'end' ? 'end' : 'marker'}`;
    },
    // A marker row has a set number of taps; after the last one the row is done.
    get rowDone() {
        const plan = this.plan;
        return !!(plan?.fixed && plan.taps && this.current.stitches >= plan.taps.length);
    },
    get needsMarkers() { return !!(this.plan?.fixed && !this.plan.taps); },
    // Stitches taken off the left needle (k2tog counts 2, m1r counts 0).
    get used() {
        const p = this.current;
        return p ? stitchesUsed(p.pattern, p.rows, p.stitches, p.repeats, this.sections) : 0;
    },
    get overTotal() {
        return !!(this.needles && this.used > this.needles);
    },
    // Stitch count at the end of this row, when the pattern changes it.
    get rowEnd() {
        const n = total(this.plan?.end);
        return n !== null && n !== this.needles ? n : null;
    },
    get nextLabel() { return stitchLabel(this.next); },

    // ---------- Pattern editor ----------
    editor: { open: false, total: '', markers: '', markersWas: '', repeats: '', steps: [] },
    openPattern() {
        const p = this.current;
        const markers = p.markers ? this.sections.join(' ') : '';
        this.editor = {
            open: true,
            total: this.needles ?? '',
            markers,
            markersWas: markers,
            repeats: p.repeats ?? '',
            steps: p.pattern.length
                ? p.pattern.map((st) => ({ ...st }))
                : [{ side: '', stitches: '', rows: 1 }],
        };
    },
    addStep() { this.editor.steps.push({ side: '', stitches: '', rows: 1 }); },
    removeStep(i) { this.editor.steps.splice(i, 1); },
    stepInvalid(st) { return st.stitches.trim() !== '' && parseRow(st.stitches) === null; },
    get markersInvalid() { return parseMarkers(this.editor.markers) === undefined; },
    get editorMarkerTotal() { return total(parseMarkers(this.editor.markers) || null); },
    get editorValid() {
        return !this.markersInvalid && !this.editor.steps.some((st) => this.stepInvalid(st));
    },
    savePattern() {
        if (!this.editorValid) return;
        const id = this.current.id;
        const steps = this.editor.steps.filter((st) => st.stitches.trim() !== '');
        let next = setPattern(this.state, id, steps, this.editor.repeats);
        // Only re-base the counts when they were changed, so Row − still
        // walks back through earlier shaping rows.
        const markers = parseMarkers(this.editor.markers);
        if (this.editor.markers.trim() !== this.editor.markersWas.trim()) {
            next = markers ? setMarkers(next, id, markers) : setTotalStitches(next, id, this.editor.total);
        } else if (!markers && String(this.editor.total) !== String(this.needles ?? '')) {
            next = setTotalStitches(next, id, this.editor.total);
        }
        this.commit(next);
        this.editor.open = false;
    },

    commit(next) {
        this.state = next;
        saveState(storage, next);
    },

    // Pearl pop-up used for Reset, Delete and Rename
    // (native browser dialogs are blocked in some browsers and web views).
    modal: {
        open: false, title: '', message: '', confirmLabel: 'OK',
        danger: false, withInput: false, value: '', label: '', placeholder: '', onConfirm: null,
    },
    openModal(opts, onConfirm) {
        this.modal = {
            open: true, title: '', message: '', confirmLabel: 'OK',
            danger: false, withInput: false, value: '', label: '', placeholder: '', ...opts, onConfirm,
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

    newProject() {
        this.openModal(
            { title: 'New project', confirmLabel: 'Create', withInput: true, label: 'Project name', placeholder: 'e.g. Winter scarf' },
            (name) => this.commit(addProject(this.state, name)),
        );
    },
    select(id) { this.commit(selectProject(this.state, id)); },
    get recent() { return recentProjects(this.state, 3); },

    // All-projects pop-up (the chip row only shows the three most recent).
    projectsOpen: false,
    pick(id) {
        this.select(id);
        this.projectsOpen = false;
    },
    newFromList() {
        this.projectsOpen = false;
        this.newProject();
    },
    rename() {
        const id = this.current.id;
        this.openModal(
            { title: 'Rename project', confirmLabel: 'Save', withInput: true, label: 'Project name', value: this.current.name },
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
