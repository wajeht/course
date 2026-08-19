import { createRouter, createWebHistory, type RouteLocationRaw } from "vue-router";

import { clearFrontendError, showFrontendError } from "@/frontend-error.js";
import { setPageTitle } from "@/utils.js";

declare module "vue-router" {
  interface RouteMeta {
    navigation?: "home" | "library" | "settings";
    shell?: "player";
    title?: string;
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
      meta: { navigation: "library", title: "Library" },
    },
    {
      path: "/settings",
      component: () => import("@/pages/partials/SettingsLayout.vue"),
      redirect: { name: "settings-library" },
      meta: { navigation: "settings", title: "Settings" },
      children: [
        {
          path: "library",
          name: "settings-library",
          component: () => import("@/pages/settings/LibraryPage.vue"),
        },
        {
          path: "access",
          name: "settings-access",
          component: () => import("@/pages/settings/AccessPage.vue"),
        },
      ],
    },
    {
      path: "/courses/:courseId",
      name: "course",
      component: () => import("@/pages/CoursePage.vue"),
      meta: { navigation: "library", title: "Course details" },
    },
    {
      path: "/instructors/:instructorName",
      name: "instructor",
      component: () => import("@/pages/InstructorPage.vue"),
      meta: { navigation: "library", title: "Instructor" },
    },
    {
      path: "/lessons/:lessonId",
      name: "player",
      component: () => import("@/pages/PlayerPage.vue"),
      meta: { navigation: "library", shell: "player", title: "Lesson" },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/pages/NotFoundPage.vue"),
      meta: { title: "Page not found" },
    },
  ],
  scrollBehavior: (to, from) => (to.path === from.path ? false : { top: 0 }),
});

export function notFoundLocation(path: string): RouteLocationRaw {
  return { name: "not-found", params: { pathMatch: path.split("/").filter(Boolean) } };
}

router.afterEach((route, _from, failure) => {
  if (failure) return;
  clearFrontendError();
  setPageTitle(route.meta.title);
});
router.onError((error, route) => {
  showFrontendError(error, route.fullPath, "route navigation");
});
