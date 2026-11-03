<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getSession } from "../services/api-client";
import { pullAll } from "../services/api-client";

interface CommanderReminder {
  text: string;
  kind?: "note" | "reminder";
  dueAt?: string;
  reminderStatus?: "pending" | "done";
}
interface StoredMemory { id: string; revision: number; deleted: boolean; data: CommanderReminder | null; }

const loading = ref(true);
const error = ref("");
const reminders = ref<StoredMemory[]>([]);
const pending = computed(() => reminders.value.filter(x => x.data?.kind === "reminder" && x.data.reminderStatus !== "done"));
const upcoming = computed(() => [...pending.value].sort((a,b) => new Date(a.data?.dueAt || 0).getTime() - new Date(b.data?.dueAt || 0).getTime()).slice(0,4));
const greeting = computed(() => {
  const hour = new Date().getHours();
  return hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "أهلًا بك";
});
function formatDate(value?: string) {
  if (!value) return "موعد غير محدد";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "موعد غير صالح" : date.toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
}
async function load() {
  loading.value = true; error.value = "";
  try {
    const result = await pullAll<CommanderReminder>(0);
    reminders.value = result.items.filter(x => x.type === "memory" && !x.deleted && x.data?.kind === "reminder") as StoredMemory[];
  } catch (e: any) {
    error.value = e?.message || "تعذر تحميل التذكيرات من الخادم.";
  } finally { loading.value = false; }
}
onMounted(load);
</script>

<template>
  <main class="pc-shell" dir="rtl">
    <header class="pc-header">
      <RouterLink to="/dashboard" class="pc-brand"><span class="pc-mark">✦</span><span><b>PERSONAL <em>COMMANDER</em></b><small>مركز القيادة الشخصية</small></span></RouterLink>
      <div class="pc-header-actions"><span class="pc-secure"><i></i> جلسة LifeVault آمنة</span><RouterLink to="/settings" class="pc-settings">الإعدادات</RouterLink></div>
    </header>

    <section class="pc-hero">
      <div><span class="pc-eyebrow">YOUR LIFE · ONE COMMAND CENTER</span><h1>{{ greeting }}،<br><em>حياتك تحت السيطرة.</em></h1><p>مساحة واحدة لمتابعة التزاماتك وذكرياتك ووثائقك وأهدافك — بخصوصية وأمان.</p><div class="pc-hero-actions"><RouterLink to="/assistant" class="pc-primary">＋ أضف تذكيرًا أو معلومة</RouterLink><RouterLink to="/vault" class="pc-secondary">افتح الخزنة الآمنة ←</RouterLink></div></div>
      <div class="pc-orbit" aria-hidden="true"><div class="pc-orbit-ring"></div><div class="pc-orbit-core">PC</div><span>✧</span></div>
    </section>

    <section class="pc-section-title"><div><small>OVERVIEW</small><h2>نظرة عامة</h2></div><span class="pc-live"><i></i> متصل بحساب {{ getSession()?.userId }}</span></section>
    <section class="pc-metrics">
      <article class="pc-metric pc-metric-main"><span>التذكيرات النشطة</span><strong>{{ loading ? "—" : pending.length }}</strong><small>من بيانات الذاكرة المشفّرة</small></article>
      <article class="pc-metric"><span>المستندات</span><strong>—</strong><small>قسم الخزنة متاح · التصنيف قيد التطوير</small></article>
      <article class="pc-metric"><span>الالتزامات المالية</span><strong>—</strong><small>لم يتم ربط سجل مالي بعد</small></article>
      <article class="pc-metric"><span>الأصول والممتلكات</span><strong>—</strong><small>لم يتم إنشاء سجل أصول بعد</small></article>
    </section>

    <p v-if="error" class="pc-error" role="alert">{{ error }}</p>
    <section class="pc-content-grid">
      <div class="pc-panel pc-reminders">
        <div class="pc-panel-head"><div><small>UP NEXT</small><h2>التذكيرات القادمة</h2></div><button @click="load" :disabled="loading">{{ loading ? "جارٍ التحميل…" : "↻ تحديث" }}</button></div>
        <div v-if="loading" class="pc-empty">جارٍ تحميل التذكيرات…</div>
        <div v-else-if="upcoming.length" class="pc-reminder-list"><article v-for="item in upcoming" :key="item.id" class="pc-reminder"><span class="pc-reminder-icon">◷</span><div><b>{{ item.data?.text }}</b><small>{{ formatDate(item.data?.dueAt) }}</small></div><span class="pc-pending">قادم</span></article></div>
        <div v-else class="pc-empty"><span>✧</span><b>لا توجد تذكيرات نشطة</b><small>أضف موعدًا أو التزامًا من مساعد LifeVault.</small><RouterLink to="/assistant">إنشاء تذكير ←</RouterLink></div>
      </div>

      <div class="pc-panel">
        <div class="pc-panel-head"><div><small>QUICK ACCESS</small><h2>الوصول السريع</h2></div></div>
        <nav class="pc-links">
          <RouterLink to="/assistant"><span>✦</span><div><b>المهام والتذكيرات</b><small>إضافة ومراجعة المواعيد والذكريات</small></div><i>←</i></RouterLink>
          <RouterLink to="/vault"><span>◈</span><div><b>مستنداتي وخزنتي</b><small>الوصول إلى البيانات المحفوظة</small></div><i>←</i></RouterLink>
          <RouterLink to="/settings"><span>⚙</span><div><b>الأمان والإعدادات</b><small>حماية الحساب وإدارة الجلسة</small></div><i>←</i></RouterLink>
        </nav>
      </div>
    </section>

    <section class="pc-modules"><div class="pc-section-title"><div><small>PERSONAL LIFE SYSTEM</small><h2>مراكز الإدارة</h2></div><span class="pc-roadmap">خريطة التطوير</span></div>
      <div class="pc-module-grid">
        <article><span>▤</span><b>الوثائق والتجديدات</b><small>فهرسة المستندات والتنبيه قبل الانتهاء</small><em>قيد التطوير</em></article>
        <article><span>◉</span><b>الماليات والبنوك</b><small>الحسابات والبطاقات والتدفقات المالية</small><em>قيد التطوير</em></article>
        <article><span>⌂</span><b>العقارات والأصول</b><small>الممتلكات والعقود والاستحقاقات</small><em>قيد التطوير</em></article>
        <article><span>⇄</span><b>الأقساط والديون</b><small>جدول الالتزامات والمدفوع والمتبقي</small><em>قيد التطوير</em></article>
        <article><span>▦</span><b>الاجتماعات والتقويم</b><small>المواعيد والمتابعات اليومية</small><em>قيد التطوير</em></article>
        <article><span>♡</span><b>إدارة العائلة</b><small>الملفات والمناسبات والالتزامات العائلية</small><em>قيد التطوير</em></article>
      </div>
    </section>
    <footer class="pc-footer"><span>✦ PERSONAL LIFE COMMANDER</span><span>بياناتك ملكك · لا تُعرض التفاصيل الحساسة في التنبيهات</span><RouterLink to="/dashboard">العودة إلى LifeVault</RouterLink></footer>
  </main>
</template>

<style scoped>
.pc-shell{max-width:1180px;margin:auto;padding:28px 30px 24px;color:#f5f2ff;min-height:100vh}.pc-header,.pc-brand,.pc-header-actions,.pc-hero-actions,.pc-section-title,.pc-panel-head,.pc-footer{display:flex;align-items:center;justify-content:space-between}.pc-header{margin-bottom:28px}.pc-brand{justify-content:flex-start;gap:12px;color:inherit;text-decoration:none}.pc-mark{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(145deg,#a78bfa,#6546bd);font-size:22px}.pc-brand b{display:block;font-size:14px;letter-spacing:.5px}.pc-brand em{font-style:normal;color:#b99cff}.pc-brand small{display:block;color:#85819f;font-size:10px;margin-top:4px}.pc-header-actions{gap:17px}.pc-secure{font-size:10px;color:#a7a1bd}.pc-secure i,.pc-live i{display:inline-block;width:7px;height:7px;background:#70c9a0;border-radius:50%;margin-left:6px}.pc-settings,.pc-secondary{color:#c9c1df;text-decoration:none;font-size:11px}.pc-hero{position:relative;overflow:hidden;min-height:260px;padding:36px 40px;border:1px solid #453466;border-radius:24px;background:linear-gradient(110deg,#251a40,#17172d 62%,#131a30);display:flex;align-items:center;justify-content:space-between;box-shadow:0 18px 55px #0003}.pc-eyebrow,.pc-section-title small,.pc-panel-head small{color:#b79cf0;font-size:9px;letter-spacing:1.3px}.pc-hero h1{font-size:clamp(29px,4vw,43px);line-height:1.3;margin:13px 0 8px}.pc-hero h1 em{font-style:normal;color:#bba4ff}.pc-hero p{max-width:560px;color:#aaa5c2;font-size:12px;line-height:1.9}.pc-hero-actions{justify-content:flex-start;gap:20px;margin-top:21px}.pc-primary{background:linear-gradient(110deg,#8b69df,#6846bd);padding:12px 17px;border-radius:11px;color:white;text-decoration:none;font-size:11px;font-weight:700}.pc-orbit{width:190px;height:190px;flex-shrink:0;display:grid;place-items:center;position:relative;margin-left:4%}.pc-orbit-ring{position:absolute;width:175px;height:110px;border:1px solid #ad91ed70;border-radius:50%;transform:rotate(-35deg)}.pc-orbit:before{content:"";position:absolute;width:130px;height:180px;border:1px solid #ad91ed40;border-radius:50%;transform:rotate(48deg)}.pc-orbit-core{width:75px;height:75px;border-radius:25px;display:grid;place-items:center;background:linear-gradient(145deg,#a78bfa,#6044ad);box-shadow:0 0 45px #9c7ae866;font-size:20px;font-weight:900}.pc-orbit>span{position:absolute;top:18px;right:24px;color:#d9caff;font-size:23px}.pc-section-title{margin:29px 0 13px}.pc-section-title h2,.pc-panel-head h2{font-size:17px;margin:5px 0 0}.pc-live,.pc-roadmap{font-size:10px;color:#8f8aa9}.pc-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.pc-metric{padding:17px;border:1px solid #2b2941;border-radius:15px;background:linear-gradient(145deg,#191a2e,#111321);min-height:105px}.pc-metric-main{border-color:#59427e;background:linear-gradient(140deg,#332653,#201a37)}.pc-metric span,.pc-metric small{display:block;color:#aaa5c1;font-size:10px}.pc-metric strong{display:block;font-size:27px;margin:8px 0 4px}.pc-metric small{font-size:9px;color:#827d9b}.pc-content-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:13px;margin-top:14px}.pc-panel{padding:19px;border:1px solid #2b2941;border-radius:17px;background:#141526;min-width:0}.pc-panel-head button{border:1px solid #37334f;border-radius:9px;padding:7px 10px;background:#201e33;color:#bfb5df;font-size:10px;cursor:pointer}.pc-panel-head button:disabled{opacity:.6}.pc-reminder-list{margin-top:15px}.pc-reminder{display:flex;align-items:center;gap:11px;padding:12px 0;border-bottom:1px solid #29273d}.pc-reminder:last-child{border:0}.pc-reminder-icon,.pc-links>a>span{width:35px;height:35px;flex-shrink:0;display:grid;place-items:center;border-radius:11px;background:#30254b;color:#c5adff}.pc-reminder b,.pc-links b{display:block;font-size:11px}.pc-reminder small,.pc-links small{display:block;color:#8985a1;font-size:9px;margin-top:5px}.pc-pending{margin-right:auto;color:#d7c18a;font-size:9px}.pc-empty{min-height:125px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#aaa5c1;font-size:11px;text-align:center}.pc-empty>span{font-size:23px;color:#b99cff}.pc-empty small{font-size:9px;color:#85809c}.pc-empty a{color:#b99cff;text-decoration:none;font-size:10px}.pc-links{margin-top:10px}.pc-links>a{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #29273d;color:inherit;text-decoration:none}.pc-links>a:last-child{border:0}.pc-links>a>i{font-style:normal;margin-right:auto;color:#a78bfa}.pc-modules{margin-top:25px}.pc-module-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.pc-module-grid article{position:relative;display:flex;flex-direction:column;gap:7px;padding:16px;border:1px solid #29273e;border-radius:15px;background:#121423;min-height:116px}.pc-module-grid article>span{font-size:19px;color:#b99cff}.pc-module-grid b{font-size:11px}.pc-module-grid small{color:#85809b;font-size:9px;line-height:1.7}.pc-module-grid em{font-style:normal;color:#b9a4e8;font-size:8px;margin-top:auto}.pc-error{padding:11px 14px;border:1px solid #79344c;border-radius:11px;background:#421f32;color:#ffc4d4;font-size:11px}.pc-footer{gap:12px;margin-top:27px;padding-top:16px;border-top:1px solid #242238;color:#77728f;font-size:9px}.pc-footer span:first-child{color:#b99cff;font-weight:700}.pc-footer a{color:#aaa1c8;text-decoration:none}
@media(max-width:760px){.pc-shell{padding:18px 14px}.pc-hero{padding:25px 22px;min-height:250px}.pc-orbit{position:absolute;left:-50px;opacity:.18}.pc-hero>div:first-child{position:relative;z-index:1}.pc-hero p{max-width:95%}.pc-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.pc-content-grid{grid-template-columns:1fr}.pc-module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pc-footer{align-items:flex-start;flex-direction:column}.pc-header-actions{gap:9px}.pc-secure{font-size:8px}}
@media(max-width:390px){.pc-module-grid{grid-template-columns:1fr}.pc-hero-actions{align-items:flex-start;flex-direction:column;gap:13px}.pc-brand b{font-size:11px}}
</style>
