<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Capacitor } from "@capacitor/core";
import { login, registerLocal, ApiError } from "../services/api-client";

const router = useRouter();
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const mode = ref<"login" | "register">("login");
const busy = ref(false);
const error = ref("");
const info = ref("");

async function submit() {
  error.value = "";
  info.value = "";
  busy.value = true;
  try {
    const normalizedEmail = email.value.trim().toLowerCase();
    if (mode.value === "register") {
      if (password.value !== confirmPassword.value) {
        throw new Error("كلمتا المرور غير متطابقتين.");
      }
      await registerLocal(normalizedEmail, password.value);
    }
    await login(
      normalizedEmail,
      password.value,
      { name: "LifeVault Web", platform: Capacitor.getPlatform() }
    );
    password.value = "";
    confirmPassword.value = "";
    router.replace({ name: "dashboard" });
  } catch (e) {
    if (e instanceof ApiError) {
      const detail = (e.body as any)?.detail;
      error.value = typeof detail === "string" ? detail : `خطأ ${e.status}`;
    } else {
      error.value = (e as Error)?.message ?? "تعذّر فتح الخزنة.";
    }
  } finally {
    busy.value = false;
  }
}

function switchMode() {
  mode.value = mode.value === "login" ? "register" : "login";
  error.value = "";
  info.value = "";
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6" dir="rtl">
    <header class="text-center">
      <div class="text-4xl">🔐</div>
      <h1 class="mt-2 text-2xl font-bold">LifeVault AI</h1>
      <p class="text-sm text-slate-500">خزنتك الشخصية المشفّرة على هذا الجهاز</p>
      <span class="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
        وضع محلي · لا يتم إرسال كلمة المرور أو محتوى الخزنة إلى خادم
      </span>
    </header>

    <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="text-center">
        <h2 class="text-xl font-bold">{{ mode === "register" ? "إنشاء خزنتك لأول مرة" : "تسجيل الدخول" }}</h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ mode === "register" ? "أنشئ حسابًا محليًا بكلمة مرور رئيسية قوية." : "افتح خزنتك باستخدام بريدك وكلمة المرور الرئيسية." }}
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <label class="block space-y-1 text-sm font-medium">
          <span>البريد الإلكتروني</span>
          <input v-model="email" type="email" autocomplete="username" placeholder="name@example.com"
            required dir="ltr" class="w-full rounded-xl border border-slate-300 p-3 text-base font-normal" />
        </label>

        <label class="block space-y-1 text-sm font-medium">
          <span>كلمة المرور الرئيسية</span>
          <input v-model="password" type="password"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            :minlength="mode === 'register' ? 12 : 1"
            :placeholder="mode === 'register' ? '12 حرفًا على الأقل' : 'كلمة المرور الرئيسية'"
            required dir="ltr" class="w-full rounded-xl border border-slate-300 p-3 text-base font-normal" />
        </label>

        <label v-if="mode === 'register'" class="block space-y-1 text-sm font-medium">
          <span>تأكيد كلمة المرور</span>
          <input v-model="confirmPassword" type="password" autocomplete="new-password"
            placeholder="أعد كتابة كلمة المرور" required dir="ltr"
            class="w-full rounded-xl border border-slate-300 p-3 text-base font-normal" />
        </label>

        <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
        <p v-if="info" class="rounded-lg bg-green-50 p-3 text-sm text-green-700">{{ info }}</p>

        <button type="submit" :disabled="busy"
          class="w-full rounded-xl bg-indigo-600 p-3 font-semibold text-white shadow-sm disabled:opacity-50">
          {{ busy ? "جارٍ تجهيز التشفير…" : mode === "register" ? "إنشاء الخزنة وفتحها" : "فتح الخزنة" }}
        </button>
      </form>

      <div class="border-t border-slate-100 pt-4 text-center">
        <button type="button" class="text-sm font-semibold text-indigo-700" @click="switchMode">
          {{ mode === "register" ? "لدي حساب بالفعل — تسجيل الدخول" : "أول مرة هنا؟ إنشاء حساب جديد" }}
        </button>
      </div>
    </section>

    <p class="text-center text-xs leading-6 text-slate-500">
      التشفير يتم داخل المتصفح باستخدام AES-256-GCM وPBKDF2-SHA256.
      فقدان كلمة المرور يعني عدم القدرة على استعادة البيانات.
    </p>
  </main>
</template>
