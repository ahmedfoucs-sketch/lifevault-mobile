<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useMemoryStore, ERR } from "../stores/memory";
import {
  CATEGORIES, LINK_KINDS, addLink, categoryId, categoryLabel, cleanTags, removeLink,
  type CategoryId, type Lang, type LinkKind, type MemoryLink, type MemoryRecord,
} from "../services/memory-engine";

const store = useMemoryStore();

/* ---------- i18n (AR / EN) ---------- */
const T = {
  ar: {
    back: "← لوحة التحكم", kicker: "SECOND BRAIN", title: "ذاكرتك الثانية",
    sub: "احفظ أي معلومة بلغتك الطبيعية، صنّفها واربطها بالمشاريع والأشخاص والمستندات والأحداث، واسترجعها عند الحاجة.",
    badge: "✦ مشفّرة من جهازك · بحث محلي بدون خدمات خارجية",
    capLabel: "ما الذي تريد أن تتذكره؟",
    capPh: "مثال: اجتماع مشروع الرياض الأسبوع القادم مع @أحمد #عمل",
    capHint: "استخدم #وسم لإضافة وسم و @اسم لربط شخص. يُكتشف التصنيف تلقائيًا ويمكنك تغييره.",
    autoCat: "تصنيف تلقائي", save: "احفظ في ذاكرتي ✦", saving: "جارٍ الحفظ...",
    recallTitle: "استرجع ما أعرفه", recallPh: "عن ماذا تريد أن تتذكر؟ مثال: موعد الدكتور", recallBtn: "استرجع",
    recallNone: "لا توجد ذكريات مرتبطة بهذا السؤال.",
    searchPh: "ابحث في ذاكرتك...", all: "الكل", active: "النشطة", archived: "المؤرشفة",
    reminder: "تذكير", reminderNote: "التذكيرات تُدار من مساعد LifeVault", openAssistant: "فتح المساعد ←",
    edit: "تعديل", archive: "أرشفة", restore: "استعادة", del: "حذف",
    delConfirm: "هل تريد حذف هذه الذاكرة نهائيًا؟",
    cancel: "إلغاء", saveEdit: "حفظ التعديل", category: "التصنيف", tags: "الوسوم (مفصولة بفاصلة)", textLbl: "النص",
    links: "الروابط", linkKind: { project: "مشروع", person: "شخص", document: "مستند", event: "حدث" } as Record<LinkKind, string>,
    linkPh: "اسم الرابط", addLink: "إضافة رابط",
    emptyTitle: "ذاكرتك تبدأ من هنا", emptyText: "احفظ أول معلومة لتجدها هنا لاحقًا.",
    noResults: "لا توجد نتائج مطابقة", noResultsText: "جرّب كلمات أو فلاتر أخرى.",
    saved: "تم حفظ الذاكرة مشفّرة.", updated: "تم تحديث الذاكرة.", deleted: "تم حذف الذاكرة.",
    archivedOk: "تمت الأرشفة.", restoredOk: "تمت الاستعادة.",
    errors: {
      [ERR.EMPTY]: "الرجاء كتابة نص.", [ERR.CONFLICT]: "تم تعديل هذه الذاكرة من جهاز آخر. حدّثنا القائمة، أعد المحاولة.",
      [ERR.NOT_FOUND]: "الذاكرة غير موجودة.", [ERR.READONLY]: "هذا تذكير، يُعدَّل من مساعد LifeVault.",
    } as Record<string, string>,
    footer: "LifeVault AI · ذاكرتك ملكك", footer2: "لا يُرسل أي نص إلى خدمة ذكاء اصطناعي خارجية.",
    refresh: "تحديث", count: "ذاكرة",
  },
  en: {
    back: "← Dashboard", kicker: "SECOND BRAIN", title: "Your Second Brain",
    sub: "Capture anything in natural language, categorise it, link it to projects, people, documents and events, and recall it when needed.",
    badge: "✦ Encrypted on your device · local search, no external services",
    capLabel: "What do you want to remember?",
    capPh: "e.g. Riyadh project meeting next week with @Ahmed #work",
    capHint: "Use #tag to add a tag and @name to link a person. Category is detected automatically; you can change it.",
    autoCat: "Auto category", save: "Save to my memory ✦", saving: "Saving...",
    recallTitle: "Recall what I know", recallPh: "What do you need to remember? e.g. doctor appointment", recallBtn: "Recall",
    recallNone: "No memories related to this question.",
    searchPh: "Search your memory...", all: "All", active: "Active", archived: "Archived",
    reminder: "Reminder", reminderNote: "Reminders are managed in the LifeVault assistant", openAssistant: "Open assistant →",
    edit: "Edit", archive: "Archive", restore: "Restore", del: "Delete",
    delConfirm: "Delete this memory permanently?",
    cancel: "Cancel", saveEdit: "Save changes", category: "Category", tags: "Tags (comma separated)", textLbl: "Text",
    links: "Links", linkKind: { project: "Project", person: "Person", document: "Document", event: "Event" } as Record<LinkKind, string>,
    linkPh: "Link name", addLink: "Add link",
    emptyTitle: "Your memory starts here", emptyText: "Save your first note and you'll find it here later.",
    noResults: "No matching results", noResultsText: "Try other words or filters.",
    saved: "Memory saved (encrypted).", updated: "Memory updated.", deleted: "Memory deleted.",
    archivedOk: "Archived.", restoredOk: "Restored.",
    errors: {
      [ERR.EMPTY]: "Please enter some text.", [ERR.CONFLICT]: "This memory was changed on another device. The list was refreshed, please retry.",
      [ERR.NOT_FOUND]: "Memory not found.", [ERR.READONLY]: "This is a reminder; edit it in the LifeVault assistant.",
    } as Record<string, string>,
    footer: "LifeVault AI · your memory is yours", footer2: "No text is sent to any external AI service.",
    refresh: "Refresh", count: "memories",
  },
};

const readLang = (): Lang => { try { return localStorage.getItem("lv.lang") === "en" ? "en" : "ar"; } catch { return "ar"; } };
const lang = ref<Lang>(readLang());
const t = computed(() => T[lang.value]);
const dir = computed(() => (lang.value === "ar" ? "rtl" : "ltr"));
const locale = computed(() => (lang.value === "ar" ? "ar-SA" : "en-US"));
function toggleLang() {
  lang.value = lang.value === "ar" ? "en" : "ar";
  try { localStorage.setItem("lv.lang", lang.value); } catch { /* storage unavailable */ }
}

/* ---------- state ---------- */
const draft = ref("");
const draftCategory = ref<CategoryId | "auto">("auto");
const busy = ref(false);
const notice = ref("");
const error = ref("");
const query = ref("");
const catFilter = ref<CategoryId | "all">("all");
const showArchived = ref(false);
const linkFilter = ref<MemoryLink | null>(null);
const recallText = ref("");
const recallResults = ref<MemoryRecord[] | null>(null);

const editing = ref<string | null>(null);
const form = reactive({ text: "", category: "general" as CategoryId, tags: "", links: [] as MemoryLink[], newKind: "project" as LinkKind, newLabel: "" });

const results = computed(() =>
  store.search(query.value, {
    archived: showArchived.value,
    category: catFilter.value,
    link: linkFilter.value ?? undefined,
  }).map((s) => s.record)
);
const topLinks = computed(() =>
  LINK_KINDS.flatMap((k) => store.links[k].slice(0, 4).map((l) => ({ kind: k, label: l.label })))
);
watch(showArchived, () => { linkFilter.value = null; });

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString(locale.value, { dateStyle: "medium", timeStyle: "short" }) : "");
const isReminder = (r: MemoryRecord) => r.data.kind === "reminder";
const sameFilter = (l: MemoryLink) => !!linkFilter.value && linkFilter.value.kind === l.kind && linkFilter.value.label === l.label;

function fail(e: any) {
  const code = String(e?.message ?? "");
  error.value = t.value.errors[code] ?? e?.message ?? String(e);
}
async function run(fn: () => Promise<void>, ok: string) {
  if (busy.value) return;
  busy.value = true; error.value = ""; notice.value = "";
  try { await fn(); notice.value = ok; } catch (e) { fail(e); } finally { busy.value = false; }
}

/* ---------- actions ---------- */
const save = () => run(async () => {
  await store.capture(draft.value, draftCategory.value === "auto" ? {} : { category: draftCategory.value });
  draft.value = ""; draftCategory.value = "auto";
}, t.value.saved);

function recall() {
  recallResults.value = recallText.value.trim() ? store.relevant(recallText.value, 5).map((s) => s.record) : null;
}

function startEdit(r: MemoryRecord) {
  editing.value = r.id;
  form.text = r.data.text;
  form.category = categoryId(r.data.category) ?? "general";
  form.tags = (r.data.tags ?? []).join(", ");
  form.links = [...(r.data.links ?? [])];
  form.newLabel = ""; form.newKind = "project";
}
function formAddLink() {
  form.links = addLink(form.links, { kind: form.newKind, label: form.newLabel });
  form.newLabel = "";
}
const saveEdit = () => run(async () => {
  const cat = CATEGORIES.find((c) => c.id === form.category)!;
  await store.update(editing.value!, {
    text: form.text.trim(), category: cat.ar,
    tags: cleanTags(form.tags.split(/[,،]/)), links: form.links,
  });
  editing.value = null;
}, t.value.updated);
const toggleArchive = (r: MemoryRecord) => run(() => store.archive(r.id, !r.data.archived), r.data.archived ? t.value.restoredOk : t.value.archivedOk);
const remove = (r: MemoryRecord) => { if (confirm(t.value.delConfirm)) return run(() => store.remove(r.id), t.value.deleted); };

onMounted(() => store.load());
</script>

<template>
  <main class="mv" :dir="dir">
    <header class="mv-top">
      <RouterLink to="/dashboard" class="lv-back">{{ t.back }}</RouterLink>
      <div class="mv-top-end">
        <button class="mv-lang" type="button" @click="toggleLang">{{ lang === "ar" ? "EN" : "ع" }}</button>
        <div class="lv-vault-brand"><span>✦</span><b>LifeVault <em>AI</em></b></div>
      </div>
    </header>

    <section class="lv-assistant-hero">
      <span class="lv-vault-kicker">{{ t.kicker }}</span>
      <h1>{{ t.title }}</h1>
      <p>{{ t.sub }}</p>
      <div class="lv-assistant-badge">{{ t.badge }}</div>
    </section>

    <section class="lv-capture">
      <label for="mv-input">{{ t.capLabel }}</label>
      <textarea id="mv-input" v-model="draft" rows="4" maxlength="5000" :placeholder="t.capPh"></textarea>
      <div class="mv-row">
        <select v-model="draftCategory" :aria-label="t.category">
          <option value="auto">{{ t.autoCat }}</option>
          <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c[lang] }}</option>
        </select>
        <small>{{ draft.length }} / 5000</small>
        <button class="lv-add" type="button" :disabled="!draft.trim() || busy" @click="save">{{ busy ? t.saving : t.save }}</button>
      </div>
      <p class="lv-assistant-hint">{{ t.capHint }}</p>
    </section>

    <section class="lv-capture mv-recall">
      <h2>{{ t.recallTitle }}</h2>
      <div class="mv-row">
        <input v-model="recallText" :placeholder="t.recallPh" @keydown.enter="recall">
        <button class="lv-add" type="button" @click="recall">{{ t.recallBtn }}</button>
      </div>
      <template v-if="recallResults">
        <p v-if="!recallResults.length" class="lv-assistant-hint">{{ t.recallNone }}</p>
        <ul v-else class="mv-recall-list"><li v-for="r in recallResults" :key="r.id"><span class="lv-memory-category">{{ categoryLabel(r.data.category, lang) }}</span> {{ r.data.title || r.data.text }}</li></ul>
      </template>
    </section>

    <p v-if="notice" class="lv-assistant-success" role="status">{{ notice }}</p>
    <p v-if="error || store.error" class="lv-vault-error" role="alert">{{ error || store.error }}</p>

    <section class="lv-memory-section">
      <div class="lv-memory-heading">
        <div><span class="lv-vault-kicker">{{ results.length }} {{ t.count }}</span><h2>{{ t.title }}</h2></div>
        <input v-model="query" :aria-label="t.searchPh" :placeholder="t.searchPh">
      </div>

      <div class="mv-chips" role="group">
        <button type="button" :class="{ on: !showArchived }" @click="showArchived = false">{{ t.active }} ({{ store.active.length }})</button>
        <button type="button" :class="{ on: showArchived }" @click="showArchived = true">{{ t.archived }} ({{ store.archived.length }})</button>
      </div>
      <div class="mv-chips" role="group">
        <button type="button" :class="{ on: catFilter === 'all' }" @click="catFilter = 'all'">{{ t.all }}</button>
        <button v-for="c in CATEGORIES" :key="c.id" type="button" :class="{ on: catFilter === c.id }" @click="catFilter = c.id">{{ c[lang] }}</button>
      </div>
      <div v-if="topLinks.length && !showArchived" class="mv-chips" role="group">
        <button v-for="l in topLinks" :key="l.kind + l.label" type="button" :class="{ on: sameFilter(l) }" @click="linkFilter = sameFilter(l) ? null : l">{{ t.linkKind[l.kind] }}: {{ l.label }}</button>
      </div>

      <div v-if="results.length" class="lv-memory-list">
        <article v-for="r in results" :key="r.id" class="lv-memory-card">
          <template v-if="editing === r.id">
            <label>{{ t.textLbl }}</label><textarea v-model="form.text" rows="4" maxlength="5000"></textarea>
            <label>{{ t.category }}</label>
            <select v-model="form.category"><option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c[lang] }}</option></select>
            <label>{{ t.tags }}</label><input v-model="form.tags">
            <label>{{ t.links }}</label>
            <div class="mv-linklist"><span v-for="l in form.links" :key="l.kind + l.label" class="mv-link">{{ t.linkKind[l.kind] }}: {{ l.label }} <button type="button" :aria-label="t.del" @click="form.links = removeLink(form.links, l)">×</button></span></div>
            <div class="mv-row">
              <select v-model="form.newKind"><option v-for="k in LINK_KINDS" :key="k" :value="k">{{ t.linkKind[k] }}</option></select>
              <input v-model="form.newLabel" :placeholder="t.linkPh" maxlength="80" @keydown.enter.prevent="formAddLink">
              <button class="lv-cancel" type="button" :disabled="!form.newLabel.trim()" @click="formAddLink">{{ t.addLink }}</button>
            </div>
            <div class="mv-row">
              <button class="lv-cancel" type="button" @click="editing = null">{{ t.cancel }}</button>
              <button class="lv-add" type="button" :disabled="busy || !form.text.trim()" @click="saveEdit">{{ t.saveEdit }}</button>
            </div>
          </template>
          <template v-else>
            <div><span class="lv-memory-category">{{ isReminder(r) ? t.reminder : categoryLabel(r.data.category, lang) }}</span><time>{{ fmt(r.data.createdAt) }}</time></div>
            <h3 v-if="r.data.title" class="mv-title">{{ r.data.title }}</h3>
            <p class="mv-text">{{ r.data.text }}</p>
            <div v-if="r.data.tags?.length || r.data.links?.length" class="mv-linklist">
              <span v-for="tg in r.data.tags" :key="'t' + tg" class="mv-tag">#{{ tg }}</span>
              <span v-for="l in r.data.links" :key="l.kind + l.label" class="mv-link">{{ t.linkKind[l.kind] }}: {{ l.label }}</span>
            </div>
            <template v-if="isReminder(r)">
              <p class="lv-reminder-date">{{ t.reminderNote }} · {{ fmt(r.data.dueAt) }}</p>
              <RouterLink to="/assistant" class="lv-cancel">{{ t.openAssistant }}</RouterLink>
            </template>
            <div v-else class="mv-row">
              <button class="lv-add" type="button" @click="startEdit(r)">{{ t.edit }}</button>
              <button class="lv-cancel" type="button" :disabled="busy" @click="toggleArchive(r)">{{ r.data.archived ? t.restore : t.archive }}</button>
              <button class="lv-cancel" type="button" :disabled="busy" @click="remove(r)">{{ t.del }}</button>
            </div>
          </template>
        </article>
      </div>
      <div v-else class="lv-vault-empty">
        <span class="lv-empty-symbol">✧</span>
        <b>{{ query || catFilter !== 'all' || linkFilter ? t.noResults : t.emptyTitle }}</b>
        <small>{{ query || catFilter !== 'all' || linkFilter ? t.noResultsText : t.emptyText }}</small>
      </div>
    </section>

    <footer class="lv-vault-footer"><span>{{ t.footer }}</span><span>{{ t.footer2 }}</span></footer>
  </main>
</template>

<style scoped>
.mv { max-width: 920px; margin: 0 auto; padding: 16px 16px 40px; }
.mv-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.mv-top-end { display: flex; align-items: center; gap: 10px; }
.mv-lang { min-width: 40px; height: 36px; border-radius: 18px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); color: inherit; font-weight: 700; cursor: pointer; }
.mv-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.mv-row > input { flex: 1; min-width: 140px; }
.mv-row > .lv-add { margin-inline-start: auto; }
.mv-recall h2 { margin: 0 0 4px; font-size: 1.05rem; }
.mv-recall-list { list-style: none; padding: 0; margin: 10px 0 0; display: grid; gap: 8px; }
.mv-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.mv-chips button { padding: 6px 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.05); color: inherit; cursor: pointer; font-size: .85rem; }
.mv-chips button.on { background: rgba(124,92,255,.35); border-color: #8b6cff; }
.mv-title { margin: 8px 0 0; font-size: 1rem; }
.mv-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.mv-linklist { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.mv-tag, .mv-link { padding: 3px 10px; border-radius: 12px; font-size: .78rem; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); }
.mv-link button { background: none; border: 0; color: inherit; cursor: pointer; padding: 0 2px; }
.lv-memory-card label { display: block; margin: 10px 0 4px; font-size: .85rem; opacity: .8; }
.lv-memory-card textarea, .lv-memory-card input, .lv-memory-card select, .mv-recall input, .lv-capture select { width: 100%; box-sizing: border-box; }
.lv-capture select { width: auto; }
</style>
