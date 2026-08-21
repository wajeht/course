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

export const loadHomePage = () => import("@/pages/home/HomePage.vue");
export const loadLibraryPage = () => import("@/pages/library/LibraryPage.vue");
export const loadSettingsLibraryPage = () => import("@/pages/settings/LibraryPage.vue");
export const loadSettingsAccessPage = () => import("@/pages/settings/AccessPage.vue");
export const loadCoursePage = () => import("@/pages/playlist/CoursePage.vue");
export const loadInstructorPage = () => import("@/pages/author/InstructorPage.vue");
export const loadPlayerPage = () => import("@/pages/player/PlayerPage.vue");

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
      path: "/settings/library",
      name: "settings-library",
      component: loadSettingsLibraryPage,
      meta: { navigation: "settings", title: "Library settings" },
    },
    {
      path: "/settings/access",
      name: "settings-access",
      component: loadSettingsAccessPage,
      meta: { navigation: "settings", title: "Access settings" },
    },
    {
      path: "/playlists/:courseId",
      name: "playlist",
      component: loadCoursePage,
      meta: { navigation: "library", title: "Playlist details" },
    },
    {
      path: "/authors/:instructorName",
      name: "author",
      component: loadInstructorPage,
      meta: { navigation: "library", title: "Author" },
    },
    {
      path: "/videos/:lessonId",
      name: "player",
      component: loadPlayerPage,
      meta: { navigation: "library", shell: "player", title: "Video" },
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
