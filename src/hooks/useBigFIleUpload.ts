

import { ref, reactive, onUnmounted } from "vue";
import axios from "axios";
import HashWorker from "@/worker/childWorker?worker";

/**
 * 大文件分片上传Hook
 * 
 * 提供大文件的分片上传功能，支持断点续传、暂停/恢复、取消等操作。
 * 文件会被分割成2MB的分片，通过Web Worker计算每个分片的哈希值，
 * 然后并发上传（最多3个并发），最后合并所有分片。
 * 
 * @returns {Object} 返回上传相关的状态和方法
 * @returns {Ref<File | null>} returns.selectedFile - 当前选择的文件
 * @returns {Ref<boolean>} returns.uploading - 是否正在上传
 * @returns {Reactive<Object>} returns.uploadProgress - 上传进度信息
 * @returns {Ref<string[]>} returns.uploadLog - 上传日志记录
 * @returns {Ref<boolean>} returns.uploadComplete - 上传是否完成
 * @returns {Ref<boolean>} returns.paused - 上传是否暂停
 * @returns {Function} returns.startUpload - 开始上传文件
 * @returns {Function} returns.handleFileSelect - 处理文件选择事件
 * @returns {Function} returns.pauseUpload - 暂停上传
 * @returns {Function} returns.resumeUpload - 恢复上传
 * @returns {Function} returns.cancelUpload - 取消上传
 */
export default function useBigFileUpload() {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per chunk
  const MAX_CONCURRENT = 3; // Max concurrent uploads

  const fileInput = ref<HTMLInputElement | null>(null);
  const selectedFile = ref<File | null>(null);
  const uploading = ref(false);
  const paused = ref(false);
  const uploadComplete = ref(false);

  const uploadProgress = reactive({
    percentage: 0,
    loaded: 0,
    total: 0,
    uploadedChunks: 0,
    totalChunks: 0,
  });

  const uploadLog = ref<string[]>([]);

  let worker: Worker | null = null;
  let abortController: AbortController | null = null;
  let uploadedChunks: Set<number> = new Set();
  let pendingChunks: Array<{ index: number; chunk: Blob; hash: string }> = [];
  let activeWorkers = 0;

  /**
   * 添加上传日志记录
   * @param message - 日志消息内容
   */
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    uploadLog.value.push(`[${timestamp}] ${message}`);
    if (uploadLog.value.length > 50) {
      uploadLog.value.shift();
    }
  };

  /**
   * 处理文件选择事件
   * @param event - 文件输入框的change事件
   */
  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;

    if (!target.files || target.files.length === 0) {
      return;
    }

    const file = target.files[0];

    selectedFile.value = file;
    resetUploadState();
    addLog(`选择文件: ${file.name}`);

    // 不要在这里清空 value，等上传完成或取消时再清空
  };

  /**
   * 重置上传状态到初始值
   */
  const resetUploadState = () => {
    uploading.value = false;
    paused.value = false;
    uploadComplete.value = false;
    uploadProgress.percentage = 0;
    uploadProgress.loaded = 0;
    uploadProgress.total = 0;
    uploadProgress.uploadedChunks = 0;
    uploadProgress.totalChunks = 0;
    uploadedChunks.clear();
    pendingChunks = [];
    activeWorkers = 0;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  };

  /**
   * 使用Web Worker计算文件分片的哈希值
   * @param file - 要处理的文件对象
   * @param chunkIndex - 分片索引
   * @returns Promise<{ hash: string; chunk: Blob }> - 返回分片的哈希值和分片数据
   */
  const calculateChunkHash = (
    file: File,
    chunkIndex: number,
  ): Promise<{ hash: string; chunk: Blob }> => {
    return new Promise((resolve, reject) => {
      worker = new HashWorker();

      worker.onmessage = (e: MessageEvent) => {
        if (e.data.success) {
          resolve({ hash: e.data.hash, chunk: e.data.chunk });
        } else {
          reject(new Error(e.data.error));
        }
        if (worker) {
          worker.terminate();
          worker = null;
        }
      };

      worker.onerror = (error) => {
        reject(error);
        if (worker) {
          worker.terminate();
          worker = null;
        }
      };

      worker.postMessage({ file, chunkIndex, chunkSize: CHUNK_SIZE });
    });
  };

  /**
   * 上传单个文件分片
   * @param chunkIndex - 分片索引
   * @param chunk - 分片数据
   * @param hash - 分片的哈希值
   * @returns Promise<void>
   */
  const uploadChunk = async (
    chunkIndex: number,
    chunk: Blob,
    hash: string,
  ): Promise<void> => {
    if (!abortController) {
      abortController = new AbortController();
    }
    const formData = new FormData();
    formData.append(
      "file",
      chunk,
      `${selectedFile.value!.name}.part${chunkIndex}`,
    );
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", uploadProgress.totalChunks.toString());
    formData.append("fileHash", hash);
    formData.append("fileName", selectedFile.value!.name);
    formData.append("fileSize", selectedFile.value!.size.toString());

    try {
      await axios.post("/api/upload/chunk", formData, {
        signal: abortController.signal,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            uploadProgress.loaded += progressEvent.bytes;
            updateProgress();
          }
        },
      });

      uploadedChunks.add(chunkIndex);
      uploadProgress.uploadedChunks = uploadedChunks.size;
      addLog(`分片 ${chunkIndex + 1}/${uploadProgress.totalChunks} 上传成功`);
      updateProgress();
    } catch (error: any) {
      if (axios.isCancel(error)) {
        addLog(`分片 ${chunkIndex + 1} 上传已取消`);
      } else {
        addLog(`分片 ${chunkIndex + 1} 上传失败: ${error.message}`);
        throw error;
      }
    }
  };

  /**
   * 合并所有已上传的分片
   * @returns Promise<void>
   */
  const mergeChunks = async (): Promise<void> => {
    try {
      addLog("正在合并分片...");
      await axios.post("/api/upload/merge", {
        fileName: selectedFile.value!.name,
        totalChunks: uploadProgress.totalChunks,
        fileSize: selectedFile.value!.size,
      });
      addLog("文件合并成功");
      uploadComplete.value = true;

      // 上传完成后清空 input
      if (fileInput.value) {
        fileInput.value.value = "";
      }
    } catch (error: any) {
      addLog(`文件合并失败: ${error.message}`);
      throw error;
    }
  };

  /**
   * 更新上传进度百分比
   */
  const updateProgress = () => {
    if (uploadProgress.total > 0) {
      uploadProgress.percentage = Math.round(
        (uploadProgress.loaded / uploadProgress.total) * 100,
      );
    }
  };

  /**
   * 处理下一个待上传的分片，控制并发数量
   */
  const processNextChunk = async () => {
    if (
      paused.value ||
      pendingChunks.length === 0 ||
      activeWorkers >= MAX_CONCURRENT
    ) {
      return;
    }

    const chunkData = pendingChunks.shift();
    if (!chunkData) return;

    activeWorkers++;

    try {
      await uploadChunk(chunkData.index, chunkData.chunk, chunkData.hash);
    } catch (error) {
      addLog(`处理分片 ${chunkData.index + 1} 时出错`);
    } finally {
      activeWorkers--;
      processNextChunk();
    }
  };

  /**
   * 开始上传文件
   * 将文件分割成多个分片，计算每个分片的哈希值，然后并发上传
   * @returns Promise<void>
   */
  const startUpload = async () => {
    if (!selectedFile.value) {
      addLog("请先选择文件");
      return;
    }

    uploading.value = true;
    paused.value = false;
    uploadComplete.value = false;
    abortController = new AbortController();

    const totalChunks = Math.ceil(selectedFile.value.size / CHUNK_SIZE);
    uploadProgress.totalChunks = totalChunks;
    uploadProgress.total = selectedFile.value.size;
    uploadProgress.loaded = 0;
    uploadProgress.uploadedChunks = 0;

    addLog(`开始上传，总分片数: ${totalChunks}`);

    try {
      for (let i = 0; i < totalChunks; i++) {
        if (uploadedChunks.has(i)) {
          continue;
        }

        while (paused.value) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        addLog(`正在计算分片 ${i + 1} 的哈希值...`);
        const { hash, chunk } = await calculateChunkHash(selectedFile.value, i);
        pendingChunks.push({ index: i, chunk, hash });

        processNextChunk();
      }

      while (activeWorkers > 0 || pendingChunks.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (uploadedChunks.size === totalChunks) {
        await mergeChunks();
      }
    } catch (error: any) {
      if (axios.isCancel(error)) {
        addLog("上传已取消");
      } else {
        addLog(`上传失败: ${error.message}`);
      }
    } finally {
      uploading.value = false;
    }
  };

  /**
   * 暂停上传
   */
  const pauseUpload = () => {
    paused.value = true;
    addLog("上传已暂停");
  };

  /**
   * 恢复上传
   */
  const resumeUpload = () => {
    paused.value = false;
    addLog("上传已恢复");
    processNextChunk();
  };

  /**
   * 取消上传并清理资源
   */
  const cancelUpload = () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    uploading.value = false;
    paused.value = false;

    // 清空文件选择
    if (fileInput.value) {
      fileInput.value.value = "";
    }
    selectedFile.value = null;
    addLog("上传已取消");
  };

  /**
   * 组件卸载时清理Worker和AbortController资源
   */
  onUnmounted(() => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  });

  return {
    selectedFile,
    uploading,
    uploadProgress,
    uploadLog,
    uploadComplete,
    paused,
    startUpload,
    handleFileSelect,
    pauseUpload,
    resumeUpload,
    cancelUpload,
  };
}