import { useEffect, useRef, useState } from 'react';
import ExportPanel from './components/ExportPanel';
import Hero from './components/Hero';
import InitialScreen from './components/InitialScreen';
import ProgressPanel from './components/ProgressPanel';
import TrackPanel from './components/TrackPanel';
import VideoPanel from './components/VideoPanel';
import { parseTime } from './lib/time';
import { useVideoStore } from './store/useVideoStore';

const App = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setProgress = useVideoStore((state) => state.setProgress);
  const setProgressLabel = useVideoStore((state) => state.setProgressLabel);
  const setIsExporting = useVideoStore((state) => state.setIsExporting);
  const appendLog = useVideoStore((state) => state.appendLog);
  const setExportDuration = useVideoStore((state) => state.setExportDuration);
  const inputPath = useVideoStore((state) => state.inputPath);
  const setCropPathEnabled = useVideoStore((state) => state.setCropPathEnabled);
  const [view, setView] = useState<'edit' | 'path'>('edit');

  useEffect(() => {
    const handleLog = (message: string) => {
      appendLog(message);
    };
    const handleProgress = (timeText: string) => {
      const { exportDuration } = useVideoStore.getState();
      if (!exportDuration) {
        return;
      }
      const current = parseTime(timeText);
      if (!Number.isFinite(current)) {
        return;
      }
      const percent = (current / exportDuration) * 100;
      const safePercent = Math.min(100, Math.max(0, percent));
      setProgress(safePercent);
      setProgressLabel(`Exporting... ${Math.floor(safePercent)}%`);
    };
    const handleDone = () => {
      setExportDuration(0);
      setProgress(100);
      setProgressLabel('Export finished.');
      setIsExporting(false);
    };
    const handleError = (message: string) => {
      setExportDuration(0);
      setProgress(0);
      setProgressLabel(message);
      appendLog(`\n${message}\n`);
      setIsExporting(false);
    };

    window.electronAPI.onLog(handleLog);
    window.electronAPI.onProgress(handleProgress);
    window.electronAPI.onDone(handleDone);
    window.electronAPI.onError(handleError);
  }, [appendLog, setExportDuration, setIsExporting, setProgress, setProgressLabel]);

  useEffect(() => {
    if (!inputPath) {
      setView('edit');
    }
  }, [inputPath]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#151927] via-[#0f1117] to-[#1a1f2c] text-base-content">
      {inputPath ? (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
          <Hero />

          <main className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {view === 'edit' ? (
              <VideoPanel
                videoRef={videoRef}
                onOpenPath={() => {
                  setCropPathEnabled(true);
                  setView('path');
                }}
              />
            ) : (
              <TrackPanel
                videoRef={videoRef}
                onBack={() => {
                  setView('edit');
                }}
              />
            )}

            <section className="flex min-w-0 flex-col gap-5">
              <ExportPanel />
              <ProgressPanel />
            </section>
          </main>
        </div>
      ) : (
        <InitialScreen />
      )}
    </div>
  );
};

export default App;
