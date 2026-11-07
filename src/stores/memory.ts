import { defineStore } from "pinia";
import { ApiError, pullAll, pushEncrypted } from "../services/api-client";
import {
  addLink,
  cleanTags,
  linkIndex,
  parseCapture,
  removeLink,
  retrieveRelevant,
  searchMemories,
  categoryStorage,
  type CategoryId,
  type Filters,
  type MemoryData,
  type MemoryLink,
  type MemoryRecord,
} from "../services/memory-engine";

/** Error codes surfaced to the view (it maps them to localised text). */
export const ERR = { EMPTY: "EMPTY", CONFLICT: "CONFLICT", NOT_FOUND: "NOT_FOUND", READONLY: "READONLY" } as const;

async function push(id: string, data: MemoryData | Record<string, never>, revision: number, deleted = false) {
  try {
    await pushEncrypted("memory", id, data, revision, deleted);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) throw new Error(ERR.CONFLICT);
    throw e;
  }
}

export const useMemoryStore = defineStore("memory", {
  state: () => ({
    records: [] as MemoryRecord[],
    syncRev: 0,
    loading: false,
    error: "",
  }),
  getters: {
    active: (s) => s.records.filter((r) => !r.data.archived),
    archived: (s) => s.records.filter((r) => r.data.archived),
    links(): ReturnType<typeof linkIndex> {
      return linkIndex(this.records);
    },
  },
  actions: {
    /** Pull + decrypt everything, keep only "memory" items (same strategy as the vault store). */
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const { items, syncRev } = await pullAll<MemoryData>(0);
        this.syncRev = syncRev;
        this.records = items
          .filter((i) => i.type === "memory" && !i.deleted && i.data && typeof (i.data as MemoryData).text === "string")
          .map((i) => ({ id: i.id, revision: i.revision, data: i.data as MemoryData }))
          .sort((a, b) => (b.data.createdAt || "").localeCompare(a.data.createdAt || ""));
      } catch (e: any) {
        this.error = e?.body?.detail ?? e?.message ?? String(e);
      } finally {
        this.loading = false;
      }
    },

    /** Natural-language capture: parses #tags / @people, detects category + language, saves encrypted. */
    async capture(raw: string, over: { category?: CategoryId; links?: MemoryLink[]; tags?: string[] } = {}) {
      const p = parseCapture(raw);
      if (!p.text) throw new Error(ERR.EMPTY);
      const now = new Date().toISOString();
      let links = p.links;
      for (const l of over.links ?? []) links = addLink(links, l);
      const data: MemoryData = {
        text: p.text,
        category: categoryStorage(over.category ?? p.category),
        createdAt: now,
        updatedAt: now,
        kind: "note",
        tags: cleanTags([...p.tags, ...(over.tags ?? [])]),
        links,
        lang: p.lang,
        ...(p.title ? { title: p.title } : {}),
      };
      const id = crypto.randomUUID();
      await push(id, data, 0);
      await this.load();
      return id;
    },

    async update(id: string, patch: Partial<MemoryData>) {
      const rec = this.records.find((r) => r.id === id);
      if (!rec) throw new Error(ERR.NOT_FOUND);
      if (rec.data.kind === "reminder") throw new Error(ERR.READONLY); // reminders belong to AssistantView
      const next: MemoryData = { ...rec.data, ...patch, updatedAt: new Date().toISOString() };
      if (!next.text.trim()) throw new Error(ERR.EMPTY);
      if (patch.tags) next.tags = cleanTags(patch.tags);
      try {
        await push(id, next, rec.revision);
      } finally {
        await this.load(); // always resync (also after a 409 so the user sees the newest state)
      }
    },

    archive(id: string, value = true) {
      return this.update(id, { archived: value, archivedAt: value ? new Date().toISOString() : undefined });
    },
    addLink(id: string, link: MemoryLink) {
      const rec = this.records.find((r) => r.id === id);
      return this.update(id, { links: addLink(rec?.data.links, link) });
    },
    removeLink(id: string, link: MemoryLink) {
      const rec = this.records.find((r) => r.id === id);
      return this.update(id, { links: removeLink(rec?.data.links, link) });
    },

    async remove(id: string) {
      const rec = this.records.find((r) => r.id === id);
      if (!rec) throw new Error(ERR.NOT_FOUND);
      try {
        await push(id, {}, rec.revision, true);
      } finally {
        await this.load();
      }
    },

    search(query: string, filters: Filters = {}) {
      return searchMemories(this.records, query, filters);
    },
    relevant(context: string, limit = 5) {
      return retrieveRelevant(this.records, context, limit);
    },
    clear() {
      this.records = [];
      this.syncRev = 0;
    },
  },
});
