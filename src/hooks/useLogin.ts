import { inject, Ref } from 'vue'
import { useRouter } from "vue-router";
import { loginHttp } from "@/common/request";

interface UseLoginParams {
  validateAll: () => boolean;
  isSubmitting: Ref<boolean>;
  formData: Record<string, any>;
}
// ... existing code ...
/**
 * 登录功能 Hook
 * @param validateAll - 表单验证函数，返回布尔值表示验证是否通过
 * @param isSubmitting - 提交状态响应式引用，用于防止重复提交
 * @param formData - 表单数据响应式引用，包含用户名和密码信息
 * @returns 包含登录方法的对象
 */
export default function useLogin({ validateAll, isSubmitting, formData }: UseLoginParams) {
    const router = useRouter();
    const ElMessage = inject<MessageType>('message')

    /**
     * 执行登录操作
     * 验证表单、调用登录接口、存储 token 并跳转至首页
     */
    const loginWay = async () => {
        if(!validateAll()) {
            ElMessage!.warning("请修正表单错误后再试");
            return
        }
        if(isSubmitting.value) return;
        
        try {
            const res = await loginHttp(formData as {username: string, password: string});
            console.log(res,111);
            localStorage.setItem("accessToken", res.accessToken);
            localStorage.setItem("refreshToken", res.refreshToken);
            router.push("/home");
        } catch (error) {
            ElMessage!.error("登录失败:");
        }
    };
    
    return {
        loginWay
    }
};
// ... existing code ...
