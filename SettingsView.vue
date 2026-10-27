<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { VaultService } from '../storage/vault-service'
import { loadSettings, lockNow, saveSettings, session, store } from '../session'

const router = useRouter()
const s = ref(loadSettings())
const saved = ref(false)
const newPw = ref('')
const pwMsg = ref('')
const busy = ref(false)

function save() {
  saveSettings({ autoLockMinutes: Math.max(1, Number(s.value.autoLockMinutes) || 5), serverUrl: s.value.serverUrl.trim() })
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}

async function changePw() {
  if (newPw.value.length < 10) {
    pwMsg.value = 'كلمة المرور قصيرة: 10 أحرف على الأقل'
    return
  }
  busy.value = true
  try {
    await session.vault?.changePassword(newPw.value)
    newPw.value = ''
    pwMsg.value = 'تم تغيير كلمة المرور'
  } finally {
    busy.value = false
  }
}

function backup() {
  const blob = new Blob([session.vault!.exportBackup()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `lifevault-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function wipe() {
  if (!confirm('سيُحذف كل شيء من هذا الجهاز نهائياً ولا يمكن التراجع. متابعة؟')) return
  lockNow()
  VaultService.wipe(store)
  router.replace('/login')
  location.reload()
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold">الإعدادات</h1>

    <div class="lv-card space-y-3">
      <label class="block text-sm">القفل التلقائي بعد (دقائق)
        <input v-model.number="s.autoLockMinutes" type="number" min="1" class="lv-input mt-1" />
      </label>
      <label class="block text-sm">عنوان الخادم (للمزامنة لاحقاً)
        <input v-model="s.serverUrl" dir="ltr" class="lv-input mt-1" placeholder="https://…" />
      </label>
      <button class="lv-btn w-full" @click="save">{{ saved ? 'تم الحفظ ✓' : 'حفظ' }}</button>
    </div>

    <div class="lv-card space-y-3">
      <p class="text-sm font-semibold">تغيير كلمة المرور</p>
      <input v-model="newPw" type="password" autocomplete="new-password" class="lv-input" placeholder="كلمة المرور الجديدة" />
      <button class="lv-btn w-full" :disabled="busy || !newPw" @click="changePw">تغيير</button>
      <p v-if="pwMsg" class="text-sm text-slate-300">{{ pwMsg }}</p>
    </div>

    <div class="lv-card space-y-3">
      <button class="lv-btn-ghost w-full" @click="backup">تنزيل نسخة احتياطية مشفرة</button>
      <button class="lv-btn-ghost w-full text-red-400" @click="wipe">حذف كل بيانات هذا الجهاز</button>
    </div>

    <p class="text-center text-xs text-slate-500">المصادقة الثنائية (2FA) تتطلب ربط الخادم، ولم تُفعَّل في هذا الإصدار.</p>
  </div>
</template>
