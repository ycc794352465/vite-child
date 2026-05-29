import { App,createApp } from 'vue'
import { createRouter, 
  // createWebHistory,
   createWebHashHistory } from 'vue-router'
import myApp from './App.vue'
import './style.css'
import { routes } from './router'
import store from './store'
// 👉 引入虚拟滚动
import VirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

// if (import.meta.env.DEV) {
//   import('./mocks/index.js')
// }
import '@/mocks/index.ts'

let app:App;

let router:any = null;
function render(props: any) {
  const { container } = props;
  console.log(routes)
  router = createRouter({
    // history: createWebHistory('/vite-child/'),
    history: createWebHashHistory(),
    routes
  })
  app =createApp(myApp);
  app.use(VirtualScroller)
  app.use(store)
  app.use(router)
  .mount(container ? container.querySelector('#child-app') : '#child-app')
}
render({});
