<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { pullAll, pushEncrypted } from "../services/api-client";

interface MemoryItem {
  text: string;
  category: string;
  createdAt: string;
}
interface StoredItem { id: string; revision: number; deleted: boolean; data: MemoryItem | null; }
const draft = ref("");
const items = ref<StoredItem[]>([]);
const busy = ref(false);
const error = ref("");
const notice = ref("");
const query = ref("");
const categories = ["شخصي", "عمل", "عائلة", "مالي", "صحة", "عام"];
const visibleItems = computed(() => {
  const q = query.value.trim().toLocaleLowerCase();
  return items.value.filter(x => x.data && (!q || (x.data.text + " " + x.data.category).toLocaleLowerCase().includes(q)));
});
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
    const id = crypto.randomUUID();
    const data: MemoryItem = { text, category: detectCategory(text), createdAt: new Date().toISOString() };
    await pushEncrypted("memory", id, data, 0);
    draft.value = "";
    notice.value = "تم حفظ المعلومة مشفّرة داخل ذاكرتك الشخصية.";
    await load();
  } catch (e: any) { error.value = e?.message || "لم نتمكن من الحفظ."; }
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
      <textarea id="memory-input" v-model="draft" rows="4" maxlength="5000" placeholder="مثال: موعد تجديد جواز السفر يوم 15 ديسمبر..."></textarea>
      <div class="lv-capture-foot"><small>{{ draft.length }} / 5000</small><button class="lv-add" :disabled="!draft.trim() || busy" @click="saveMemory">{{ busy ? "جارٍ الحفظ..." : "احفظ في ذاكرتي ✦" }}</button></div>
      <p class="lv-assistant-hint">التصنيف الحالي تلقائي ومبدئي. لا يتم إنشاء تذكير أو موعد تلقائيًا في هذه المرحلة.</p>
    </section>
    <p v-if="notice" class="lv-assistant-success" role="status">{{ notice }}</p><p v-if="error" class="lv-vault-error" role="alert">{{ error }}</p>
    <section class="lv-memory-section"><div class="lv-memory-heading"><div><span class="lv-vault-kicker">YOUR SAVED NOTES</span><h2>ذاكرتك المحفوظة</h2></div><input v-model="query" aria-label="بحث في الذكريات" placeholder="ابحث في ذكرياتك..." /></div>
      <div v-if="visibleItems.length" class="lv-memory-list"><article v-for="item in visibleItems" :key="item.id" class="lv-memory-card"><div><span class="lv-memory-category">{{ item.data?.category }}</span><time>{{ item.data?.createdAt ? new Date(item.data.createdAt).toLocaleString('ar-SA') : '' }}</time></div><p>{{ item.data?.text }}</p></article></div>
      <div v-else class="lv-vault-empty"><span class="lv-empty-symbol">✧</span><b>{{ query ? "لا توجد نتائج مطابقة" : "ذاكرتك تبدأ من هنا" }}</b><small>{{ query ? "جرّب كلمات بحث أخرى." : "احفظ أول معلومة لتجدها هنا لاحقًا." }}</small></div>
    </section>
    <footer class="lv-vault-footer"><span>LifeVault AI · ذاكرتك ملكك</span><span>لا نرسل النص إلى خدمة ذكاء اصطناعي خارجية في هذه النسخة.</span></footer>
  </main>
</template>
