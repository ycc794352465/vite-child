export const routes = [
  {
    path: "/login",
    name: "login",
    component: () => import("../view/login/index.vue"),
  },
  {
    path: "/register",
    name: "register",
    component: () => import("../view/register/index.vue"),
  },
  {
    path: "/home",
    name: "home",
    component: () => import("../view/home/index.vue"),
  },
  {
    path: "/test",
    name: "test",
    component: () => import("../view/test/index.vue"),
  }
];