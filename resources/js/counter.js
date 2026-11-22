// Pure state functions for the knit counter. No DOM, no globals:
// every function returns a new state and never mutates its input.

export const STORAGE_KEY = 'knit-counter:v1';
const FIELDS = ['rows', 'stitches'];

export const emptyState = () => ({ projects: [], currentId: null });

const newId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const updateProject = (state, id, fn) => ({
    ...state,
    projects: state.projects.map((p) => (p.id === id ? fn(p) : p)),
});

export function addProject(state, name) {
    const project = {
        id: newId(),
        name: (name ?? '').trim() || 'Untitled project',
        rows: 0,
        stitches: 0,
        pattern: [],
        totalStitches: null,
    };
    return { projects: [...state.projects, project], currentId: project.id };
}

export function renameProject(state, id, name) {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return state;
    return updateProject(state, id, (p) => ({ ...p, name: trimmed }));
}

export function deleteProject(state, id) {
    const projects = state.projects.filter((p) => p.id !== id);
    const currentId =
        state.currentId === id ? (projects[0]?.id ?? null) : state.currentId;
    return { projects, currentId };
}

export function bump(state, id, field, delta) {
    if (!FIELDS.includes(field)) return state;
    return updateProject(state, id, (p) => {
        const next = { ...p, [field]: Math.max(0, p[field] + delta) };
        // Moving on to a new row starts the stitch count again.
        if (field === 'rows' && next.rows > p.rows) next.stitches = 0;
        return next;
    });
}

export function resetCounter(state, id, field) {
    if (!FIELDS.includes(field)) return state;
    return updateProject(state, id, (p) => ({ ...p, [field]: 0 }));
}

// ---------- Stitch patterns ----------

const SIDES = ['', 'RS', 'WS'];

// Every stitch the pattern understands: how many it uses from the left needle,
// how many it makes on the right, and what it's called.
export const STITCHES = {
    k:     { uses: 1, makes: 1, label: 'knit' },
    p:     { uses: 1, makes: 1, label: 'purl' },
    sl1:   { uses: 1, makes: 1, label: 'slip 1' },
    k2tog: { uses: 2, makes: 1, label: 'knit 2 together' },
    p2tog: { uses: 2, makes: 1, label: 'purl 2 together' },
    ssk:   { uses: 2, makes: 1, label: 'slip, slip, knit' },
    k3tog: { uses: 3, makes: 1, label: 'knit 3 together' },
    sk2p:  { uses: 3, makes: 1, label: 'slip 1, k2tog, pass over' },
    m1:    { uses: 0, makes: 1, label: 'make 1' },
    m1l:   { uses: 0, makes: 1, label: 'make 1 left' },
    m1r:   { uses: 0, makes: 1, label: 'make 1 right' },
    m1p:   { uses: 0, makes: 1, label: 'make 1 purlwise' },
    yo:    { uses: 0, makes: 1, label: 'yarn over' },
    kfb:   { uses: 1, makes: 2, label: 'knit front & back' },
    pfb:   { uses: 1, makes: 2, label: 'purl front & back' },
};

// Longest names first so "k2tog" isn't read as "k2" + "tog".
const NAMES = Object.keys(STITCHES).sort((a, b) => b.length - a.length);
const MAX_REPEAT = 500;

// "k2 m1r k2tog" -> ['k','k','m1r','k2tog'];  invalid -> null
export function parseStitches(text) {
    let rest = String(text ?? '').toLowerCase().replace(/[,\s]+/g, ' ').trim();
    if (!rest) return null;
    const out = [];
    while (rest) {
        const name = NAMES.find((n) => rest.startsWith(n));
        if (!name) return null;
        rest = rest.slice(name.length);
        const m = rest.match(/^\s*(\d+)/);
        const count = m ? Number(m[1]) : 1;
        if (m) rest = rest.slice(m[0].length);
        if (count < 1 || out.length + count > MAX_REPEAT) return null;
        for (let i = 0; i < count; i++) out.push(name);
        rest = rest.trimStart();
    }
    return out;
}

const cleanStep = (step) => ({
    side: SIDES.includes(step?.side) ? step.side : '',
    stitches: String(step?.stitches ?? '').trim(),
    rows: Math.max(1, Math.floor(Number(step?.rows)) || 1),
});

// Which step applies after `rowsDone` rows. Returns { index, step } or null.
export function stepForRow(pattern, rowsDone) {
    if (!pattern?.length) return null;
    const cycle = pattern.reduce((n, st) => n + st.rows, 0);
    let pos = rowsDone % cycle;
    for (let index = 0; index < pattern.length; index++) {
        if (pos < pattern[index].rows) return { index, step: pattern[index] };
        pos -= pattern[index].rows;
    }
    return null;
}

const rowSequence = (pattern, rowsDone) => {
    const found = stepForRow(pattern, rowsDone);
    return found ? parseStitches(found.step.stitches) : null;
};

// The stitch name to work next ('k', 'm1r', 'k2tog', …) or null.
export function nextStitch(pattern, rowsDone, stitchesDone) {
    const seq = rowSequence(pattern, rowsDone);
    return seq ? seq[stitchesDone % seq.length] : null;
}

// Stitches taken off the left needle after `taps` stitches worked this row.
export function stitchesUsed(pattern, rowsDone, taps) {
    const seq = rowSequence(pattern, rowsDone);
    if (!seq) return taps;
    const perRepeat = seq.reduce((n, s) => n + STITCHES[s].uses, 0);
    let used = Math.floor(taps / seq.length) * perRepeat;
    for (let i = 0; i < taps % seq.length; i++) used += STITCHES[seq[i]].uses;
    return used;
}

// How many stitches you'll have once this row is worked across `total`.
// A stitch that won't fit at the end leaves the rest counted as worked plain.
export function rowEndCount(pattern, rowsDone, total) {
    const seq = rowSequence(pattern, rowsDone);
    if (!seq || !total) return null;
    if (!seq.some((s) => STITCHES[s].uses > 0)) return null;
    let used = 0;
    let made = 0;
    for (let i = 0; used < total; i++) {
        const st = STITCHES[seq[i % seq.length]];
        if (used + st.uses > total) break;
        used += st.uses;
        made += st.makes;
    }
    return made + (total - used);
}

export function setPattern(state, id, steps) {
    const pattern = (steps ?? []).map(cleanStep);
    return updateProject(state, id, (p) => ({ ...p, pattern }));
}

export function setTotalStitches(state, id, value) {
    const n = Math.floor(Number(value));
    const totalStitches = String(value ?? '').trim() !== '' && n > 0 ? n : null;
    return updateProject(state, id, (p) => ({ ...p, totalStitches }));
}

// ---------- Loading ----------

const isValidProject = (p) =>
    p && typeof p.id === 'string' && typeof p.name === 'string' &&
    Number.isInteger(p.rows) && p.rows >= 0 &&
    Number.isInteger(p.stitches) && p.stitches >= 0;

// Fill in fields added after a project was first saved.
const normalizeProject = (p) => ({
    ...p,
    pattern: Array.isArray(p.pattern) ? p.pattern.map(cleanStep) : [],
    totalStitches: Number.isInteger(p.totalStitches) && p.totalStitches > 0 ? p.totalStitches : null,
});

export function loadState(storage) {
    try {
        const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
        if (!parsed || !Array.isArray(parsed.projects)) return emptyState();
        const projects = parsed.projects.filter(isValidProject).map(normalizeProject);
        const currentId = projects.some((p) => p.id === parsed.currentId)
            ? parsed.currentId
            : (projects[0]?.id ?? null);
        return { projects, currentId };
    } catch {
        return emptyState();
    }
}

export function saveState(storage, state) {
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage unavailable (e.g. private browsing): keep working in memory.
    }
}
