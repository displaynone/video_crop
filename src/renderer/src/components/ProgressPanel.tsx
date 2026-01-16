import type { FC } from "react";
import { useVideoStore } from "../store/useVideoStore";
import { cancelExport } from "../lib/videoActions";

const ProgressPanel: FC = () => {
	const progress = useVideoStore((state) => state.progress);
	const label = useVideoStore((state) => state.progressLabel);
	const log = useVideoStore((state) => state.log);
	const isExporting = useVideoStore((state) => state.isExporting);

	return (
		<div className="card min-w-0 bg-transparent flex-1">
			<div className="card-body gap-4 max-w-full min-w-0 p-0">
				<div className="flex justify-between w-full">
					<h2 className="card-title text-lg">Progreso</h2>
					<button
						className="btn btn-outline"
						onClick={cancelExport}
						disabled={!isExporting}
					>
						Cancelar
					</button>
				</div>
				<progress
					className="progress progress-success w-full"
					value={progress}
					max={100}
				/>
				<p className="text-xs text-white/60 break-words">{label}</p>
				<pre className="max-h-36 w-full overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/70 text-wrap">
					{log || "Sin log por ahora."}
				</pre>
			</div>
		</div>
	);
};

export default ProgressPanel;
