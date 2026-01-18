import { useEffect, type FC } from "react";
import { ExportIcon, FolderOpenIcon, VideoIcon } from "@phosphor-icons/react";
import { chooseOutput, openVideo, startExport } from "../lib/videoActions";
import { useVideoStore } from "../store/useVideoStore";

const Hero: FC = () => {
	const isExporting = useVideoStore((state) => state.isExporting);
	const outputPath = useVideoStore((state) => state.outputPath);

	useEffect(() => {
		if (outputPath) {
			startExport();
		}
	}, [outputPath]);

	return (
		<header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl">
			<div className="flex items-center gap-3">
				<div className="flex h-12 w-12 items-center justify-center rounded-2xl text-amber-200">
					<VideoIcon size={42} />
				</div>
				<div className="flex flex-col">
					<span className="text-xs uppercase tracking-[0.35em] text-white/60">Video Crop</span>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<button
					className="btn btn-outline"
					onClick={() => {
						openVideo().catch(() => {});
					}}
				>
					<FolderOpenIcon size={24} /> Load video
				</button>
				<button
					className="btn btn-primary"
					onClick={() => {
						chooseOutput().catch(() => {});
					}}
					disabled={isExporting}
				>
					<ExportIcon size={24} /> Export
				</button>
			</div>
		</header>
	);
};

export default Hero;
