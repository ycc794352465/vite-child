export const routes = [
  {
    path: "/home",
    name: "home",
    component: () => import("../view/home/index.vue"),
  },
  {
    path: "/test",
    name: "test",
    component: () => import("../view/test/index.vue"),
  },
];