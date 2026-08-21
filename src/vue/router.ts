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

export const loadPlayerPage = () => import("@/pages/player/PlayerPage.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/home/HomePage.vue"),
      meta: { navigation: "home" },
    },
    {
      path: "/library",
      name: "library",
      component: () => import("@/pages/library/LibraryPage.vue"),
      meta: { navigation: "library", title: "Library" },
    },
    {
      path: "/settings/library",
      name: "settings-library",
      component: () => import("@/pages/settings/LibraryPage.vue"),
      meta: { navigation: "settings", title: "Settings" },
    },
    {
      path: "/settings/access",
      name: "settings-access",
      component: () => import("@/pages/settings/AccessPage.vue"),
      meta: { navigation: "settings", title: "Settings" },
    },
    {
      path: "/courses/:courseId",
      name: "course",
      component: () => import("@/pages/course/CoursePage.vue"),
      meta: { navigation: "library", title: "Course details" },
    },
    {
      path: "/instructors/:instructorName",
      name: "instructor",
      component: () => import("@/pages/instructor/InstructorPage.vue"),
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
      component: () => import("@/pages/NotFoundPage.vue"),
      meta: { title: "Page not found" },
    },
  ],
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition;
    return to.path === from.path ? false : { top: 0 };
  },
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
