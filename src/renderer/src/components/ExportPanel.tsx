import type { FC } from 'react';
import { useVideoStore } from '../store/useVideoStore';

const ExportPanel: FC = () => {
  const mode = useVideoStore((state) => state.mode);
  const setMode = useVideoStore((state) => state.setMode);

  return (
    <div className="card bg-transparent">
      <div className="card-body gap-4 p-0">
        <h2 className="card-title text-lg">Export</h2>
        <div className="form-control">
          <label className="label">
            <span className="label-text text-white/70">Mode</span>
          </label>
          <select
            className="select select-bordered"
            value={mode}
            onChange={(event) => setMode(event.target.value as 'reencode' | 'copy')}
          >
            <option value="reencode">Re-encode (more precise)</option>
            <option value="copy">Fast cut (no re-encode)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
