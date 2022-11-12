import { App,createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import myApp from './App.vue'
import { routes } from './router'
import store from './store'
import { name as APP_NAME} from '../package.json';
import { renderWithQiankun, qiankunWindow } from "vite-plugin-qiankun/es/helper";

let app:App;

let router:any = null;
function render(props: any) {
  const { container } = props;
  router = createRouter({
    history: createWebHistory(`/${APP_NAME}/`),
    routes
  })
  app =createApp(myApp);
  app.use(store)
  app.use(router)
  .mount(container ? container.querySelector('#child-app') : '#child-app')
}
renderWithQiankun({
  mount(props) {
    render(props);
  },
  bootstrap() {
    console.log("bootstrap");
  },
  unmount(props: any) {
    app.unmount();
  },
  update(props: any) {
    console.log("vue3sub update");
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({});
}


// // 独立运行时
// if (!(window as any).__POWERED_BY_QIANKUN__) {
//   render({});
// }


// /**
//  * bootstrap ： 在微应用初始化的时候调用一次，之后的生命周期里不再调用
//  */
// export async function bootstrap() {
//   console.log('bootstrap');
// }

// /**
//  * mount ： 在应用每次进入时调用 
//  */
// export async function mount(props: any) {
//   console.log('mount', props);
//   render(props);
// }

// /**
//  * unmount ：应用每次 切出/卸载 均会调用
//  */
// export async function unmount() {
//   console.log('unmount');
//   app.unmount();
// }

// export async function update(props) {
//   console.log('update props', props);
// }
