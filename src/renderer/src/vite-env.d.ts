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
