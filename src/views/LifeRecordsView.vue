<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { pullAll, pushEncrypted } from "../services/api-client";

type ModuleKey = "documents" | "finance" | "assets" | "installments" | "calendar" | "family";
type Field = { key: string; label: string; type?: "text" | "date" | "number"; required?: boolean; hint?: string };
type ModuleConfig = { title: string; description: string; icon: string; fields: Field[] };
type CommanderRecord = {
  kind: "commander-record";
  commanderRecord: true;
  schemaVersion: 1;
  module: ModuleKey;
  text: string;
  category: string;
  title: string;
  fields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};
type StoredRecord = { id: string; revision: number; deleted: boolean; data: CommanderRecord | null };

const configs: Record<ModuleKey, ModuleConfig> = {
  documents: {
    title: "الوثائق والتجديدات", description: "سجّل بيانات الوثائق وتواريخ الانتهاء لمتابعتها.", icon: "▤",
    fields: [
      { key: "documentType", label: "نوع الوثيقة", required: true },
      { key: "reference", label: "رقم الوثيقة / المرجع" },
      { key: "issuer", label: "جهة الإصدار" },
      { key: "issuedAt", label: "تاريخ الإصدار", type: "date" },
      { key: "expiresAt", label: "تاريخ الانتهاء", type: "date" },
      { key: "notes", label: "ملاحظات" },
    ],
  },
  finance: {
    title: "الماليات والبنوك", description: "سجّل الحسابات والبطاقات والالتزامات المالية يدويًا.", icon: "◉",
    fields: [
      { key: "recordType", label: "نوع السجل (حساب، بطاقة، دخل، مصروف)", required: true },
      { key: "institution", label: "البنك / الجهة" },
      { key: "amount", label: "المبلغ", type: "number" },
      { key: "currency", label: "العملة (SAR / EGP)" },
      { key: "reference", label: "مرجع مختصر (بدون رقم بطاقة كامل أو CVV)" },
      { key: "notes", label: "ملاحظات" },
    ],
  },
  assets: {
    title: "العقارات والأصول", description: "احتفظ بسجل للممتلكات ومعلومات الملكية.", icon: "⌂",
    fields: [
      { key: "assetType", label: "نوع الأصل", required: true },
      { key: "location", label: "الموقع" },
      { key: "ownership", label: "صفة الملكية" },
      { key: "estimatedValue", label: "القيمة التقديرية", type: "number" },
      { key: "currency", label: "العملة (SAR / EGP)" },
      { key: "notes", label: "ملاحظات" },
    ],
  },
  installments: {
    title: "الأقساط والالتزامات", description: "تابع المبالغ والمواعيد والمدفوع والمتبقي.", icon: "⇄",
    fields: [
      { key: "provider", label: "الجهة / المستفيد", required: true },
      { key: "amount", label: "قيمة الالتزام", type: "number" },
      { key: "paidAmount", label: "المبلغ المدفوع", type: "number" },
      { key: "currency", label: "العملة (SAR / EGP)" },
      { key: "dueAt", label: "موعد الاستحقاق القادم", type: "date" },
      { key: "notes", label: "ملاحظات" },
    ],
  },
  calendar: {
    title: "الاجتماعات والتقويم", description: "سجّل المواعيد والمتابعات المهمة.", icon: "▦",
    fields: [
      { key: "eventType", label: "نوع الموعد", required: true },
      { key: "startsAt", label: "التاريخ", type: "date", required: true },
      { key: "location", label: "المكان / رابط الاجتماع" },
      { key: "notes", label: "ملاحظات" },
    ],
  },
  family: {
    title: "إدارة العائلة", description: "سجّل معلومات تنظيمية عائلية غير حساسة.", icon: "♡",
    fields: [
      { key: "relation", label: "صلة القرابة", required: true },
      { key: "occasion", label: "المناسبة / المتابعة" },
      { key: "date", label: "التاريخ", type: "date" },
      { key: "notes", label: "ملاحظات" },
    ],
  },
};

const route = useRoute();
const moduleKey = computed(() => String(route.params.module || "") as ModuleKey);
const config = computed(() => configs[moduleKey.value]);
const records = ref<StoredRecord[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const notice = ref("");
const editing = ref<StoredRecord | null>(null);
const formOpen = ref(false);
const draft = reactive<Record<string, string>>({});
const visibleRecords = computed(() => [...records.value].sort((a, b) =>
  (b.data?.updatedAt || "").localeCompare(a.data?.updatedAt || "")
));

function clearDraft() {
  Object.keys(draft).forEach(key => delete draft[key]);
  for (const field of config.value?.fields || []) draft[field.key] = "";
}
function startNew() {
  editing.value = null;
  clearDraft();
  formOpen.value = true;
  error.value = "";
  notice.value = "";
}
function startEdit(record: StoredRecord) {
  if (!record.data) return;
  editing.value = record;
  clearDraft();
  Object.assign(draft, record.data.fields);
  formOpen.value = true;
  error.value = "";
  notice.value = "";
}
async function load() {
  if (!config.value) return;
  loading.value = true;
  error.value = "";
  try {
    const result = await pullAll<CommanderRecord>(0);
    const latest = new Map<string, StoredRecord>();
    for (const item of result.items) {
      if (item.type !== "memory") continue;
      const current = latest.get(item.id);
      if (!current || item.revision > current.revision) {
        latest.set(item.id, { id: item.id, revision: item.revision, deleted: item.deleted, data: item.data as CommanderRecord | null });
      }
    }
    records.value = [...latest.values()].filter(item =>
      !item.deleted && item.data?.kind === "commander-record" &&
      item.data.commanderRecord === true && item.data.schemaVersion === 1 &&
      item.data.module === moduleKey.value
    );
  } catch (e: any) {
    error.value = e?.body?.detail || e?.message || "تعذر تحميل السجلات من LifeVault.";
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (!config.value || saving.value) return;
  const titleField = config.value.fields.find(field => field.required);
  const title = titleField ? (draft[titleField.key] || "").trim() : config.value.title;
  if (!title) {
    error.value = "أكمل الحقل الأساسي قبل الحفظ.";
    return;
  }
  for (const field of config.value.fields) {
    if (field.required && !(draft[field.key] || "").trim()) {
      error.value = `حقل "${field.label}" مطلوب.`;
      return;
    }
  }
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const now = new Date().toISOString();
    const id = editing.value?.id || crypto.randomUUID();
    const payload: CommanderRecord = {
      kind: "commander-record",
      commanderRecord: true,
      schemaVersion: 1,
      module: moduleKey.value,
      text: title,
      category: `إدارة الحياة · ${moduleKey.value}`,
      title,
      fields: { ...draft },
      createdAt: editing.value?.data?.createdAt || now,
      updatedAt: now,
    };
    await pushEncrypted("memory", id, payload, editing.value?.revision || 0);
    formOpen.value = false;
    editing.value = null;
    notice.value = "تم حفظ السجل مشفّرًا داخل LifeVault.";
    await load();
  } catch (e: any) {
    error.value = e?.body?.detail || e?.message || "تعذر حفظ السجل.";
  } finally {
    saving.value = false;
  }
}
async function remove(record: StoredRecord) {
  if (!record.data || saving.value) return;
  if (!confirm("هل تريد حذف هذا السجل من خزنتك؟")) return;
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    await pushEncrypted("memory", record.id, {}, record.revision, true);
    notice.value = "تم حذف السجل.";
    await load();
  } catch (e: any) {
    error.value = e?.body?.detail || e?.message || "تعذر حذف السجل.";
  } finally {
    saving.value = false;
  }
}
function displayValue(field: Field, value?: string) {
  if (!value) return "—";
  if (field.type === "date") {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ar-SA");
  }
  return value;
}
watch(moduleKey, () => { clearDraft(); formOpen.value = false; editing.value = null; void load(); });
onMounted(() => { clearDraft(); void load(); });
</script>

<template>
  <main class="lr-shell" dir="rtl">
    <header class="lr-header">
      <RouterLink to="/commander" class="lr-back">← العودة لمركز القيادة</RouterLink>
      <span class="lr-secure">✦ محفوظ عبر تشفير LifeVault</span>
    </header>
    <section v-if="config" class="lr-hero">
      <div><small>PERSONAL LIFE RECORDS</small><h1>{{ config.title }}</h1><p>{{ config.description }}</p></div>
      <span class="lr-hero-icon">{{ config.icon }}</span>
    </section>
    <section v-if="!config" class="lr-panel"><h2>القسم غير معروف</h2><RouterLink to="/commander">العودة إلى مركز القيادة</RouterLink></section>
    <template v-else>
      <div class="lr-toolbar">
        <div><b>{{ visibleRecords.length }} سجل</b><small>تُحمّل السجلات من حسابك بعد تسجيل الدخول</small></div>
        <button class="lr-primary" @click="startNew">＋ إضافة سجل</button>
      </div>
      <p v-if="error" class="lr-error" role="alert">{{ error }}</p>
      <p v-if="notice" class="lr-notice" role="status">{{ notice }}</p>
      <section v-if="formOpen" class="lr-panel lr-form-panel">
        <div class="lr-panel-head"><h2>{{ editing ? "تعديل السجل" : "سجل جديد" }}</h2><button class="lr-close" @click="formOpen = false">إغلاق</button></div>
        <form class="lr-form" @submit.prevent="save">
          <label v-for="field in config.fields" :key="field.key" class="lr-field">
            <span>{{ field.label }} <i v-if="field.required">*</i></span>
            <textarea v-if="field.key === 'notes'" v-model="draft[field.key]" rows="3" placeholder="أضف التفاصيل اللازمة"></textarea>
            <input v-else v-model="draft[field.key]" :type="field.type || 'text'" :required="!!field.required" :placeholder="field.hint || field.label">
          </label>
          <div class="lr-form-actions"><button type="button" class="lr-secondary" @click="formOpen = false">إلغاء</button><button class="lr-primary" type="submit" :disabled="saving">{{ saving ? "جارٍ الحفظ…" : "حفظ مشفّر" }}</button></div>
        </form>
      </section>
      <section v-if="loading" class="lr-panel lr-empty">جارٍ تحميل سجلاتك المشفّرة…</section>
      <section v-else-if="!visibleRecords.length" class="lr-panel lr-empty"><span>{{ config.icon }}</span><b>لا توجد سجلات في هذا القسم بعد</b><small>أضف أول سجل ليظهر هنا بعد حفظه في خزنتك.</small><button class="lr-primary" @click="startNew">إضافة أول سجل</button></section>
      <section v-else class="lr-record-grid">
        <article v-for="record in visibleRecords" :key="record.id" class="lr-record">
          <div class="lr-record-head"><b>{{ record.data?.title }}</b><div><button @click="startEdit(record)">تعديل</button><button @click="remove(record)" :disabled="saving">حذف</button></div></div>
          <dl><template v-for="field in config.fields" :key="field.key"><div v-if="record.data?.fields?.[field.key]" class="lr-value"><dt>{{ field.label }}</dt><dd>{{ displayValue(field, record.data.fields[field.key]) }}</dd></div></template></dl>
          <small class="lr-updated">آخر تحديث: {{ record.data?.updatedAt ? new Date(record.data.updatedAt).toLocaleDateString("ar-SA") : "—" }}</small>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.lr-shell{max-width:1120px;margin:auto;padding:28px 30px;min-height:100vh;color:#f5f2ff}.lr-header,.lr-toolbar,.lr-panel-head,.lr-record-head,.lr-form-actions{display:flex;align-items:center;justify-content:space-between;gap:14px}.lr-back,.lr-secure{font-size:11px;color:#aaa2c2;text-decoration:none}.lr-hero{display:flex;align-items:center;justify-content:space-between;margin:25px 0 20px;padding:30px 34px;border:1px solid #453466;border-radius:20px;background:linear-gradient(110deg,#2b2044,#17172d)}.lr-hero small{color:#b79cf0;font-size:9px;letter-spacing:1.2px}.lr-hero h1{font-size:28px;margin:9px 0}.lr-hero p{color:#aaa5c2;font-size:12px}.lr-hero-icon{font-size:48px;color:#b99cff}.lr-toolbar{padding:15px 0}.lr-toolbar b,.lr-toolbar small{display:block}.lr-toolbar b{font-size:14px}.lr-toolbar small{font-size:10px;color:#8984a1;margin-top:5px}.lr-primary,.lr-secondary,.lr-close{border:0;border-radius:10px;padding:10px 15px;font-size:11px;cursor:pointer}.lr-primary{background:linear-gradient(110deg,#8b69df,#6846bd);color:white}.lr-primary:disabled{opacity:.6}.lr-secondary,.lr-close{background:#28253d;color:#c9c1df}.lr-panel,.lr-record{border:1px solid #2b2941;border-radius:16px;background:#141526;padding:19px}.lr-form-panel{margin-bottom:15px}.lr-panel-head h2{font-size:16px}.lr-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:14px}.lr-field{display:flex;flex-direction:column;gap:7px;font-size:11px;color:#c7c0dc}.lr-field i{color:#e8a3b6;font-style:normal}.lr-field input,.lr-field textarea{width:100%;box-sizing:border-box;border:1px solid #37334f;border-radius:9px;background:#101120;color:#f5f2ff;padding:11px;font:inherit;outline:none}.lr-field input:focus,.lr-field textarea:focus{border-color:#9d7de7}.lr-form-actions{grid-column:1/-1;justify-content:flex-start;margin-top:5px}.lr-record-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.lr-record-head b{font-size:13px}.lr-record-head div{display:flex;gap:7px}.lr-record-head button{border:1px solid #3a3554;border-radius:8px;background:#242139;color:#c8b8f0;padding:6px 10px;font-size:10px;cursor:pointer}.lr-record dl{margin:15px 0 7px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.lr-value dt{font-size:9px;color:#8984a1;margin-bottom:4px}.lr-value dd{font-size:11px;color:#e4def3;margin:0;overflow-wrap:anywhere}.lr-updated{font-size:9px;color:#77728f}.lr-empty{min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#aaa5c2;font-size:11px}.lr-empty>span{font-size:28px;color:#b99cff}.lr-empty small{color:#8984a1}.lr-error,.lr-notice{padding:11px 14px;border-radius:10px;font-size:11px}.lr-error{border:1px solid #79344c;background:#421f32;color:#ffc4d4}.lr-notice{border:1px solid #315b4c;background:#183328;color:#b8f0d4}
@media(max-width:700px){.lr-shell{padding:18px 14px}.lr-hero{padding:22px}.lr-hero h1{font-size:23px}.lr-form,.lr-record-grid{grid-template-columns:1fr}.lr-record dl{grid-template-columns:1fr 1fr}.lr-secure{display:none}}
</style>
