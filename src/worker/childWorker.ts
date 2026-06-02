// src/workers/hashWorker.ts
self.onmessage = async (e: MessageEvent) => {
  const { file, chunkIndex, chunkSize } = e.data;
  
  try {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const buffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    self.postMessage({ 
      success: true, 
      chunkIndex, 
      hash: hashHex,
      chunk 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({ 
      success: false, 
      chunkIndex, 
      error: errorMessage
    });
  }
};