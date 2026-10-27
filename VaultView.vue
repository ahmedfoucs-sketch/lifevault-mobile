<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useVaultStore, type VaultEntry } from "../stores/vault";

const vault = useVaultStore();
const editingId = ref<string | undefined>();
const showForm = ref(false);
const revealed = ref<Record<string, boolean>>({});
const busy = ref(false);
const error = ref("");

const empty = (): VaultEntry => ({ title: "", username: "", password: "", notes: "" });
const form = reactive<VaultEntry>(empty());

onMounted(() => {
  if (!vault.rows.length) vault.load();
});

function openNew() {
  Object.assign(form, empty());
  editingId.value = undefined;
  showForm.value = true;
}

function openEdit(id: string) {
  const r = vault.rows.find((x) => x.id === id);
  if (!r) return;
  Object.assign(form, { title: r.title, username: r.username, password: r.password, notes: r.notes });
  editingId.value = id;
  showForm.value = true;
}

async function submit() {
  error.value = "";
  busy.value = true;
  try {
    await vault.save({ ...form }, editingId.value);
    showForm.value = false;
  } catch (e: any) {
    error.value = e?.body?.detail ?? e?.message ?? String(e);
  } finally {
    busy.value = false;
  }
}

async function del(id: string) {
  if (!confirm("حذف هذا العنصر؟")) return;
  error.value = "";
  try {
    await vault.remove(id);
  } catch (e: any) {
    error.value = e?.body?.detail ?? e?.message ?? String(e);
  }
}

function copy(text: string) {
  navigator.clipboard?.writeText(text);
}
</script>

<template>
  <main class="mx-auto max-w-xl space-y-4 p-4" dir="rtl">
    <header class="flex items-center justify-between">
      <RouterLink to="/dashboard" class="text-sm text-indigo-600">← رجوع</RouterLink>
      <h1 class="text-2xl font-bold">الخزنة</h1>
      <button class="rounded-lg bg-indigo-600 px-3 py-1 text-white" @click="openNew">+ جديد</button>
    </header>

    <p v-if="error || vault.error" class="rounded-lg bg-red-100 p-3 text-sm text-red-800">
      {{ error || vault.error }}
    </p>
    <p v-if="vault.loading" class="text-center text-slate-500">جارٍ التحميل…</p>
    <p v-else-if="!vault.rows.length" class="text-center text-slate-500">لا توجد عناصر بعد.</p>

    <ul class="space-y-3">
      <li v-for="r in vault.rows" :key="r.id" class="space-y-2 rounded-2xl border bg-white p-4">
        <div class="flex items-center justify-between">
          <strong>{{ r.title || "(بدون عنوان)" }}</strong>
          <div class="flex gap-2 text-sm">
            <button class="text-indigo-600" @click="openEdit(r.id)">تعديل</button>
            <button class="text-red-600" @click="del(r.id)">حذف</button>
          </div>
        </div>
        <div v-if="r.username" class="flex items-center justify-between text-sm" dir="ltr">
          <span>{{ r.username }}</span>
          <button class="text-indigo-600" @click="copy(r.username)">copy</button>
        </div>
        <div class="flex items-center justify-between text-sm" dir="ltr">
          <span class="font-mono">{{ revealed[r.id] ? r.password : "••••••••" }}</span>
          <span class="flex gap-3">
            <button class="text-indigo-600" @click="revealed[r.id] = !revealed[r.id]">
              {{ revealed[r.id] ? "hide" : "show" }}
            </button>
            <button class="text-indigo-600" @click="copy(r.password)">copy</button>
          </span>
        </div>
        <p v-if="r.notes" class="whitespace-pre-wrap text-sm text-slate-500">{{ r.notes }}</p>
      </li>
    </ul>

    <div
      v-if="showForm"
      class="fixed inset-0 z-10 flex items-end bg-black/40 sm:items-center sm:justify-center"
    >
      <form class="w-full space-y-3 rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl" @submit.prevent="submit">
        <h2 class="text-lg font-semibold">{{ editingId ? "تعديل عنصر" : "عنصر جديد" }}</h2>
        <input v-model="form.title" placeholder="العنوان" required class="w-full rounded-xl border p-3" />
        <input v-model="form.username" placeholder="اسم المستخدم" dir="ltr" class="w-full rounded-xl border p-3" />
        <input v-model="form.password" placeholder="كلمة المرور" dir="ltr" class="w-full rounded-xl border p-3" />
        <textarea v-model="form.notes" rows="3" placeholder="ملاحظات" class="w-full rounded-xl border p-3" />
        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-xl border p-3" @click="showForm = false">إلغاء</button>
          <button
            type="submit"
            :disabled="busy"
            class="flex-1 rounded-xl bg-indigo-600 p-3 text-white disabled:opacity-50"
          >
            {{ busy ? "…" : "حفظ" }}
          </button>
        </div>
      </form>
    </div>
  </main>
</template>
