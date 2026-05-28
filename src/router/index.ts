export const routes = [
  {
    path: "/login",
    name: "login",
    component: () => import("../view/login/index.vue"),
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