import { defineStore } from "pinia";
import { pullAll, pushEncrypted } from "../services/api-client";

export interface VaultEntry {
  title: string;
  username: string;
  password: string;
  notes: string;
}

export interface VaultRow extends VaultEntry {
  id: string;
  revision: number;
}

export const useVaultStore = defineStore("vault", {
  state: () => ({
    rows: [] as VaultRow[],
    counts: {} as Record<string, number>,
    syncRev: 0,
    loading: false,
    error: "",
  }),
  actions: {
    /** Full re-sync from revision 0 (simple + always consistent). */
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const { items, syncRev } = await pullAll<VaultEntry>(0);
        const live = items.filter((i) => !i.deleted && i.data);
        this.syncRev = syncRev;
        this.counts = live.reduce<Record<string, number>>((m, i) => {
          m[i.type] = (m[i.type] ?? 0) + 1;
          return m;
        }, {});
        this.rows = live
          .filter((i) => i.type === "vault")
          .map((i) => ({ id: i.id, revision: i.revision, ...(i.data as VaultEntry) }));
      } catch (e: any) {
        this.error = e?.body?.detail ?? e?.message ?? String(e);
      } finally {
        this.loading = false;
      }
    },
    async save(entry: VaultEntry, id?: string) {
      const existing = id ? this.rows.find((r) => r.id === id) : undefined;
      await pushEncrypted("vault", id ?? crypto.randomUUID(), entry, existing?.revision ?? 0);
      await this.load();
    },
    async remove(id: string) {
      const existing = this.rows.find((r) => r.id === id);
      await pushEncrypted("vault", id, {}, existing?.revision ?? 0, true);
      await this.load();
    },
    clear() {
      this.rows = [];
      this.counts = {};
      this.syncRev = 0;
    },
  },
});
