<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useVaultStore, type VaultEntry } from "../stores/vault";

const vault = useVaultStore();
const editingId = ref<string | undefined>();
const showForm = ref(false);
const revealed = ref<Record<string, boolean>>({});
const busy = ref(false);
const error = ref("");
const search = ref("");
const empty = (): VaultEntry => ({ title: "", username: "", password: "", notes: "" });
const form = reactive<VaultEntry>(empty());
const filteredRows = computed(() => {
  const q = search.value.trim().toLocaleLowerCase();
  if (!q) return vault.rows;
  return vault.rows.filter((r) => [r.title, r.username, r.notes].some((v) => (v || "").toLocaleLowerCase().includes(q)));
});
onMounted(() => { if (!vault.rows.length) vault.load(); });
function openNew() { Object.assign(form, empty()); editingId.value = undefined; showForm.value = true; }
function openEdit(id: string) {
  const r = vault.rows.find((x) => x.id === id);
  if (!r) return;
  Object.assign(form, { title: r.title, username: r.username, password: r.password, notes: r.notes });
  editingId.value = id; showForm.value = true;
}
async function submit() {
  error.value = ""; busy.value = true;
  try { await vault.save({ ...form }, editingId.value); showForm.value = false; }
  catch (e: any) { error.value = e?.body?.detail ?? e?.message ?? String(e); }
  finally { busy.value = false; }
}
async function del(id: string) {
  if (!confirm("هل تريد حذف هذا العنصر نهائيًا من عرض الخزنة؟")) return;
  error.value = "";
  try { await vault.remove(id); }
  catch (e: any) { error.value = e?.body?.detail ?? e?.message ?? String(e); }
}
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); }
  catch { error.value = "تعذر النسخ. تحقق من صلاحية الحافظة في المتصفح."; }
}
</script>

<template>
  <main class="lv-vault-shell" dir="rtl">
    <header class="lv-vault-top">
      <RouterLink to="/dashboard" class="lv-back">→ لوحة التحكم</RouterLink>
      <div class="lv-vault-brand"><span>◈</span><b>LifeVault <em>AI</em></b></div>
    </header>

    <section class="lv-vault-hero">
      <div><span class="lv-vault-kicker">PRIVATE & ENCRYPTED SPACE</span><h1>خزنتك <span>الآمنة</span></h1><p>مكان واحد ومنظّم لحفظ بياناتك المهمة والوصول إليها بأمان.</p></div>
      <div class="lv-vault-count"><strong>{{ vault.rows.length }}</strong><span>عنصر محفوظ</span></div>
    </section>

    <div v-if="error || vault.error" class="lv-vault-error" role="alert">{{ error || vault.error }}</div>

    <section class="lv-vault-toolbar">
      <label class="lv-search"><span>⌕</span><input v-model="search" type="search" placeholder="ابحث بالعنوان أو اسم المستخدم..." aria-label="بحث في الخزنة" /></label>
      <button class="lv-add" @click="openNew"><span>＋</span> إضافة عنصر</button>
    </section>

    <div v-if="vault.loading" class="lv-vault-empty"><span class="lv-empty-symbol">◌</span><b>جارٍ تحميل خزنتك</b><small>نسترجع العناصر المشفّرة…</small></div>
    <div v-else-if="!vault.rows.length" class="lv-vault-empty"><span class="lv-empty-symbol">◈</span><b>خزنتك جاهزة لاستقبال أول عنصر</b><small>ابدأ بإضافة بيانات الدخول أو أي معلومات تريد حفظها.</small><button class="lv-add" @click="openNew">＋ أضف أول عنصر</button></div>
    <div v-else-if="!filteredRows.length" class="lv-vault-empty"><span class="lv-empty-symbol">⌕</span><b>لا توجد نتائج مطابقة</b><small>جرّب كلمة بحث مختلفة.</small></div>

    <section v-else class="lv-vault-grid">
      <article v-for="r in filteredRows" :key="r.id" class="lv-vault-card">
        <div class="lv-card-head"><span class="lv-card-icon">◈</span><div class="lv-card-actions"><button aria-label="تعديل العنصر" title="تعديل" @click="openEdit(r.id)">✎</button><button aria-label="حذف العنصر" title="حذف" @click="del(r.id)">⌫</button></div></div>
        <h2>{{ r.title || "عنصر بدون عنوان" }}</h2>
        <div v-if="r.username" class="lv-secret-row" dir="ltr"><span>{{ r.username }}</span><button @click="copy(r.username)">نسخ</button></div>
        <div class="lv-secret-row" dir="ltr"><span class="lv-password">{{ revealed[r.id] ? r.password : "••••••••••••" }}</span><div><button @click="revealed[r.id] = !revealed[r.id]">{{ revealed[r.id] ? "إخفاء" : "عرض" }}</button><button @click="copy(r.password)">نسخ</button></div></div>
        <p v-if="r.notes" class="lv-card-notes">{{ r.notes }}</p>
        <div class="lv-card-foot"><span><i></i> محفوظ في خزنتك</span><span>مشفر</span></div>
      </article>
    </section>

    <footer class="lv-vault-footer"><span>✦ بياناتك ملكك، وخصوصيتك أولويتنا.</span><RouterLink to="/settings">إعدادات الأمان ←</RouterLink></footer>

    <div v-if="showForm" class="lv-modal-backdrop" @click.self="showForm = false">
      <form class="lv-modal" @submit.prevent="submit">
        <div class="lv-modal-head"><div><span class="lv-vault-kicker">SECURE ITEM</span><h2>{{ editingId ? "تعديل العنصر" : "إضافة عنصر جديد" }}</h2></div><button type="button" class="lv-modal-close" aria-label="إغلاق" @click="showForm = false">×</button></div>
        <label class="lv-field">اسم العنصر<input v-model="form.title" placeholder="مثال: البريد الإلكتروني" required /></label>
        <label class="lv-field">اسم المستخدم<input v-model="form.username" placeholder="اسم المستخدم أو البريد" dir="ltr" /></label>
        <label class="lv-field">كلمة المرور<input v-model="form.password" placeholder="أدخل كلمة المرور" dir="ltr" autocomplete="new-password" /></label>
        <label class="lv-field">ملاحظات<textarea v-model="form.notes" rows="3" placeholder="معلومات إضافية (اختياري)" /></label>
        <div class="lv-modal-actions"><button type="button" class="lv-cancel" @click="showForm = false">إلغاء</button><button type="submit" class="lv-add" :disabled="busy">{{ busy ? "جارٍ الحفظ…" : "حفظ بأمان" }}</button></div>
      </form>
    </div>
  </main>
</template>
