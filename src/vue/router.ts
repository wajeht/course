import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("./pages/HomePage.vue") },
    {
      path: "/settings",
      name: "settings",
      component: () => import("./pages/SettingsPage.vue"),
    },
    {
      path: "/courses/:courseId",
      name: "course",
      component: () => import("./pages/CoursePage.vue"),
    },
    {
      path: "/instructors/:instructorName",
      name: "instructor",
      component: () => import("./pages/InstructorPage.vue"),
    },
    {
      path: "/lessons/:lessonId",
      name: "player",
      component: () => import("./pages/PlayerPage.vue"),
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: (to, from) => (to.path === from.path ? false : { top: 0 }),
});
