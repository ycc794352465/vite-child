

import { ref, reactive, onUnmounted } from "vue";
import axios from "axios";
import HashWorker from "@/worker/childWorker?worker";
import { formatFileSize } from "@/common/utils";

// ... existing code ...
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
 * @returns {Function} returns.pauseUpload - 暂停上传
 * @returns {Function} returns.resumeUpload - 恢复上传
 * @returns {Function} returns.cancelUpload - 取消上传
 */
export default function useBigFileUpload() {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per chunk
  const MAX_CONCURRENT = 3; // Max concurrent uploads

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
  let isPausing = false;
  let isCanceling = false;
  let cachedFileName = '';
  let cachedFileSize = 0;
  let chunkUploadProgress: Map<number, number> = new Map(); // 记录每个分片的上传进度（字节数）

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
   * 选择要上传的文件并重置上传状态
   * @param file - 用户选择的文件对象
   */
  const selectFile = (file: File) => {
    selectedFile.value = file;
    resetUploadState();
    addLog(`选择文件: ${file.name}`);
    addLog(`文件大小: ${formatFileSize(file.size)}`);
  };

  /**
   * 重置上传状态到初始值
   * @param keepCancelingFlag - 是否保留取消标志位，默认为false
   */
  const resetUploadState = (keepCancelingFlag = false) => {
    uploading.value = false;
    paused.value = false;
    uploadComplete.value = false;
    uploadProgress.percentage = 0;
    uploadProgress.loaded = 0;
    uploadProgress.total = 0;
    uploadProgress.uploadedChunks = 0;
    uploadProgress.totalChunks = 0;
    uploadedChunks.clear();
    chunkUploadProgress.clear();
    pendingChunks = [];
    activeWorkers = 0;
    isPausing = false;
    cachedFileName = '';
    cachedFileSize = 0;
    if (!keepCancelingFlag) {
      isCanceling = false;
    }
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

      worker.postMessage({ type: 'hashFileChunk', file, chunkIndex, chunkSize: CHUNK_SIZE });
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
    if (isCanceling) {
      throw new Error('Upload cancelled');
    }
    if (!abortController) {
      abortController = new AbortController();
    }
    const formData = new FormData();
    const fileName = cachedFileName || selectedFile.value?.name || 'unknown';
    const fileSize = cachedFileSize || selectedFile.value?.size || 0;
    formData.append(
      "file",
      chunk,
      `${fileName}.part${chunkIndex}`,
    );
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", uploadProgress.totalChunks.toString());
    formData.append("fileHash", hash);
    formData.append("fileName", fileName);
    formData.append("fileSize", fileSize.toString());

    try {
      await axios.post("/api/upload/chunk", formData, {
        signal: abortController.signal,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            chunkUploadProgress.set(chunkIndex, progressEvent.loaded);
            updateProgress();
          }
        },
      });

      uploadedChunks.add(chunkIndex);
      chunkUploadProgress.delete(chunkIndex);
      uploadProgress.uploadedChunks = uploadedChunks.size;
      addLog(`分片 ${chunkIndex + 1}/${uploadProgress.totalChunks} 上传成功`);
      updateProgress();
    } catch (error: any) {
      if (isAbortError(error)) {
        if (isPausing && !isCanceling) {
          addLog(`分片 ${chunkIndex + 1} 上传已暂停`);
        } else if (isCanceling) {
          addLog(`分片 ${chunkIndex + 1} 上传已取消`);
        }
        chunkUploadProgress.delete(chunkIndex);
        return;
      }
      addLog(`分片 ${chunkIndex + 1} 上传失败: ${error.message}`);
      chunkUploadProgress.delete(chunkIndex);
      throw error;
    }
  };

  /**
   * 合并所有已上传的分片
   * @returns Promise<void>
   */
  const mergeChunks = async (): Promise<void> => {
    try {
      addLog("正在合并分片...");
      const fileName = cachedFileName || selectedFile.value?.name || 'unknown';
      const fileSize = cachedFileSize || selectedFile.value?.size || 0;
      await axios.post("/api/upload/merge", {
        fileName: fileName,
        totalChunks: uploadProgress.totalChunks,
        fileSize: fileSize,
      });
      addLog("文件合并成功");
      uploadComplete.value = true;
    } catch (error: any) {
      addLog(`文件合并失败: ${error.message}`);
      throw error;
    }
  };

  /**
   * 更新上传进度百分比
   * 综合考虑已完成分片和正在上传分片的进度，计算总体上传进度
   */
  const updateProgress = () => {
    if (uploadProgress.total > 0) {
      // 计算已完成分片的字节数
      const completedBytes = uploadProgress.uploadedChunks * CHUNK_SIZE;
      // 计算正在上传的分片的累计字节数
      let uploadingBytes = 0;
      chunkUploadProgress.forEach((progress) => {
        uploadingBytes += progress;
      });
      // 总已加载字节数
      uploadProgress.loaded = Math.min(completedBytes + uploadingBytes, uploadProgress.total);
      uploadProgress.percentage = Math.round(
        (uploadProgress.loaded / uploadProgress.total) * 100,
      );
    }
  };

  /**
   * 判断错误是否为取消或中止相关的错误
   * @param error - 需要判断的错误对象
   * @returns boolean - 是否为取消/中止错误
   */
  const isAbortError = (error: any) => {
    return axios.isCancel?.(error) ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError' ||
      error?.code === 'ERR_CANCELED';
  };

  /**
   * 处理下一个待上传的分片，控制并发数量
   * 从待上传队列中取出分片进行上传，确保同时进行的上传任务不超过MAX_CONCURRENT限制
   */
  const processNextChunk = async () => {
    if (
      paused.value ||
      isCanceling ||
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
    } catch (error: any) {
      if (paused.value && !isCanceling) {
        addLog(`分片 ${chunkData.index + 1} 暂停，稍后重试`);
        pendingChunks.unshift(chunkData);
      } else if (!isCanceling) {
        addLog(`处理分片 ${chunkData.index + 1} 时出错: ${error?.message || error}`);
      }
    } finally {
      activeWorkers--;
      if (!paused.value && !isCanceling) {
        processNextChunk();
      }
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

    // 缓存文件信息，防止后续取消时访问 null
    cachedFileName = selectedFile.value.name;
    cachedFileSize = selectedFile.value.size;
    isCanceling = false;
    isPausing = false;

    if (typeof selectedFile.value.stream === 'function') {
      await streamUploadFile(selectedFile.value);
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
    uploadProgress.percentage = 0;
    chunkUploadProgress.clear();

    addLog(`开始上传，总分片数: ${totalChunks}`);

    try {
      for (let i = 0; i < totalChunks; i++) {
        if (isCanceling) {
          addLog('上传已取消，停止后续分片处理');
          break;
        }

        if (uploadedChunks.has(i)) {
          continue;
        }

        while (paused.value) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (isCanceling) break;
        }

        if (isCanceling) {
          addLog('上传已取消，停止后续分片处理');
          break;
        }

        addLog(`正在计算分片 ${i + 1} 的哈希值...`);
        const { hash, chunk } = await calculateChunkHash(selectedFile.value, i);
        pendingChunks.push({ index: i, chunk, hash });

        processNextChunk();
      }

      while (!isCanceling && (activeWorkers > 0 || pendingChunks.length > 0)) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!isCanceling && uploadedChunks.size === totalChunks) {
        await mergeChunks();
      }
    } catch (error: any) {
      if (isAbortError(error)) {
        addLog("上传已取消");
      } else {
        addLog(`上传失败: ${error.message}`);
      }
    } finally {
      uploading.value = false;
      if (!isCanceling) {
        selectedFile.value = null;
        cachedFileName = '';
        cachedFileSize = 0;
      }
    }
  };

  /**
   * 暂停上传
   * 中止当前的上传请求，设置暂停状态，允许后续恢复
   */
  const pauseUpload = () => {
    if (!uploading.value || paused.value) {
      return;
    }
    isPausing = true;
    isCanceling = false;
    paused.value = true;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    addLog("上传已暂停");
  };

  /**
   * 恢复上传
   * 清除暂停状态，创建新的AbortController，继续处理待上传的分片
   */
  const resumeUpload = () => {
    if (!paused.value) {
      return;
    }
    isPausing = false;
    paused.value = false;
    if (!abortController) {
      abortController = new AbortController();
    }
    addLog("上传已恢复");
    processNextChunk();
  };

  /**
   * 取消上传并清理资源
   * 设置取消标志，重置上传状态，清空选中的文件
   */
  const cancelUpload = () => {
    if (!uploading.value && !paused.value) {
      return;
    }

    isCanceling = true;
    resetUploadState(true);
    selectedFile.value = null;
    addLog("上传已取消");
  };


  /**
   * 降级方案：传统 input 选择文件
   * 动态创建隐藏的input元素用于文件选择，适用于不支持现代文件API的浏览器
   * @returns Promise<File | null> - 返回用户选择的文件或null
   */
  function fallbackFileSelection(): Promise<File | null> {
    return new Promise<File | null>((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.style.display = 'none';
      inp.accept = '*/*';
      
      inp.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        if (target && target.files && target.files.length > 0) {
          resolve(target.files[0]);
        } else {
          resolve(null);
        }
        if (document.body.contains(inp)) {
          document.body.removeChild(inp);
        }
      };
      
      inp.oncancel = () => {
        resolve(null);
        if (document.body.contains(inp)) {
          document.body.removeChild(inp);
        }
      };
      
      document.body.appendChild(inp);
      inp.click();
    });
  }

 
  /**
   * 【新增】快速选择文件并立即开始流式上传
   * 使用 File System Access API，选择大文件时几乎瞬间返回
   * 优先使用现代API，失败时自动降级到传统方式
   */
  async function openFileDialog() {
    try {
      // ✅ 优先使用 File System Access API（选择大文件超快）
      if ('showOpenFilePicker' in window) {
        try {
          addLog('使用快速文件选择器...');
          const handles = await (window as any).showOpenFilePicker({
            multiple: false,
          });
          if (handles && handles.length > 0) {
            const file = await handles[0].getFile();
            selectFile(file);
            await startUpload();
            return;
          }
        } catch (apiError: any) {
          if (apiError.name === 'AbortError') {
            addLog('用户取消了文件选择');
            return;
          }
          addLog('快速选择失败，切换到传统模式');
          console.warn('File System Access API 错误:', apiError);
        }
      }

      // 降级到传统方式
      addLog('使用传统文件选择器...');
      const file = await fallbackFileSelection();

      if (file) {
        selectFile(file);
        await startUpload();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        addLog(`✗ 文件选择失败: ${error.message}`);
        console.error('文件选择错误:', error);
      }
    }
  }

  /**
   * 【新增】流式上传文件 - 边读取边上传
   * 使用 ReadableStream 逐块读取文件，累积到 CHUNK_SIZE 后立即启动上传（不阻塞读取）
   * 这种方式可以避免一次性加载整个文件到内存，适合超大文件上传
   * @param file - 要上传的文件对象
   */
  const streamUploadFile = async (file: File) => {
    // 缓存文件信息
    cachedFileName = file.name;
    cachedFileSize = file.size;
    uploading.value = true;
    paused.value = false;
    uploadComplete.value = false;
    abortController = new AbortController();

    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    
    uploadProgress.totalChunks = totalChunks;
    uploadProgress.total = totalSize;
    uploadProgress.loaded = 0;
    uploadProgress.uploadedChunks = 0;
    uploadProgress.percentage = 0;
    chunkUploadProgress.clear();

    addLog(`   分片大小: ${formatFileSize(CHUNK_SIZE)}`);
    addLog(`   预计分片数: ${totalChunks}`);

    try {
      // 检查浏览器是否支持流式读取
      if (!file.stream) {
        addLog('⚠️ 浏览器不支持流式读取，使用传统方式');
        await startUpload();
        return;
      }

      const stream = file.stream();
      const reader = stream.getReader();
      
      let currentChunkData: Uint8Array[] = [];
      let currentChunkSize = 0;
      let chunkIndex = 0;

      while (true) {
        // 检查是否取消
        if (isCanceling || abortController?.signal.aborted) {
          addLog('上传已取消');
          break;
        }

        // 暂停控制
        while (paused.value) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (isCanceling || abortController?.signal.aborted) break;
        }

        if (isCanceling) {
          addLog('上传已取消');
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          if (currentChunkSize > 0) {
            const currentIndex = chunkIndex;
            const chunkDataCopy = [...currentChunkData];
            const chunkBytes = concatUint8Arrays(chunkDataCopy);
            const chunkBuffer = chunkBytes.buffer as ArrayBuffer;
            const blob = new Blob([chunkBuffer], { type: 'application/octet-stream' });
            const hash = await calculateHashFromBuffer(chunkBuffer);
            pendingChunks.push({ index: currentIndex, chunk: blob, hash });
            processNextChunk();
            chunkIndex++;
          }

          addLog(`✅ 文件读取完成，等待 ${pendingChunks.length + activeWorkers} 个分片上传完成...`);
          while (activeWorkers > 0 || pendingChunks.length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          addLog(`✅ 流式上传完成！共上传 ${chunkIndex} 个分片`);
          uploadComplete.value = true;

          if (uploadedChunks.size === totalChunks) {
            await mergeChunks();
          }
          break;
        }

        currentChunkData.push(value);
        currentChunkSize += value.length;

        if (currentChunkSize >= CHUNK_SIZE) {
          const currentIndex = chunkIndex;
          const chunkDataCopy = [...currentChunkData];
          const chunkBytes = concatUint8Arrays(chunkDataCopy);
          const chunkBuffer = chunkBytes.buffer as ArrayBuffer;
          const blob = new Blob([chunkBuffer], { type: 'application/octet-stream' });
          const hash = await calculateHashFromBuffer(chunkBuffer);
          pendingChunks.push({ index: currentIndex, chunk: blob, hash });
          processNextChunk();

          if (chunkIndex % 10 === 0) {
            addLog(`📤 已提交 ${currentIndex + 1} 个分片到后台上传`);
          }

          currentChunkData = [];
          currentChunkSize = 0;
          chunkIndex++;
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      reader.releaseLock();
    } catch (error: any) {
      if (isAbortError(error)) {
        addLog('上传已取消');
      } else {
        addLog(`✗ 流式上传失败: ${error.message}`);
        console.error('流式上传错误:', error);
      }
    } finally {
      uploading.value = false;
      if (!isCanceling) {
        cachedFileName = '';
        cachedFileSize = 0;
      }
    }
  };

  /**
   * 将多个Uint8Array数组合并为一个
   * @param chunks - 需要合并的Uint8Array数组
   * @returns Uint8Array - 合并后的数组
   */
  const concatUint8Arrays = (chunks: Uint8Array[]): Uint8Array => {
    const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  };

  /**
   * 使用Web Worker计算ArrayBuffer的哈希值
   * @param buffer - 需要计算哈希的ArrayBuffer数据
   * @returns Promise<string> - 返回计算得到的哈希字符串
   */
  const calculateHashFromBuffer = (buffer: ArrayBuffer): Promise<string> => {
    return new Promise((resolve, reject) => {
      const hashWorker = new HashWorker();

      hashWorker.onmessage = (e: MessageEvent) => {
        if (e.data.success) {
          resolve(e.data.hash);
        } else {
          reject(new Error(e.data.error));
        }
        hashWorker.terminate();
      };

      hashWorker.onerror = (error) => {
        reject(error);
        hashWorker.terminate();
      };

      hashWorker.postMessage({ type: 'hashBuffer', buffer }, [buffer]);
    });
  };

// ... existing code ...
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
    pauseUpload,
    resumeUpload,
    cancelUpload,
    openFileDialog,
    streamUploadFile
  };
}