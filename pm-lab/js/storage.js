const LIST_KEY = 'pmlab_projects_v1';
const ACTIVE_KEY = 'pmlab_active_v1';

function readList() {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeList(list) {
  localStorage.setItem(LIST_KEY, JSON.stringify(list));
}

export const PMStorage = {
  list() {
    return readList().map((p) => ({ id: p.id, name: p.name || 'Untitled', updatedAt: p.updatedAt, source: p.source, progress: p.progress, status: p.status }));
  },
  get(id) {
    return readList().find((p) => p.id === id) || null;
  },
  save(project) {
    const list = readList();
    const copy = JSON.parse(JSON.stringify(project));
    copy.updatedAt = new Date().toISOString();
    const idx = list.findIndex((p) => p.id === copy.id);
    if (idx >= 0) list.splice(idx, 1, copy);
    else list.unshift(copy);
    writeList(list.slice(0, 50));
    return copy;
  },
  duplicate(id) {
    const src = this.get(id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    copy.name = (src.name || 'Untitled') + ' (copy)';
    copy.updatedAt = new Date().toISOString();
    const list = readList();
    list.unshift(copy);
    writeList(list);
    return copy;
  },
  remove(id) {
    writeList(readList().filter((p) => p.id !== id));
    if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
  },
  setActive(id) {
    localStorage.setItem(ACTIVE_KEY, id);
  },
  getActive() {
    const id = localStorage.getItem(ACTIVE_KEY);
    return id ? this.get(id) : null;
  },
  clearActive() {
    localStorage.removeItem(ACTIVE_KEY);
  },
};