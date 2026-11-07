<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { logout, getSession } from "../services/api-client";
import { useVaultStore } from "../stores/vault";
import { useMemoryStore } from "../stores/memory";

const router = useRouter();
const vault = useVaultStore();
const memory = useMemoryStore();
const labels: Record<string, string> = {
  vault: "الخزنة الآمنة",
  family: "العائلة",
  link: "الروابط",
  memory: "الذكريات",
  settings: "الإعدادات",
};
const totalItems = computed(() => Object.values(vault.counts).reduce((sum, value) => sum + (Number(value) || 0), 0));
onMounted(() => vault.load());
function signOut() {
  logout();
  vault.clear();
  memory.clear();
  router.replace({ name: "login" });
}
</script>

<template>
  <main class="lv-shell" dir="rtl">
    <header class="lv-topbar">
      <div class="lv-brand">
        <div class="lv-brand-mark">L<span>V</span></div>
        <div><strong>LifeVault <em>AI</em></strong><small>خزنتك الرقمية… ذاكرة حياتك</small></div>
      </div>
      <button class="lv-logout" @click="signOut" aria-label="تسجيل الخروج">خروج ↗</button>
    </header>

    <section class="lv-welcome">
      <div class="lv-orb lv-orb-one"></div><div class="lv-orb lv-orb-two"></div>
      <div class="lv-welcome-content">
        <span class="lv-eyebrow"><i></i> مساحتك الشخصية الآمنة</span>
        <h1>كل حياتك، <span>في مكان واحد.</span></h1>
        <p>احفظ ما يهمك، نظّم تفاصيل حياتك، واسترجع ذكرياتك وقتما تحتاجها.</p>
        <RouterLink to="/vault" class="lv-primary">افتح خزنتك <span>←</span></RouterLink>
      </div>
      <div class="lv-hero-art" aria-hidden="true"><div class="lv-ring ring-a"></div><div class="lv-ring ring-b"></div><div class="lv-core">✦</div><span class="lv-spark spark-a">✧</span><span class="lv-spark spark-b">✦</span></div>
    </section>

    <p v-if="vault.error" class="lv-error" role="alert">{{ vault.error }}</p>

    <section class="lv-section-head">
      <div><span class="lv-kicker">نظرة عامة</span><h2>مساحتك الرقمية</h2></div>
      <button class="lv-sync" :disabled="vault.loading" @click="vault.load()"><span :class="{ 'lv-spin': vault.loading }">↻</span>{{ vault.loading ? "جارٍ التحديث" : "تحديث البيانات" }}</button>
    </section>

    <section class="lv-stats">
      <article class="lv-stat lv-stat-featured"><div class="lv-stat-icon">▣</div><div class="lv-stat-number">{{ totalItems }}</div><div class="lv-stat-label">إجمالي العناصر المحفوظة</div><small>في مساحتك الخاصة</small></article>
      <article v-for="(label, type) in labels" :key="type" class="lv-stat"><div class="lv-stat-icon">{{ type === 'vault' ? '◈' : type === 'family' ? '⌂' : type === 'link' ? '↗' : type === 'memory' ? '✧' : '⚙' }}</div><div class="lv-stat-number">{{ vault.counts[type] ?? 0 }}</div><div class="lv-stat-label">{{ label }}</div></article>
    </section>

    <section class="lv-section-head lv-shortcuts-head"><div><span class="lv-kicker">ابدأ من هنا</span><h2>الوصول السريع</h2></div></section>
    <section class="lv-shortcuts">
      <RouterLink to="/commander" class="lv-shortcut"><span class="lv-shortcut-icon">✦</span><span><b>مركز القيادة الشخصية</b><small>إدارة حياتك والتزاماتك من مكان واحد</small></span><i>←</i></RouterLink>
      <RouterLink to="/memory" class="lv-shortcut"><span class="lv-shortcut-icon">✧</span><span><b>ذاكرتك الثانية</b><small>التقاط وتصنيف واسترجاع الذكريات</small></span><i>←</i></RouterLink>
      <RouterLink to="/vault" class="lv-shortcut"><span class="lv-shortcut-icon">◈</span><span><b>الخزنة الآمنة</b><small>كلمات المرور والبيانات المهمة</small></span><i>←</i></RouterLink>
      <RouterLink to="/assistant" class="lv-shortcut"><span class="lv-shortcut-icon">✦</span><span><b>مساعد LifeVault</b><small>احفظ أفكارك ومعلوماتك في ذاكرتك</small></span><i>←</i></RouterLink>
      <RouterLink to="/settings" class="lv-shortcut"><span class="lv-shortcut-icon">⚙</span><span><b>الإعدادات والأمان</b><small>إدارة حسابك وحماية بياناتك</small></span><i>←</i></RouterLink>
    </section>

    <footer class="lv-footer"><span>✦ LifeVault AI</span><span>بياناتك ملكك · خصوصيتك أولويتنا</span><span dir="ltr">Sync {{ vault.syncRev }} · {{ getSession()?.userId }}</span></footer>
  </main>
</template>
