/// <reference types="vite/client" />

interface ElectronAPI {
  openVideo: () => Promise<string | null>;
  saveVideo: (suggestedName?: string) => Promise<string | null>;
  runExport: (payload: {
    inputPath: string;
    outputPath: string;
    startTime: number;
    endTime: number;
    mode: 'reencode' | 'copy';
    crop?: { x: number; y: number; width: number; height: number } | null;
    cropPath?: {
      start: { x: number; y: number; width: number; height: number };
      end: { x: number; y: number; width: number; height: number };
    } | null;
  }) => void;
  cancelExport: () => void;
  onLog: (callback: (message: string) => void) => void;
  onProgress: (callback: (time: string) => void) => void;
  onDone: (callback: () => void) => void;
  onError: (callback: (message: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
