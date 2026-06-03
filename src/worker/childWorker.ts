// src/workers/hashWorker.ts
self.onmessage = async (e: MessageEvent) => {
  const { type, file, chunkIndex, chunkSize, buffer } = e.data;

  try {
    if (type === 'hashFileChunk') {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      const hashBuffer = await chunk.arrayBuffer().then((buf: ArrayBuffer) => crypto.subtle.digest('SHA-256', buf));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      self.postMessage({
        success: true,
        chunkIndex,
        hash: hashHex,
      });
      return;
    }

    if (type === 'hashBuffer') {
      const data = buffer instanceof ArrayBuffer ? buffer : buffer?.buffer;
      if (!data) {
        throw new Error('Invalid buffer for hashing');
      }
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      self.postMessage({
        success: true,
        hash: hashHex,
      });
      return;
    }

    throw new Error('Unknown hash worker message type');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({
      success: false,
      error: errorMessage,
    });
  }
};