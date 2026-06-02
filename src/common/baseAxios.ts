import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
// import { ZP_API } from './common';

// const baseUrl = import.meta.env.VITE_API_BASE_URL;
const baseUrl = '';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const service: AxiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // if (ZP_API) {
    //   config.headers['Authorization'] = `Bearer ${ZP_API}`;
    // }
    
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers['X-Access-Token'] = accessToken;
    }
    
    return config;
  },
  (error: any) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;
    
    if (res.code && res.code !== 200) {
      console.error('响应错误:', res.message || 'Error');
      
      if (res.code === 401) {
        handleTokenRefresh();
      }
      
      return Promise.reject(new Error(res.message || 'Error'));
    }
    
    return res;
  },
  async (error: any) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['X-Access-Token'] = token;
            return service(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        const response = await axios.post(`${baseUrl}/auth/refresh`, {
          refreshToken
        });
        
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        service.defaults.headers.common['X-Access-Token'] = newAccessToken;
        originalRequest.headers['X-Access-Token'] = newAccessToken;
        
        processQueue(null, newAccessToken);
        
        return service(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/#/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    console.error('响应错误:', error.message);
    
    if (error.response) {
      switch (error.response.status) {
        case 400:
          console.error('请求参数错误');
          break;
        case 403:
          console.error('拒绝访问');
          break;
        case 404:
          console.error('请求地址不存在');
          break;
        case 500:
          console.error('服务器内部错误');
          break;
        case 502:
          console.error('网关错误');
          break;
        case 503:
          console.error('服务不可用');
          break;
        case 504:
          console.error('网关超时');
          break;
        default:
          console.error(`连接错误${error.response.status}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('请求超时');
    } else {
      console.error('网络连接异常');
    }
    
    return Promise.reject(error);
  }
);

const handleTokenRefresh = () => {
  console.log('Token 已过期，尝试刷新');
};

export default service;