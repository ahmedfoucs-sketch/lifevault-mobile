<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { lockNow, session } from './session'

const route = useRoute()
const router = useRouter()
const showNav = computed(() => !!session.vault && route.path !== '/login')

function lock() {
  lockNow()
  router.replace('/login')
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-xl flex-col">
    <main class="flex-1 p-4"><RouterView /></main>
    <nav v-if="showNav" class="sticky bottom-0 grid grid-cols-4 gap-1 border-t border-slate-800 bg-slate-950/95 p-2 text-center text-sm">
      <RouterLink to="/dashboard" class="rounded-lg p-2" active-class="bg-slate-800 text-emerald-400">الرئيسية</RouterLink>
      <RouterLink to="/vault" class="rounded-lg p-2" active-class="bg-slate-800 text-emerald-400">الخزنة</RouterLink>
      <RouterLink to="/settings" class="rounded-lg p-2" active-class="bg-slate-800 text-emerald-400">الإعدادات</RouterLink>
      <button class="rounded-lg p-2 text-amber-400" @click="lock">قفل</button>
    </nav>
  </div>
</template>
