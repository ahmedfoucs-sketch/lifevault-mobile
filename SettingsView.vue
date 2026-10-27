<script setup lang="ts">
import { ref } from "vue";
import QRCode from "qrcode";
import {
  generateRecoveryKey,
  deriveKekRecovery,
  deriveRecoveryAuthKey,
  wrapDek,
  toB64,
  wipe,
} from "../crypto/lv-crypto";
import { getSession, request, setup2FA, enable2FA, PATH } from "../services/api-client";

/* ---------- 2FA ---------- */
const totpSecret = ref("");
const totpUri = ref("");
const qrDataUrl = ref("");
const totpCode = ref("");
const totpEnabled = ref(false);
const backupCodes = ref<string[]>([]);
const backupSaved = ref(false);

/* ---------- Recovery key ---------- */
const recoveryDisplay = ref("");
const recoverySaved = ref(false);

const busy = ref(false);
const message = ref("");
const error = ref("");

function reset() {
  error.value = message.value = "";
}

function errText(e: any): string {
  const b = e?.body;
  if (b && typeof b === "object" && "detail" in b) return String((b as any).detail);
  return e?.message ?? String(e);
}

async function startTotp() {
  reset();
  busy.value = true;
  try {
    const r = await setup2FA();
    totpSecret.value = r.secret;
    totpUri.value = r.otpauthUri;
    qrDataUrl.value = r.otpauthUri
      ? await QRCode.toDataURL(r.otpauthUri, { margin: 1, width: 224 })
      : "";
  } catch (e) {
    error.value = errText(e);
  } finally {
    busy.value = false;
  }
}

async function confirmTotp() {
  reset();
  busy.value = true;
  try {
    const r = await enable2FA(totpCode.value.trim());
    totpEnabled.value = true;
    backupCodes.value = r.backupCodes; // shown once
    backupSaved.value = false;
    totpSecret.value = totpUri.value = qrDataUrl.value = totpCode.value = "";
    message.value = "تم تفعيل المصادقة الثنائية.";
  } catch (e) {
    error.value = errText(e);
  } finally {
    busy.value = false;
  }
}

function copyBackup() {
  navigator.clipboard?.writeText(backupCodes.value.join("\n"));
  message.value = "تم نسخ الأكواد الاحتياطية.";
}

function dismissBackup() {
  backupCodes.value = [];
}

async function createRecoveryKey() {
  reset();
  busy.value = true;
  try {
    const s = getSession();
    if (!s) throw new Error("يجب تسجيل الدخول أولاً");
    const { secret, display } = generateRecoveryKey();
    const kek = await deriveKekRecovery(secret);
    const recAuth = await deriveRecoveryAuthKey(secret);
    const wrapped = await wrapDek(s.dek, kek, "recovery");

    // The key is shown ONLY after the server accepted it, so the user is never
    // handed a recovery key that the server does not know about.
    await request(PATH.recoveryRotate, {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        wrapped_dek_recovery: wrapped,
        recovery_auth_key: toB64(recAuth),
      }),
    });
    wipe(secret, kek, recAuth);
    recoveryDisplay.value = display;
    recoverySaved.value = false;
  } catch (e: any) {
    error.value =
      e?.status === 404
        ? "مسار تدوير مفتاح الاستعادة غير موجود في الخادم بعد. لم يتم إنشاء أي مفتاح."
        : errText(e);
  } finally {
    busy.value = false;
  }
}

function copyRecovery() {
  navigator.clipboard?.writeText(recoveryDisplay.value);
  message.value = "تم نسخ مفتاح الاستعادة.";
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6 p-4" dir="rtl">
    <h1 class="text-2xl font-bold">الإعدادات والأمان</h1>

    <p v-if="message" class="rounded-lg bg-green-100 p-3 text-green-800">{{ message }}</p>
    <p v-if="error" class="rounded-lg bg-red-100 p-3 text-red-800">{{ error }}</p>

    <!-- 2FA -->
    <section class="space-y-3 rounded-2xl border p-4">
      <h2 class="text-lg font-semibold">المصادقة الثنائية (2FA)</h2>

      <!-- Backup codes (shown once) -->
      <div v-if="backupCodes.length" class="space-y-3">
        <p class="text-sm font-medium text-red-700">
          الأكواد الاحتياطية تُعرض مرة واحدة فقط. كل كود يُستخدم مرة واحدة.
        </p>
        <ul class="grid grid-cols-2 gap-2" dir="ltr">
          <li
            v-for="c in backupCodes"
            :key="c"
            class="rounded bg-yellow-50 p-2 text-center font-mono"
          >
            {{ c }}
          </li>
        </ul>
        <button class="w-full rounded-xl border px-3 py-2" @click="copyBackup">نسخ الكل</button>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="backupSaved" type="checkbox" />
          حفظت الأكواد في مكان آمن
        </label>
        <button
          class="w-full rounded-xl bg-green-600 px-4 py-2 text-white disabled:opacity-40"
          :disabled="!backupSaved"
          @click="dismissBackup"
        >
          تم
        </button>
      </div>

      <p v-else-if="totpEnabled" class="text-green-700">✅ مفعّلة</p>

      <template v-else>
        <button
          v-if="!totpSecret"
          class="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
          :disabled="busy"
          @click="startTotp"
        >
          تفعيل المصادقة الثنائية
        </button>

        <div v-else class="space-y-3">
          <p class="text-sm">امسح الرمز بتطبيق المصادقة (Google Authenticator / Authy):</p>
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            alt="QR code"
            class="mx-auto h-56 w-56 rounded bg-white p-2"
          />
          <p class="text-xs text-gray-500">أو أدخل المفتاح يدوياً:</p>
          <code class="block break-all rounded bg-gray-100 p-2 text-sm" dir="ltr">{{ totpSecret }}</code>

          <input
            v-model="totpCode"
            inputmode="numeric"
            maxlength="6"
            placeholder="رمز من 6 أرقام"
            class="w-full rounded-xl border p-2 text-center tracking-widest"
            dir="ltr"
          />
          <button
            class="w-full rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
            :disabled="busy || totpCode.length !== 6"
            @click="confirmTotp"
          >
            تأكيد وتفعيل
          </button>
        </div>
      </template>
    </section>

    <!-- Recovery key -->
    <section class="space-y-3 rounded-2xl border p-4">
      <h2 class="text-lg font-semibold">مفتاح الاستعادة</h2>
      <p class="text-sm text-gray-600">
        بسبب التشفير الكامل، لا يمكن لأحد (ولا الخادم) استعادة بياناتك إذا فقدت كلمة المرور.
        احفظ هذا المفتاح خارج الجهاز.
      </p>

      <button
        v-if="!recoveryDisplay"
        class="rounded-xl bg-amber-600 px-4 py-2 text-white disabled:opacity-50"
        :disabled="busy"
        @click="createRecoveryKey"
      >
        إنشاء مفتاح استعادة جديد
      </button>

      <div v-else class="space-y-3">
        <code
          class="block break-all rounded bg-yellow-50 p-3 text-center font-mono text-base"
          dir="ltr"
          >{{ recoveryDisplay }}</code
        >
        <p class="text-sm font-medium text-red-700">
          يُعرض مرة واحدة فقط. أي مفتاح جديد يُلغي السابق.
        </p>
        <button class="w-full rounded-xl border px-3 py-2" @click="copyRecovery">نسخ</button>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="recoverySaved" type="checkbox" />
          حفظت المفتاح في مكان آمن
        </label>
        <button
          class="w-full rounded-xl bg-green-600 px-4 py-2 text-white disabled:opacity-40"
          :disabled="!recoverySaved"
          @click="recoveryDisplay = ''"
        >
          تم
        </button>
      </div>
    </section>
  </div>
</template>
