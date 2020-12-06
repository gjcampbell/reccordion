export interface IFrameExtractor {
  extractFrames(webmBlob: Blob, fps: number): Promise<{ files: string[]; blobs: Blob[] }>;
  extractFrames(webmBlob: Blob): Promise<{ files: string[]; blobs: Blob[] }>;
}
