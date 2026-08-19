import { createRouter, createWebHistory, type RouteLocationRaw } from "vue-router";

import { clearFrontendError, showFrontendError } from "@/frontend-error.js";
import { setPageTitle } from "@/utils.js";

export const loadHomePage = () => import("@/pages/HomePage.vue");
export const loadLibraryPage = () => import("@/pages/LibraryPage.vue");
export const loadSettingsPage = () => import("@/pages/SettingsPage.vue");
export const loadCoursePage = () => import("@/pages/CoursePage.vue");
export const loadInstructorPage = () => import("@/pages/InstructorPage.vue");
export const loadPlayerPage = () => import("@/pages/PlayerPage.vue");
const loadNotFoundPage = () => import("@/pages/NotFoundPage.vue");

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
      component: loadHomePage,
      meta: { navigation: "home" },
    },
    {
      path: "/library",
      name: "library",
      component: loadLibraryPage,
      meta: { navigation: "library", title: "Library" },
    },
    {
      path: "/settings",
      name: "settings",
      component: loadSettingsPage,
      meta: { navigation: "settings", title: "Settings" },
    },
    {
      path: "/courses/:courseId",
      name: "course",
      component: loadCoursePage,
      meta: { navigation: "library", title: "Course details" },
    },
    {
      path: "/instructors/:instructorName",
      name: "instructor",
      component: loadInstructorPage,
      meta: { navigation: "library", title: "Instructor" },
    },
    {
      path: "/lessons/:lessonId",
      name: "player",
      component: loadPlayerPage,
      meta: { navigation: "library", shell: "player", title: "Lesson" },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: loadNotFoundPage,
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
