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
}

export {};