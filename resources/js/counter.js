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
    return updateProject(state, id, (p) => ({
        ...p,
        [field]: Math.max(0, p[field] + delta),
    }));
}

export function resetCounter(state, id, field) {
    if (!FIELDS.includes(field)) return state;
    return updateProject(state, id, (p) => ({ ...p, [field]: 0 }));
}

const isValidProject = (p) =>
    p && typeof p.id === 'string' && typeof p.name === 'string' &&
    Number.isInteger(p.rows) && p.rows >= 0 &&
    Number.isInteger(p.stitches) && p.stitches >= 0;

export function loadState(storage) {
    try {
        const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
        if (!parsed || !Array.isArray(parsed.projects)) return emptyState();
        const projects = parsed.projects.filter(isValidProject);
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
