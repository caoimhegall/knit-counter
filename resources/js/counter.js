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
        repeats: null,
        markers: null,
        totalStitches: null,
        totalAtRow: 0,
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
    return updateProject(state, id, (p) => ({
        ...p,
        [field]: 0,
        // Starting over: the needle count you entered is the cast-on count.
        ...(field === 'rows' ? { totalAtRow: 0 } : {}),
    }));
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

export const stitchLabel = (name) => (name === 'sm' ? 'slip marker' : STITCHES[name]?.label ?? '');

// Longest names first so "k2tog" isn't read as "k2" + "tog".
const NAMES = Object.keys(STITCHES).sort((a, b) => b.length - a.length);
const MAX_OPS = 2000;
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twice: 2 };

// Parse a row into ops: { st: 'k' }, { st: 'k', to: 'm' | 'end' } or { sm: true }.
// Understands "k2 m1r", "k to m", "k to next marker", "k to end", "k to bor",
// "sm" / "slip marker", and groups like "(…) x4", "[…] 4 times", "*…* four times".
// Returns null if anything isn't understood.
export function parseRow(text) {
    const src = String(text ?? '').toLowerCase().replace(/×/g, 'x').replace(/[,;.]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!src) return null;
    let i = 0;
    const skip = () => { while (src[i] === ' ') i++; };
    const eat = (re) => {
        const m = src.slice(i).match(re);
        if (m) i += m[0].length;
        return m;
    };
    const groupCount = () => {
        skip();
        const m = eat(/^x ?(\d+)\b/) || eat(/^(\d+|[a-z]+) ?(?:x|times)\b(?: in total)?/) || eat(/^(twice)\b/);
        if (!m) return 1;
        return /^\d+$/.test(m[1]) ? Number(m[1]) : (WORDS[m[1]] ?? NaN);
    };

    const seq = (closer) => {
        const ops = [];
        for (;;) {
            skip();
            if (i >= src.length) return closer ? null : ops;
            const ch = src[i];
            if (ch === closer) { i++; return ops; }
            if (ch === ')' || ch === ']') return null;
            if (ch === '(' || ch === '[' || ch === '*') {
                i++;
                const inner = seq(ch === '(' ? ')' : ch === '[' ? ']' : '*');
                const n = groupCount();
                if (!inner || !(n >= 1)) return null;
                for (let k = 0; k < n; k++) ops.push(...inner);
            } else if (eat(/^(?:sm|slip marker)\b/)) {
                ops.push({ sm: true });
            } else {
                const name = NAMES.find((n) => src.startsWith(n, i));
                if (!name) return null;
                i += name.length;
                skip();
                const to = eat(/^to (?:the )?(?:next )?(m|marker|end|bor)\b(?: marker)?/);
                if (to) {
                    if (STITCHES[name].uses < 1) return null;
                    ops.push({ st: name, to: to[1] === 'end' || to[1] === 'bor' ? 'end' : 'm' });
                } else {
                    const m = eat(/^(\d+)/);
                    const n = m ? Number(m[1]) : 1;
                    if (n < 1) return null;
                    for (let k = 0; k < n; k++) ops.push({ st: name });
                }
            }
            if (ops.length > MAX_OPS) return null;
        }
    };
    const ops = seq(null);
    return ops?.length ? ops : null;
}

const isFixed = (ops) => ops.some((o) => o.sm || o.to);

// "k2 m1r k2tog" -> ['k','k','m1r','k2tog']. Rows with markers or "to end"
// aren't a simple repeat, so they return null here (see parseRow).
export function parseStitches(text) {
    const ops = parseRow(text);
    return ops && !isFixed(ops) ? ops.map((o) => o.st) : null;
}

const cleanStep = (step) => ({
    side: SIDES.includes(step?.side) ? step.side : '',
    stitches: String(step?.stitches ?? '').trim(),
    rows: Math.max(1, Math.floor(Number(step?.rows)) || 1),
});

const cycleRows = (pattern) => pattern.reduce((n, st) => n + st.rows, 0);

// True once every repeat of the pattern has been worked (never, if it repeats forever).
export function patternDone(pattern, rowsDone, repeats = null) {
    return !!(pattern?.length && repeats && rowsDone >= cycleRows(pattern) * repeats);
}

// Which step applies after `rowsDone` rows: { index, step, repeat } (repeat is
// 1-based), or null with no pattern or once all `repeats` are done.
export function stepForRow(pattern, rowsDone, repeats = null) {
    if (!pattern?.length || patternDone(pattern, rowsDone, repeats)) return null;
    const cycle = cycleRows(pattern);
    let pos = rowsDone % cycle;
    const repeat = Math.floor(rowsDone / cycle) + 1;
    for (let index = 0; index < pattern.length; index++) {
        if (pos < pattern[index].rows) return { index, step: pattern[index], repeat };
        pos -= pattern[index].rows;
    }
    return null;
}

const sum = (xs) => xs.reduce((n, x) => n + x, 0);

// Work a marker row across `sections` (stitch counts between markers, from the
// start of the row). Returns the list of taps and the section sizes after.
function walkFixed(ops, sections) {
    const rem = [...sections];
    const out = sections.map(() => 0);
    const last = sections.length - 1;
    let cur = 0;
    const taps = [];
    const work = (name, toGo = null, to = null) => {
        const st = STITCHES[name];
        let need = st.uses;
        while (need > 0 && cur <= last) {
            const take = Math.min(need, rem[cur]);
            rem[cur] -= take;
            need -= take;
            if (need > 0 && cur < last) cur++;
            else break;
        }
        out[cur] += st.makes;
        taps.push(to ? { st: name, toGo, to } : { st: name, toGo });
    };
    for (const op of ops) {
        if (op.sm) {
            // Anything not yet worked before the marker counts as worked plain.
            out[cur] += rem[cur];
            rem[cur] = 0;
            if (cur < last) cur++;
            taps.push({ st: 'sm', toGo: null });
        } else if (op.to) {
            const uses = STITCHES[op.st].uses;
            const left = () => (op.to === 'end' ? sum(rem.slice(cur)) : rem[cur]);
            while (left() >= uses) {
                if (op.to === 'end') while (rem[cur] === 0 && cur < last) cur++;
                work(op.st, left(), op.to);
            }
        } else {
            work(op.st);
        }
    }
    rem.forEach((n, k) => { out[k] += n; });
    return { taps, end: out };
}

// Work a simple repeat ("k1 p1", "k2 m1r") across all the stitches, slipping
// markers as you meet them. A stitch that won't fit leaves the rest worked plain;
// a repeat that ends on increases is finished.
function walkRepeat(seq, sections) {
    if (!seq.some((s) => STITCHES[s].uses > 0)) return null;
    const rem = [...sections];
    const out = sections.map(() => 0);
    const last = sections.length - 1;
    let cur = 0;
    let left = sum(sections);
    let i = 0;
    for (; left > 0; i++) {
        const st = STITCHES[seq[i % seq.length]];
        if (st.uses > left) break;
        let need = st.uses;
        while (need > 0) {
            while (rem[cur] === 0 && cur < last) cur++;
            const take = Math.min(need, rem[cur]);
            rem[cur] -= take;
            need -= take;
        }
        left -= st.uses;
        out[cur] += st.makes;
    }
    if (left === 0) {
        for (; i % seq.length !== 0 && STITCHES[seq[i % seq.length]].uses === 0; i++) {
            out[cur] += STITCHES[seq[i % seq.length]].makes;
        }
    }
    rem.forEach((n, k) => { out[k] += n; });
    return out;
}

// Everything about the row after `rowsDone` rows, given the stitches on the
// needles split by markers (`sections`, or null if unknown).
//   { fixed: false, seq, end }  simple repeat: seq loops for as long as you knit
//   { fixed: true, taps, end }  marker row: a set list of taps (taps null if
//                               the marker counts aren't known yet)
export function planRow(pattern, rowsDone, repeats = null, sections = null) {
    const found = stepForRow(pattern, rowsDone, repeats);
    const ops = found ? parseRow(found.step.stitches) : null;
    if (!ops) return null;
    if (isFixed(ops)) {
        if (!sections) return { fixed: true, taps: null, end: null };
        return { fixed: true, ...walkFixed(ops, sections) };
    }
    const seq = ops.map((o) => o.st);
    return { fixed: false, seq, end: sections ? walkRepeat(seq, sections) : null };
}

// What to do on tap number `taps` of a planned row: { st, toGo } or null.
export function tapAt(plan, taps) {
    if (!plan) return null;
    if (!plan.fixed) return { st: plan.seq[taps % plan.seq.length], toGo: null };
    return plan.taps?.[taps] ?? null;
}

// The stitch name to work next ('k', 'm1r', 'k2tog', 'sm', …) or null.
export function nextStitch(pattern, rowsDone, stitchesDone, repeats = null, sections = null) {
    return tapAt(planRow(pattern, rowsDone, repeats, sections), stitchesDone)?.st ?? null;
}

const usesOf = (name) => STITCHES[name]?.uses ?? 0;

// Stitches taken off the left needle after `taps` stitches worked this row.
export function stitchesUsed(pattern, rowsDone, taps, repeats = null, sections = null) {
    const plan = planRow(pattern, rowsDone, repeats, sections);
    if (!plan || (plan.fixed && !plan.taps)) return taps;
    if (plan.fixed) {
        const done = plan.taps.slice(0, taps);
        return sum(done.map((t) => usesOf(t.st))) + Math.max(0, taps - plan.taps.length);
    }
    const seq = plan.seq;
    const perRepeat = sum(seq.map(usesOf));
    let used = Math.floor(taps / seq.length) * perRepeat;
    for (let i = 0; i < taps % seq.length; i++) used += usesOf(seq[i]);
    return used;
}

// How many stitches you'll have once this row is worked across `total`.
export function rowEndCount(pattern, rowsDone, total, repeats = null) {
    if (!total) return null;
    const end = planRow(pattern, rowsDone, repeats, [total])?.end;
    return end ? sum(end) : null;
}

// Stitches between markers at the start of the current row (or [total] with
// no markers). The counts the knitter entered were true at row `totalAtRow`;
// every shaping row since then grows or shrinks them. Going back before that
// row shows the entered counts.
export function sectionsNow(project) {
    const { pattern, repeats, markers, totalStitches, totalAtRow = 0, rows } = project;
    let s = markers?.length ? markers : (totalStitches ? [totalStitches] : null);
    if (!s) return null;
    for (let r = totalAtRow; r < rows; r++) {
        s = planRow(pattern, r, repeats, s)?.end ?? s;
    }
    return s;
}

export function needlesNow(project) {
    const s = sectionsNow(project);
    return s ? sum(s) : null;
}

const cleanRepeats = (value) => {
    const n = Math.floor(Number(value));
    return String(value ?? '').trim() !== '' && n > 0 ? n : null;
};

export function setPattern(state, id, steps, repeats = null) {
    const pattern = (steps ?? []).map(cleanStep);
    return updateProject(state, id, (p) => ({ ...p, pattern, repeats: cleanRepeats(repeats) }));
}

// "There are N stitches on the needles now" — counted from the current row.
export function setTotalStitches(state, id, value) {
    const n = Math.floor(Number(value));
    const totalStitches = String(value ?? '').trim() !== '' && n > 0 ? n : null;
    return updateProject(state, id, (p) => ({ ...p, totalStitches, markers: null, totalAtRow: p.rows }));
}

// "18 2 18 2 …" -> [18, 2, 18, 2, …]; blank -> null; invalid -> undefined.
export function parseMarkers(text) {
    const t = String(text ?? '').trim();
    if (!t) return null;
    const parts = t.split(/[\s,]+/);
    if (parts.length < 2 || parts.length > 41 || !parts.every((x) => /^\d+$/.test(x))) return undefined;
    const nums = parts.map(Number);
    return sum(nums) > 0 ? nums : undefined;
}

// Stitches between markers right now, counted from the current row.
export function setMarkers(state, id, list) {
    return updateProject(state, id, (p) => (list?.length
        ? { ...p, markers: [...list], totalStitches: sum(list), totalAtRow: p.rows }
        : { ...p, markers: null }));
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
    repeats: cleanRepeats(p.repeats),
    markers: Array.isArray(p.markers) && p.markers.length > 1 && p.markers.every((n) => Number.isInteger(n) && n >= 0) ? p.markers : null,
    totalStitches: Number.isInteger(p.totalStitches) && p.totalStitches > 0 ? p.totalStitches : null,
    // Older saves: the count was entered for wherever the knitter is now.
    totalAtRow: Number.isInteger(p.totalAtRow) && p.totalAtRow >= 0 ? p.totalAtRow : p.rows,
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
