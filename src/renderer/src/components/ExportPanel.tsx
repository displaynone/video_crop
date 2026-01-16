import type { FC } from 'react';
import { cancelExport, chooseOutput, startExport } from '../lib/videoActions';
import { useVideoStore } from '../store/useVideoStore';

const ExportPanel: FC = () => {
  const mode = useVideoStore((state) => state.mode);
  const outputPath = useVideoStore((state) => state.outputPath);
  const isExporting = useVideoStore((state) => state.isExporting);
  const setMode = useVideoStore((state) => state.setMode);

  return (
    <div className="card bg-transparent flex-1">
      <div className="card-body gap-4 p-0">
        <h2 className="card-title text-lg">Exportacion</h2>
        <div className="form-control">
          <label className="label">
            <span className="label-text text-white/70">Modo</span>
          </label>
          <select
            className="select select-bordered"
            value={mode}
            onChange={(event) => setMode(event.target.value as 'reencode' | 'copy')}
          >
            <option value="reencode">Reencode (mas preciso)</option>
            <option value="copy">Corte rapido (sin reencode)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
