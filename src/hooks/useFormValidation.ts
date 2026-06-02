import { ref, reactive } from 'vue'

// ... existing code ...
/**
 * 创建表单验证 Hook，提供响应式的表单值管理、字段验证和错误处理功能
 * 
 * @param initialValues - 表单字段的初始值对象，键为字段名，值为字段初始值
 * @param rules - 表单字段的验证规则配置对象，键为字段名，值为该字段的验证规则数组
 * @returns 返回包含以下属性的对象：
 *   - values: 响应式的表单值对象
 *   - errors: 响应式的字段错误信息对象
 *   - touched: 响应式的字段是否被触碰过的状态对象
 *   - isSubmitting: 表单是否正在提交的响应式引用
 *   - validateField: 验证单个字段的函数，接收字段名，返回验证是否通过
 *   - validateAll: 验证所有字段的函数，返回整体验证是否通过
 *   - resetForm: 重置表单到初始状态的函数
 *   - setFieldValue: 设置指定字段值的函数，如果字段已被触碰过会自动触发验证
 *   - clearFieldError: 清除指定字段错误信息的函数
 */
export default function useFormValidation(initialValues: Record<string, any> = {}, rules: FieldConfig = {}) {
// ... existing code ...
  const values = reactive<Record<string, any>>({ ...initialValues })
  const errors = reactive<Record<string, string>>({})
  const touched = reactive<Record<string, boolean>>({})
  const isSubmitting = ref(false)

  /**
   * 验证单个字段的值是否符合规则
   * 
   * @param field - 要验证的字段名
   * @returns 验证是否通过，true 表示通过，false 表示失败
   */
  const validateField = (field: string): boolean => {
    const fieldRules = rules[field]
    if (!fieldRules || fieldRules.length === 0) {
      return true
    }

    const value = values[field]
    let errorMessage = ''

    // 遍历字段的所有验证规则，依次进行验证
    for (const rule of fieldRules) {
      if (rule.required && (value === undefined || value === null || value === '')) {
        errorMessage = rule.message || `${rule.name || field}是必填项`
        break
      }

      if (value && rule.pattern && !rule.pattern.test(value)) {
        errorMessage = rule.message || `${rule.name || field}格式不正确`
        break
      }

      if (value && typeof value === 'string') {
        if (rule.min && value.length < rule.min) {
          errorMessage = rule.message || `${rule.name || field}至少需要${rule.min}个字符`
          break
        }
        if (rule.max && value.length > rule.max) {
          errorMessage = rule.message || `${rule.name || field}不能超过${rule.max}个字符`
          break
        }
      }

      if (rule.validator) {
        const result = rule.validator(value)
        if (result !== true) {
          errorMessage = typeof result === 'string' ? result : (rule.message || `${rule.name || field} 验证失败`)
          break
        }
      }
    }

    errors[field] = errorMessage
    touched[field] = true
    return !errorMessage
  }

  /**
   * 验证所有配置了规则的字段
   * 
   * @returns 所有字段是否都验证通过，true 表示全部通过，false 表示存在验证失败的字段
   */
  const validateAll = (): boolean => {
    const fields = Object.keys(rules)
    let isValid = true

    fields.forEach(field => {
      const fieldValid = validateField(field)
      if (!fieldValid) {
        isValid = false
      }
    })

    return isValid
  }

  /**
   * 重置表单到初始状态，包括清空所有字段值、错误信息和触碰状态
   */
  const resetForm = () => {
    Object.keys(values).forEach(key => {
      values[key] = initialValues[key] ?? ''
    })
    Object.keys(errors).forEach(key => {
      errors[key] = ''
    })
    Object.keys(touched).forEach(key => {
      touched[key] = false
    })
    isSubmitting.value = false
  }

  /**
   * 设置指定字段的值，如果该字段已被触碰过则自动触发验证
   * 
   * @param field - 要设置值的字段名
   * @param value - 要设置的字段值
   */
  const setFieldValue = (field: string, value: any) => {
    values[field] = value
    if (touched[field]) {
      validateField(field)
    }
  }

  /**
   * 清除指定字段的错误信息
   * 
   * @param field - 要清除错误的字段名
   */
  const clearFieldError = (field: string) => {
    errors[field] = ''
  }

  return {
    values,
    errors,
    touched,
    isSubmitting,
    validateField,
    validateAll,
    resetForm,
    setFieldValue,
    clearFieldError
  }
}