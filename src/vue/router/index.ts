import { createRouter, createWebHistory } from "vue-router";

import CoursePage from "../pages/CoursePage.vue";
import HomePage from "../pages/HomePage.vue";
import InstructorPage from "../pages/InstructorPage.vue";
import PlayerPage from "../pages/PlayerPage.vue";
import SettingsPage from "../pages/SettingsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomePage },
    { path: "/settings", name: "settings", component: SettingsPage },
    {
      path: "/courses/:courseId",
      name: "course",
      component: CoursePage,
    },
    {
      path: "/instructors/:instructorName",
      name: "instructor",
      component: InstructorPage,
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
