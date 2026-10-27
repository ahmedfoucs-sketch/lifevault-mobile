<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { session } from '../session'
import type { VaultItem, VaultItemKind } from '../storage/vault-service'

const items = ref<VaultItem[]>([])
const adding = ref(false)
const form = ref<{ title: string; kind: VaultItemKind; content: string }>({ title: '', kind: 'password', content: '' })
const revealed = ref<Record<string, boolean>>({})
const error = ref('')

const kinds: { v: VaultItemKind; t: string }[] = [
  { v: 'password', t: 'كلمة مرور' },
  { v: 'note', t: 'ملاحظة' },
  { v: 'card', t: 'بطاقة' },
  { v: 'document', t: 'وثيقة' },
  { v: 'other', t: 'أخرى' },
]

async function load() {
  try {
    items.value = (await session.vault?.listItems()) ?? []
  } catch {
    error.value = 'تعذّر فك تشفير أحد العناصر (قد يكون تالفاً أو تم العبث به).'
  }
}
onMounted(load)

async function save() {
  if (!form.value.title.trim() || !session.vault) return
  await session.vault.addItem({ ...form.value, title: form.value.title.trim() })
  form.value = { title: '', kind: 'password', content: '' }
  adding.value = false
  await load()
}

async function remove(id: string) {
  if (!confirm('حذف هذا العنصر نهائياً؟')) return
  session.vault?.deleteItem(id)
  await load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">الخزنة</h1>
      <button class="lv-btn" @click="adding = !adding">{{ adding ? 'إلغاء' : '+ عنصر' }}</button>
    </div>

    <form v-if="adding" class="lv-card space-y-3" @submit.prevent="save">
      <input v-model="form.title" class="lv-input" placeholder="العنوان" />
      <select v-model="form.kind" class="lv-input">
        <option v-for="k in kinds" :key="k.v" :value="k.v">{{ k.t }}</option>
      </select>
      <textarea v-model="form.content" rows="4" class="lv-input" placeholder="المحتوى السري" />
      <button class="lv-btn w-full" :disabled="!form.title.trim()">تشفير وحفظ</button>
    </form>

    <p v-if="error" class="rounded-xl bg-red-950 p-3 text-sm text-red-300">{{ error }}</p>
    <p v-if="!items.length && !adding" class="py-10 text-center text-slate-500">الخزنة فارغة. أضف أول عنصر.</p>

    <div v-for="i in items" :key="i.id" class="lv-card space-y-2">
      <div class="flex items-center justify-between">
        <p class="font-semibold">{{ i.title }}</p>
        <span class="text-xs text-slate-500">{{ kinds.find((k) => k.v === i.kind)?.t }}</span>
      </div>
      <p class="break-all whitespace-pre-wrap rounded-lg bg-slate-950 p-2 font-mono text-sm" dir="auto">{{ revealed[i.id] ? i.content : '••••••••••' }}</p>
      <div class="flex gap-2">
        <button class="lv-btn-ghost flex-1 !py-2 text-sm" @click="revealed[i.id] = !revealed[i.id]">{{ revealed[i.id] ? 'إخفاء' : 'إظهار' }}</button>
        <button class="lv-btn-ghost flex-1 !py-2 text-sm text-red-400" @click="remove(i.id)">حذف</button>
      </div>
    </div>
  </div>
</template>
