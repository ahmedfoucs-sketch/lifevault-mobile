import { createRouter, createWebHashHistory } from "vue-router";
import { isLoggedIn } from "../services/api-client";
import LoginView from "../views/LoginView.vue";
import DashboardView from "../views/DashboardView.vue";
import VaultView from "../views/VaultView.vue";
import SettingsView from "../views/SettingsView.vue";

const router = createRouter({
  // Hash history: works inside the Capacitor WebView without server rewrites
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/dashboard" },
    { path: "/login", name: "login", component: LoginView, meta: { public: true } },
    { path: "/dashboard", name: "dashboard", component: DashboardView },
    { path: "/vault", name: "vault", component: VaultView },
    { path: "/settings", name: "settings", component: SettingsView },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

// The DEK lives in memory only, so a page reload always returns to /login.
router.beforeEach((to) => {
  if (!to.meta.public && !isLoggedIn()) return { name: "login" };
  if (to.name === "login" && isLoggedIn()) return { name: "dashboard" };
});

export default router;
