<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { VaultError, VaultService } from '../storage/vault-service'
import { session, store, touch } from '../session'

const router = useRouter()
type Mode = 'unlock' | 'create' | 'recover' | 'showKey'
const mode = ref<Mode>(VaultService.exists(store) ? 'unlock' : 'create')
const password = ref('')
const confirm = ref('')
const recoveryInput = ref('')
const recoveryKey = ref('')
const savedKey = ref(false)
const busy = ref(false)
const error = ref('')

const weak = computed(() => password.value.length > 0 && password.value.length < 10)

async function run(fn: () => Promise<void>) {
  error.value = ''
  busy.value = true
  try {
    await fn()
  } catch (e) {
    error.value = e instanceof VaultError ? e.message : 'حدث خطأ غير متوقع'
  } finally {
    busy.value = false
  }
}

const unlock = () =>
  run(async () => {
    session.vault = await VaultService.unlock(store, password.value)
    touch()
    password.value = ''
    router.replace('/dashboard')
  })

const create = () =>
  run(async () => {
    if (password.value.length < 10) throw new VaultError('WRONG_PASSWORD', 'كلمة المرور قصيرة: 10 أحرف على الأقل')
    if (password.value !== confirm.value) throw new VaultError('WRONG_PASSWORD', 'كلمتا المرور غير متطابقتين')
    const { vault, recoveryKey: rk } = await VaultService.create(store, password.value)
    session.vault = vault
    recoveryKey.value = rk
    password.value = confirm.value = ''
    mode.value = 'showKey'
  })

const recover = () =>
  run(async () => {
    if (password.value.length < 10) throw new VaultError('WRONG_PASSWORD', 'كلمة المرور الجديدة قصيرة: 10 أحرف على الأقل')
    session.vault = await VaultService.unlockWithRecovery(store, recoveryInput.value, password.value)
    touch()
    password.value = ''
    router.replace('/dashboard')
  })

function finish() {
  recoveryKey.value = ''
  touch()
  router.replace('/dashboard')
}

async function copyKey() {
  try {
    await navigator.clipboard.writeText(recoveryKey.value)
  } catch {
    /* بعض المتصفحات تمنع النسخ، المستخدم يستطيع نسخه يدوياً */
  }
}
</script>

<template>
  <div class="mx-auto mt-10 max-w-sm space-y-4">
    <h1 class="text-center text-3xl font-bold text-emerald-400">LifeVault</h1>

    <form v-if="mode === 'unlock'" class="lv-card space-y-3" @submit.prevent="unlock">
      <p class="text-sm text-slate-400">أدخل كلمة المرور لفتح خزنتك المشفرة. لا تغادر كلمة المرور هذا الجهاز.</p>
      <input v-model="password" type="password" autocomplete="current-password" class="lv-input" placeholder="كلمة المرور" />
      <button class="lv-btn w-full" :disabled="busy || !password">{{ busy ? 'جارٍ الفتح…' : 'فتح الخزنة' }}</button>
      <button type="button" class="w-full text-sm text-slate-400 underline" @click="mode = 'recover'">نسيت كلمة المرور؟ استخدم مفتاح الاستعادة</button>
    </form>

    <form v-else-if="mode === 'create'" class="lv-card space-y-3" @submit.prevent="create">
      <p class="text-sm text-slate-400">أنشئ خزنتك. كلمة المرور لا تُرسل لأي خادم ولا يمكن لأحد استرجاعها لك، فاحتفظ بمفتاح الاستعادة.</p>
      <input v-model="password" type="password" autocomplete="new-password" class="lv-input" placeholder="كلمة المرور (10 أحرف فأكثر)" />
      <p v-if="weak" class="text-xs text-amber-400">كلمة المرور قصيرة.</p>
      <input v-model="confirm" type="password" autocomplete="new-password" class="lv-input" placeholder="تأكيد كلمة المرور" />
      <button class="lv-btn w-full" :disabled="busy || !password || !confirm">{{ busy ? 'جارٍ التشفير…' : 'إنشاء الخزنة' }}</button>
    </form>

    <form v-else-if="mode === 'recover'" class="lv-card space-y-3" @submit.prevent="recover">
      <p class="text-sm text-slate-400">أدخل مفتاح الاستعادة (XXXX-XXXX-…) وكلمة مرور جديدة.</p>
      <input v-model="recoveryInput" dir="ltr" class="lv-input font-mono" placeholder="XXXX-XXXX-XXXX-…" />
      <input v-model="password" type="password" autocomplete="new-password" class="lv-input" placeholder="كلمة المرور الجديدة" />
      <button class="lv-btn w-full" :disabled="busy || !recoveryInput || !password">{{ busy ? 'جارٍ…' : 'استعادة وتعيين كلمة مرور جديدة' }}</button>
      <button type="button" class="w-full text-sm text-slate-400 underline" @click="mode = 'unlock'">رجوع</button>
    </form>

    <div v-else class="lv-card space-y-3">
      <h2 class="text-lg font-semibold text-amber-400">مفتاح الاستعادة — يُعرض مرة واحدة</h2>
      <p class="text-sm text-slate-300">إن نسيت كلمة المرور فهذا المفتاح هو الطريقة الوحيدة لاستعادة بياناتك. اكتبه على ورق واحفظه بعيداً عن الجهاز.</p>
      <div dir="ltr" class="break-all rounded-xl bg-slate-950 p-3 text-center font-mono text-sm tracking-wider text-emerald-300">{{ recoveryKey }}</div>
      <button type="button" class="lv-btn-ghost w-full" @click="copyKey">نسخ</button>
      <label class="flex items-center gap-2 text-sm"><input v-model="savedKey" type="checkbox" class="size-5" /> حفظتُ المفتاح في مكان آمن</label>
      <button class="lv-btn w-full" :disabled="!savedKey" @click="finish">متابعة</button>
    </div>

    <p v-if="error" class="rounded-xl bg-red-950 p-3 text-center text-sm text-red-300">{{ error }}</p>
  </div>
</template>
