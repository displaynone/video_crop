import { create } from 'zustand';
import type { StateCreator } from 'zustand';

type ExportMode = 'reencode' | 'copy';

interface VideoState {
  inputPath: string | null;
  outputPath: string | null;
  startTime: string;
  endTime: string;
  mode: ExportMode;
  duration: number;
  currentTime: number;
  isExporting: boolean;
  progress: number;
  progressLabel: string;
  log: string;
  exportDuration: number;
}

interface VideoActions {
  setInputPath: (value: string | null) => void;
  setOutputPath: (value: string | null) => void;
  setStartTime: (value: string) => void;
  setEndTime: (value: string) => void;
  setMode: (value: ExportMode) => void;
  setDuration: (value: number) => void;
  setCurrentTime: (value: number) => void;
  setIsExporting: (value: boolean) => void;
  setProgress: (value: number) => void;
  setProgressLabel: (value: string) => void;
  setExportDuration: (value: number) => void;
  appendLog: (value: string) => void;
  clearLog: () => void;
}

type VideoStore = VideoState & VideoActions;

const initialState: VideoState = {
  inputPath: null,
  outputPath: null,
  startTime: '00:00:00',
  endTime: '00:00:00',
  mode: 'reencode',
  duration: 0,
  currentTime: 0,
  isExporting: false,
  progress: 0,
  progressLabel: 'Esperando exportacion...',
  log: '',
  exportDuration: 0
};

const createVideoStore: StateCreator<VideoStore> = (set) => ({
  ...initialState,
  setInputPath: (value) => set({ inputPath: value }),
  setOutputPath: (value) => set({ outputPath: value }),
  setStartTime: (value) => set({ startTime: value }),
  setEndTime: (value) => set({ endTime: value }),
  setMode: (value) => set({ mode: value }),
  setDuration: (value) => set({ duration: value }),
  setCurrentTime: (value) => set({ currentTime: value }),
  setIsExporting: (value) => set({ isExporting: value }),
  setProgress: (value) => set({ progress: value }),
  setProgressLabel: (value) => set({ progressLabel: value }),
  setExportDuration: (value) => set({ exportDuration: value }),
  appendLog: (value) => set((state: VideoStore) => ({ log: state.log + value })),
  clearLog: () => set({ log: '' })
});

export const useVideoStore = create<VideoStore>(createVideoStore);

export type { ExportMode, VideoStore };
