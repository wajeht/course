import { createRouter, createWebHistory } from "vue-router";

import CoursePage from "../pages/CoursePage.vue";
import HomePage from "../pages/HomePage.vue";
import PlayerPage from "../pages/PlayerPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomePage },
    {
      path: "/courses/:courseId",
      name: "course",
      component: CoursePage,
    },
    {
      path: "/lessons/:lessonId",
      name: "player",
      component: PlayerPage,
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
