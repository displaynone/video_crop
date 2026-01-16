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
	} = useVideoStore.getState();
	setInputPath(path);
	setOutputPath(null);
	clearLog();
	setProgress(0);
	setProgressLabel("Esperando exportacion...");
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
	let suggested = "recorte.mp4";
	if (inputPath) {
		const name = inputPath.split("/").pop() || "recorte.mp4";
		suggested = `recorte_${name}`.replace(/\s+/g, "_");
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
		setExportDuration,
		clearLog,
		setProgress,
		setProgressLabel,
		setIsExporting,
    setOutputPath,
	} = useVideoStore.getState();

	if (!inputPath) {
		setProgressLabel("Selecciona un video primero.");
		return;
	}
	if (!outputPath) {
		setProgressLabel("Selecciona el destino de exportacion.");
		return;
	}

	const startSeconds = parseTime(startTime);
	const endSeconds = parseTime(endTime);
	if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
		setProgressLabel("Rango invalido.");
		return;
	}
	if (endSeconds <= startSeconds) {
		setProgressLabel("El tiempo de fin debe ser mayor que el inicio.");
		return;
	}

	setExportDuration(endSeconds - startSeconds);
	clearLog();
	setProgress(0);
	setProgressLabel("Exportando...");
	setIsExporting(true);
	setOutputPath(null);

	window.electronAPI.runExport({
		inputPath,
		outputPath,
		startTime: startSeconds,
		endTime: endSeconds,
		mode,
	});
};

const cancelExport = () => {
	const { setProgress, setProgressLabel, setIsExporting, setExportDuration } =
		useVideoStore.getState();
	window.electronAPI.cancelExport();
	setExportDuration(0);
	setProgress(0);
	setProgressLabel("Exportacion cancelada.");
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
