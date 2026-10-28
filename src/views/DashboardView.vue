<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { logout, getSession } from "../services/api-client";
import { useVaultStore } from "../stores/vault";

const router = useRouter();
const vault = useVaultStore();

const labels: Record<string, string> = {
  vault: "الخزنة",
  family: "العائلة",
  link: "الروابط",
  memory: "الذكريات",
  settings: "الإعدادات",
};

onMounted(() => vault.load());

function signOut() {
  logout();
  vault.clear();
  router.replace({ name: "login" });
}
</script>

<template>
  <main class="mx-auto max-w-xl space-y-6 p-4" dir="rtl">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">لوحة التحكم</h1>
      <button class="rounded-lg border px-3 py-1 text-sm" @click="signOut">خروج</button>
    </header>

    <p v-if="vault.error" class="rounded-lg bg-red-100 p-3 text-sm text-red-800">{{ vault.error }}</p>

    <section class="grid grid-cols-2 gap-3">
      <div
        v-for="(label, type) in labels"
        :key="type"
        class="rounded-2xl border bg-white p-4 text-center"
      >
        <div class="text-3xl font-bold">{{ vault.counts[type] ?? 0 }}</div>
        <div class="text-sm text-slate-500">{{ label }}</div>
      </div>
    </section>

    <p class="text-center text-xs text-slate-400" dir="ltr">
      sync_rev: {{ vault.syncRev }} · user: {{ getSession()?.userId }}
    </p>

    <nav class="grid gap-3">
      <RouterLink to="/vault" class="rounded-xl bg-indigo-600 p-3 text-center text-white">
        فتح الخزنة
      </RouterLink>
      <RouterLink to="/settings" class="rounded-xl border p-3 text-center">الإعدادات والأمان</RouterLink>
      <button
        class="rounded-xl border p-3 disabled:opacity-50"
        :disabled="vault.loading"
        @click="vault.load()"
      >
        {{ vault.loading ? "جارٍ المزامنة…" : "مزامنة الآن" }}
      </button>
    </nav>
  </main>
</template>
