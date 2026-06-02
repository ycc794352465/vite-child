<template>
  <div class="big-file-upload">
    <h2>大文件分片上传</h2>
    
    <div class="upload-area">
      <input 
        type="file" 
        ref="fileInput" 
        @change="handleFileSelect" 
        :disabled="uploading"
        class="file-input"
      />
      <div v-if="selectedFile" class="file-info">
        <p>文件名: {{ selectedFile.name }}</p>
        <p>文件大小: {{ formatFileSize(selectedFile.size) }}</p>
      </div>
    </div>

    <div v-if="selectedFile" class="controls">
      <button @click="startUpload" :disabled="uploading || uploadComplete">
        {{ uploading ? '上传中...' : '开始上传' }}
      </button>
      <button @click="pauseUpload" :disabled="!uploading">暂停</button>
      <button @click="resumeUpload" :disabled="!paused || uploadComplete">继续</button>
      <button @click="cancelUpload" :disabled="!uploading && !paused">取消</button>
    </div>

    <div v-if="uploadProgress.total > 0" class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${uploadProgress.percentage}%` }"
        ></div>
      </div>
      <div class="progress-info">
        <span>{{ uploadProgress.percentage }}%</span>
        <span>{{ formatFileSize(uploadProgress.loaded) }} / {{ formatFileSize(uploadProgress.total) }}</span>
      </div>
      <div class="chunk-info">
        <span>已上传: {{ uploadProgress.uploadedChunks }} / {{ uploadProgress.totalChunks }} 分片</span>
      </div>
    </div>

    <div v-if="uploadLog.length > 0" class="log-container">
      <h3>上传日志</h3>
      <div class="log-content">
        <p v-for="(log, index) in uploadLog" :key="index">{{ log }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatFileSize } from '@/common/utils';
import useBigFileUpload from '@/hooks/useBigFIleUpload';

const { 
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
 } = useBigFileUpload();
</script>

<style scoped lang="less">
.big-file-upload {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.upload-area {
  margin: 20px 0;
  padding: 20px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  text-align: center;
}
.file-input {
  display: block;
  margin: 0 auto;
  padding: 10px;
  cursor: pointer;
}
.file-info {
  margin-top: 10px;
  text-align: left;
}

.controls {
  margin: 20px 0;
  display: flex;
  gap: 10px;
}

.controls button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background-color: #409eff;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.controls button:hover:not(:disabled) {
  background-color: #66b1ff;
}

.controls button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.progress-container {
  margin: 20px 0;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #409eff;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 14px;
}

.chunk-info {
  margin-top: 5px;
  font-size: 14px;
  color: #666;
}

.log-container {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.log-content {
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
}

.log-content p {
  margin: 2px 0;
}
</style>