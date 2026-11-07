import { createRouter, createWebHashHistory } from "vue-router";
import { isLoggedIn } from "../services/api-client";
import LoginView from "../views/LoginView.vue";
import DashboardView from "../views/DashboardView.vue";
import CommanderView from "../views/CommanderView.vue";
import LifeRecordsView from "../views/LifeRecordsView.vue";
import VaultView from "../views/VaultView.vue";
import SettingsView from "../views/SettingsView.vue";
import AssistantView from "../views/AssistantView.vue";
import MemoryView from "../views/MemoryView.vue";

const router = createRouter({
  // Hash history: works inside the Capacitor WebView without server rewrites
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/commander" },
    { path: "/login", name: "login", component: LoginView, meta: { public: true } },
    { path: "/commander", name: "commander", component: CommanderView },
    { path: "/commander/:module", name: "life-records", component: LifeRecordsView },
    { path: "/dashboard", name: "dashboard", component: DashboardView },
    { path: "/vault", name: "vault", component: VaultView },
    { path: "/settings", name: "settings", component: SettingsView },
    { path: "/assistant", name: "assistant", component: AssistantView },
    { path: "/memory", name: "memory", component: MemoryView },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

// The DEK lives in memory only, so a page reload always returns to /login.
router.beforeEach((to) => {
  if (!to.meta.public && !isLoggedIn()) return { name: "login" };
  if (to.name === "login" && isLoggedIn()) return { name: "commander" };
});

export default router;
