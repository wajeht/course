import { createRouter, createWebHistory } from "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    navigation?: "home" | "library" | "settings";
    shell?: "player";
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/HomePage.vue"),
      meta: { navigation: "home" },
    },
    {
      path: "/library",
      name: "library",
      component: () => import("@/pages/LibraryPage.vue"),
      meta: { navigation: "library" },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/pages/SettingsPage.vue"),
      meta: { navigation: "settings" },
    },
    {
      path: "/courses/:courseId",
      name: "course",
      component: () => import("@/pages/CoursePage.vue"),
      meta: { navigation: "library" },
    },
    {
      path: "/instructors/:instructorName",
      name: "instructor",
      component: () => import("@/pages/InstructorPage.vue"),
      meta: { navigation: "library" },
    },
    {
      path: "/lessons/:lessonId",
      name: "player",
      component: () => import("@/pages/PlayerPage.vue"),
      meta: { navigation: "library", shell: "player" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: (to, from) => (to.path === from.path ? false : { top: 0 }),
});
