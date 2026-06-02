// 新增：防抖函数封装
export const debounce: Debounce = (fn, delay = 30) => {
  let timer: any = null;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

export const throttleStart:Throttle = (fn,delay) => {
    let timeoutId: ReturnType<typeof setTimeout> | null;
    return (...args) => {
        if (!timeoutId) {
            timeoutId = setTimeout(() => {
                fn.apply(this, args);
                timeoutId = null;
            }, delay);
        }
    };
};

export const throttleEnd:Throttle = (fn,delay=0) => {
    let lastTime: number = 0;
    return (...args) => {
        let nowTime = Date.now();
        if (nowTime - lastTime >= delay) {
            fn.apply(this, args);
            lastTime = nowTime;
        }
    };
};

export const throttleAnd:Throttle = (fn,delay=0) => {
    let lastTime: number = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null;
    return (...args) => {
        let nowTime = Date.now();
        if (nowTime - lastTime >= delay) {
            fn.apply(this, args);
            lastTime = nowTime;
        } else {
            if (!timeoutId) {
                timeoutId = setTimeout(() => {
                    fn.apply(this, args);
                    lastTime = Date.now();
                    timeoutId = null;
                }, delay - (nowTime - lastTime));
            }
        }
    }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};