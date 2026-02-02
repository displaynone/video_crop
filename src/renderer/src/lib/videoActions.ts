import { formatTime, parseTime } from "./time";
import { useVideoStore } from "../store/useVideoStore";

const loadVideoFromPath = (path: string) => {
	if (!path) {
		return;
	}
	const {
		setInputPath,
		setOutputPath,
		clearLog,
		setProgress,
		setProgressLabel,
		setCropEnabled,
		setCropRect,
		setCropAspectEnabled,
		setCropPathEnabled,
		setCropPathStart,
		setCropPathEnd,
	} = useVideoStore.getState();
	setInputPath(path);
	setOutputPath(null);
	clearLog();
	setProgress(0);
	setProgressLabel("Waiting for export...");
	setCropEnabled(false);
	setCropRect(null);
	setCropAspectEnabled(false);
	setCropPathEnabled(false);
	setCropPathStart(null);
	setCropPathEnd(null);
};

const openVideo = async () => {
	const path = await window.electronAPI.openVideo();
	if (!path) {
		return;
	}
	loadVideoFromPath(path);
};

const chooseOutput = async () => {
	const { inputPath, setOutputPath } = useVideoStore.getState();
	let suggested = "crop.mp4";
	if (inputPath) {
		const name = inputPath.split("/").pop() || "crop.mp4";
		suggested = `crop_${name}`.replace(/\s+/g, "_");
	}
	const path = await window.electronAPI.saveVideo(suggested);
	if (!path) {
		return;
	}
	setOutputPath(path);
};

const startExport = () => {
	const {
		inputPath,
		outputPath,
		startTime,
		endTime,
		mode,
		cropEnabled,
		cropRect,
		cropPathEnabled,
		cropPathStart,
		cropPathEnd,
		setMode,
		setExportDuration,
		clearLog,
		setProgress,
		setProgressLabel,
		setIsExporting,
		setOutputPath,
	} = useVideoStore.getState();

	if (!inputPath) {
		setProgressLabel("Select a video first.");
		return;
	}
	if (!outputPath) {
		setProgressLabel("Select the export destination.");
		return;
	}

	const startSeconds = parseTime(startTime);
	const endSeconds = parseTime(endTime);
	if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
		setProgressLabel("Invalid range.");
		return;
	}
	if (endSeconds <= startSeconds) {
		setProgressLabel("End time must be greater than start time.");
		return;
	}

	const hasCrop =
		cropEnabled &&
		cropRect &&
		cropRect.width > 0 &&
		cropRect.height > 0;
	const effectivePathStart = cropPathStart ?? cropRect ?? null;
	const effectivePathEnd = cropPathEnd ?? cropRect ?? null;
	const hasPath =
		cropPathEnabled &&
		effectivePathStart &&
		effectivePathEnd &&
		effectivePathStart.width > 0 &&
		effectivePathStart.height > 0 &&
		effectivePathEnd.width > 0 &&
		effectivePathEnd.height > 0;
	const exportMode = (hasCrop || hasPath) && mode === "copy" ? "reencode" : mode;
	if (exportMode !== mode) {
		setMode(exportMode);
	}

	setExportDuration(endSeconds - startSeconds);
	clearLog();
	setProgress(0);
	setProgressLabel("Exporting...");
	setIsExporting(true);
	setOutputPath(null);

	window.electronAPI.runExport({
		inputPath,
		outputPath,
		startTime: startSeconds,
		endTime: endSeconds,
		mode: exportMode,
		crop: hasPath ? null : hasCrop ? cropRect : null,
		cropPath: hasPath ? { start: effectivePathStart, end: effectivePathEnd } : null,
	});
};

const cancelExport = () => {
	const { setProgress, setProgressLabel, setIsExporting, setExportDuration } =
		useVideoStore.getState();
	window.electronAPI.cancelExport();
	setExportDuration(0);
	setProgress(0);
	setProgressLabel("Export canceled.");
	setIsExporting(false);
};

const setStartToCurrent = () => {
	const { currentTime, setStartTime } = useVideoStore.getState();
	setStartTime(formatTime(currentTime));
};

const setEndToCurrent = () => {
	const { currentTime, setEndTime } = useVideoStore.getState();
	setEndTime(formatTime(currentTime));
};

const resetOutputPath = () => {
	const { setOutputPath } = useVideoStore.getState();

	setOutputPath(null);
};

export {
	loadVideoFromPath,
	openVideo,
	chooseOutput,
	startExport,
	cancelExport,
	setStartToCurrent,
	setEndToCurrent,
	resetOutputPath,
};
