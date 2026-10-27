<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { session, loadSettings } from '../session'
import type { VaultItem } from '../storage/vault-service'

const items = ref<VaultItem[]>([])
const settings = loadSettings()

onMounted(async () => {
  items.value = (await session.vault?.listItems()) ?? []
})

const kinds: Record<string, string> = { password: 'كلمات مرور', note: 'ملاحظات', card: 'بطاقات', document: 'وثائق', other: 'أخرى' }
function counts() {
  const c: Record<string, number> = {}
  for (const i of items.value) c[i.kind] = (c[i.kind] ?? 0) + 1
  return Object.entries(c)
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">لوحة التحكم</h1>
    <div class="lv-card">
      <p class="text-4xl font-bold text-emerald-400">{{ items.length }}</p>
      <p class="text-sm text-slate-400">عنصر مشفر في خزنتك</p>
      <ul v-if="items.length" class="mt-3 space-y-1 text-sm">
        <li v-for="[k, n] in counts()" :key="k" class="flex justify-between"><span>{{ kinds[k] ?? k }}</span><span>{{ n }}</span></li>
      </ul>
      <RouterLink to="/vault" class="lv-btn mt-4 block text-center">فتح الخزنة</RouterLink>
    </div>
    <div class="lv-card text-sm">
      <p class="font-semibold">حالة الخصوصية</p>
      <p class="mt-1 text-slate-400">التشفير يتم على هذا الجهاز قبل أي حفظ. المفاتيح لا تُخزَّن إلا في ذاكرة الجلسة وتُمسح عند القفل.</p>
      <p class="mt-2 text-slate-400">المزامنة مع الخادم: <span class="text-amber-400">{{ settings.serverUrl ? 'عنوان الخادم محفوظ، لم تُفعَّل بعد' : 'غير مفعّلة' }}</span></p>
    </div>
  </div>
</template>
