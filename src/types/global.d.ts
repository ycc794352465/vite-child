declare global {
    interface SearchResultItem {
        content: string;
        [key: string]: any;
    }

    interface SearchApiResponse {
        data?: SearchResultItem[];
    }

    interface ChatMessage {
        role: 'system' | 'user' | 'assistant' | string;
        content: string | Record<string, any>;
        name?: string;
    }

    interface ChatRequestBody {
        model: string;
        messages: ChatMessage[];
        stream?: boolean;
        tools?: any[];
        tool_choice?: string;
    }
    interface AnyFunction {
        (...args: any[]): any;
    }

// 接口：防抖函数工厂签名
    interface Debounce {
        <T extends AnyFunction>(fn: T, delay?: number): (...args: Parameters<T>) => void;
    }
    interface Throttle {
        <T extends AnyFunction>(fn: T, delay?: number): (...args: Parameters<T>) => void;
    }
    interface ValidationRule {
      required?: boolean
      message?: string
      pattern?: RegExp
      min?: number
      max?: number
      validator?: (value: any) => boolean | string,
      name?: string
    }
    interface FieldConfig {
      [key: string]: ValidationRule[]
    }
    interface FormState {
      values: Record<string, any>
      errors: Record<string, string>
      touched: Record<string, boolean>
    }
    interface MessageType {
        success: (msg: string) => void;
        warning: (msg: string) => void;
        error: (msg: string) => void;
        info: (msg: string) => void;
    }
    interface ChunkMergeData {
        fileId?: string;
        fileName?: string;
        chunks?: number;
        [key: string]: any;
    }
}

export {};