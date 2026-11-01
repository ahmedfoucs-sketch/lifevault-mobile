<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { pullAll, pushEncrypted } from "../services/api-client";

interface MemoryItem {
  text: string;
  category: string;
  createdAt: string;
  kind?: "note" | "reminder";
  dueAt?: string;
  reminderStatus?: "pending" | "done";
}
interface StoredItem { id: string; revision: number; deleted: boolean; data: MemoryItem | null; }
const draft = ref("");
const items = ref<StoredItem[]>([]);
const busy = ref(false);
const error = ref("");
const notice = ref("");
const query = ref("");
const reminderDraft = ref<{ title: string; dueAt: string } | null>(null);
const visibleItems = computed(() => {
  const q = query.value.trim().toLocaleLowerCase();
  return items.value.filter(x => x.data && (!q || (x.data.text + " " + x.data.category).toLocaleLowerCase().includes(q)));
});
function parseReminder(text: string) {
  const now = new Date();
  const match = text.match(/(?:يوم\s*)?(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  let due: Date | null = null;
  if (match) {
    due = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 9, 0, 0);
    if (due.getFullYear() !== Number(match[3]) || due.getMonth() !== Number(match[2]) - 1 || due.getDate() !== Number(match[1])) due = null;
  } else if (/بكرة|غدًا|غدا/.test(text)) {
    due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
  } else {
    const days = text.match(/بعد\s+(\d+)\s+أيام?/);
    if (days) due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(days[1]), 9, 0, 0);
  }
  if (!due || due.getTime() <= now.getTime()) return null;
  const title = text.replace(/(?:فكرني|ذكرني|تذكير|موعد|لا تنسى|لا تنس)/g, "").trim() || text;
  return { title, dueAt: due.toISOString() };
}
function detectCategory(text: string) {
  const s = text.toLocaleLowerCase();
  if (/عمل|وظيف|شركة|اجتماع|مشروع|دوام/.test(s)) return "عمل";
  if (/أب|أم|ابن|ابنة|زوج|زوجة|عائلة|أسرة/.test(s)) return "عائلة";
  if (/قسط|راتب|مال|فلوس|فاتورة|دفع|بنك/.test(s)) return "مالي";
  if (/طبيب|دواء|موعد طبي|تحليل|صحة/.test(s)) return "صحة";
  if (/أنا|شخصي|أفضل|أحب|تفضيل/.test(s)) return "شخصي";
  return "عام";
}
async function load() {
  error.value = "";
  try {
    const result = await pullAll<MemoryItem>(0);
    items.value = result.items.filter(x => x.type === "memory" && !x.deleted && x.data) as StoredItem[];
    items.value.sort((a,b) => (b.data?.createdAt || "").localeCompare(a.data?.createdAt || ""));
  } catch (e: any) { error.value = e?.message || "تعذر تحميل الذكريات."; }
}
async function saveMemory() {
  const text = draft.value.trim();
  if (!text || busy.value) return;
  busy.value = true; error.value = ""; notice.value = "";
  try {
    const reminder = parseReminder(text);
    if (reminder) {
      reminderDraft.value = reminder;
      return;
    }
    const id = crypto.randomUUID();
    const data: MemoryItem = { text, category: detectCategory(text), createdAt: new Date().toISOString(), kind: "note" };
    await pushEncrypted("memory", id, data, 0);
    draft.value = "";
    notice.value = "تم حفظ المعلومة مشفّرة داخل ذاكرتك الشخصية.";
    await load();
  } catch (e: any) { error.value = e?.message || "لم نتمكن من الحفظ."; }
  finally { busy.value = false; }
}
async function confirmReminder() {
  if (!reminderDraft.value || busy.value) return;
  busy.value = true; error.value = "";
  try {
    const r = reminderDraft.value;
    const id = crypto.randomUUID();
    const data: MemoryItem = { text: r.title, category: detectCategory(r.title), createdAt: new Date().toISOString(), kind: "reminder", dueAt: r.dueAt, reminderStatus: "pending" };
    await pushEncrypted("memory", id, data, 0);
    reminderDraft.value = null;
    draft.value = "";
    notice.value = "تم حفظ التذكير مشفّرًا. تنبيه: لم يتم تفعيل إشعار تلقائي بعد.";
    await load();
  } catch (e: any) { error.value = e?.message || "تعذر حفظ التذكير."; }
  finally { busy.value = false; }
}
onMounted(load);
</script>

<template>
  <main class="lv-assistant" dir="rtl">
    <header class="lv-assistant-top"><RouterLink to="/dashboard" class="lv-back">← لوحة التحكم</RouterLink><div class="lv-vault-brand"><span>✦</span><b>LifeVault <em>AI</em></b></div></header>
    <section class="lv-assistant-hero"><span class="lv-vault-kicker">YOUR PERSONAL MEMORY</span><h1>مساعد <span>LifeVault</span></h1><p>اكتب أي معلومة تريد الاحتفاظ بها. سنصنفها مبدئيًا ونحفظها مشفّرة في ذاكرتك.</p><div class="lv-assistant-badge">✦ حفظ خاص ومشفّر من جهازك</div></section>
    <section class="lv-capture">
      <label for="memory-input">ما الذي تريد أن تتذكره؟</label>
      <textarea id="memory-input" v-model="draft" rows="4" maxlength="5000" placeholder="مثال: فكرني بتجديد الجواز يوم 15/12/2027"></textarea>
      <div class="lv-capture-foot"><small>{{ draft.length }} / 5000</small><button class="lv-add" :disabled="!draft.trim() || busy" @click="saveMemory">{{ busy ? "جارٍ الحفظ..." : "احفظ في ذاكرتي ✦" }}</button></div>
      <p class="lv-assistant-hint">إذا كتبت تاريخًا واضحًا، سيعرض المساعد اقتراح تذكير لتراجعه قبل الحفظ. لا تُرسل إشعارات تلقائية في هذه النسخة.</p>
    </section>
    <section v-if="reminderDraft" class="lv-capture lv-reminder-preview" aria-live="polite">
      <span class="lv-vault-kicker">REMINDER REVIEW</span><h2>هل تريد حفظ هذا كتذكير؟</h2>
      <p>{{ reminderDraft.title }}</p>
      <strong>{{ new Date(reminderDraft.dueAt).toLocaleString('ar-SA', { dateStyle: 'full', timeStyle: 'short' }) }}</strong>
      <div class="lv-capture-foot"><button class="lv-cancel" @click="reminderDraft = null">إلغاء</button><button class="lv-add" :disabled="busy" @click="confirmReminder">{{ busy ? "جارٍ الحفظ..." : "تأكيد وحفظ التذكير" }}</button></div>
    </section>
    <p v-if="notice" class="lv-assistant-success" role="status">{{ notice }}</p><p v-if="error" class="lv-vault-error" role="alert">{{ error }}</p>
    <section class="lv-memory-section"><div class="lv-memory-heading"><div><span class="lv-vault-kicker">YOUR SAVED NOTES</span><h2>ذاكرتك المحفوظة</h2></div><input v-model="query" aria-label="بحث في الذكريات" placeholder="ابحث في ذكرياتك..." /></div>
      <div v-if="visibleItems.length" class="lv-memory-list"><article v-for="item in visibleItems" :key="item.id" class="lv-memory-card"><div><span class="lv-memory-category">{{ item.data?.kind === 'reminder' ? 'تذكير' : item.data?.category }}</span><time>{{ item.data?.createdAt ? new Date(item.data.createdAt).toLocaleString('ar-SA') : '' }}</time></div><p>{{ item.data?.text }}</p><p v-if="item.data?.kind === 'reminder' && item.data?.dueAt" class="lv-reminder-date">موعد التذكير: {{ new Date(item.data.dueAt).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) }}</p></article></div>
      <div v-else class="lv-vault-empty"><span class="lv-empty-symbol">✧</span><b>{{ query ? "لا توجد نتائج مطابقة" : "ذاكرتك تبدأ من هنا" }}</b><small>{{ query ? "جرّب كلمات بحث أخرى." : "احفظ أول معلومة لتجدها هنا لاحقًا." }}</small></div>
    </section>
    <footer class="lv-vault-footer"><span>LifeVault AI · ذاكرتك ملكك</span><span>لا نرسل النص إلى خدمة ذكاء اصطناعي خارجية في هذه النسخة.</span></footer>
  </main>
</template>
