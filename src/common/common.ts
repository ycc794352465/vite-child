export const ZP_API: string = '4a97189a46664c66987f94ca24ccc9fc.swi8CDKj6yAYjt9P';


// 新增：防抖函数封装
export const debounce: Debounce = (fn, delay = 30) => {
  let timer: any = null;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};