<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Capacitor } from "@capacitor/core";
import { login, ApiError } from "../services/api-client";

const router = useRouter();
const email = ref("");
const password = ref("");
const totp = ref("");
const showTotp = ref(false);
const busy = ref(false);
const error = ref("");

async function submit() {
  error.value = "";
  busy.value = true;
  try {
    await login(
      email.value.trim().toLowerCase(),
      password.value,
      { name: "LifeVault Mobile", platform: Capacitor.getPlatform() },
      totp.value.trim() || undefined
    );
    password.value = "";
    router.replace({ name: "dashboard" });
  } catch (e) {
    if (e instanceof ApiError) {
      const detail = (e.body as any)?.detail;
      const msg = typeof detail === "string" ? detail : `خطأ ${e.status}`;
      if (/totp|2fa|two/i.test(msg)) showTotp.value = true;
      error.value = msg;
    } else if (e instanceof DOMException || (e as any)?.name === "OperationError") {
      error.value = "تعذّر فك تشفير المفتاح. تحقق من كلمة المرور.";
    } else {
      error.value = (e as Error)?.message ?? "تعذّر الاتصال بالخادم";
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6" dir="rtl">
    <header class="text-center">
      <div class="text-4xl">🔐</div>
      <h1 class="mt-2 text-2xl font-bold">LifeVault AI</h1>
      <p class="text-sm text-slate-500">بياناتك مشفّرة على جهازك فقط</p>
    </header>

    <form class="space-y-4" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        autocomplete="username"
        placeholder="البريد الإلكتروني"
        required
        dir="ltr"
        class="w-full rounded-xl border p-3"
      />
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        placeholder="كلمة المرور الرئيسية"
        required
        dir="ltr"
        class="w-full rounded-xl border p-3"
      />
      <input
        v-if="showTotp"
        v-model="totp"
        inputmode="numeric"
        maxlength="6"
        placeholder="رمز المصادقة الثنائية"
        dir="ltr"
        class="w-full rounded-xl border p-3 text-center tracking-widest"
      />
      <button type="button" class="text-sm text-indigo-600" @click="showTotp = !showTotp">
        {{ showTotp ? "إخفاء رمز المصادقة" : "لدي مصادقة ثنائية" }}
      </button>

      <p v-if="error" class="rounded-lg bg-red-100 p-3 text-sm text-red-800">{{ error }}</p>

      <button
        type="submit"
        :disabled="busy"
        class="w-full rounded-xl bg-indigo-600 p-3 font-semibold text-white disabled:opacity-50"
      >
        {{ busy ? "جارٍ اشتقاق المفاتيح…" : "تسجيل الدخول" }}
      </button>
    </form>
  </main>
</template>
