import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { formatTime } from "./time";
import { useVideoStore } from "../store/useVideoStore";

type VideoSize = { width: number; height: number };

type VideoSetupOptions = {
	onVideoSize?: (size: VideoSize) => void;
	onIsPlaying?: (value: boolean) => void;
	resetRange?: boolean;
};

const useVideoSetup = (
	videoRef: RefObject<HTMLVideoElement | null>,
	options: VideoSetupOptions = {},
) => {
	const { onVideoSize, onIsPlaying, resetRange = true } = options;
	const resetRangeRef = useRef(false);
	const lastInputPathRef = useRef<string | null>(null);
	const inputPath = useVideoStore((state) => state.inputPath);
	const setDuration = useVideoStore((state) => state.setDuration);
	const setStartTime = useVideoStore((state) => state.setStartTime);
	const setEndTime = useVideoStore((state) => state.setEndTime);
	const setCurrentTime = useVideoStore((state) => state.setCurrentTime);

	useEffect(() => {
		if (resetRange && inputPath && inputPath !== lastInputPathRef.current) {
			resetRangeRef.current = true;
			lastInputPathRef.current = inputPath;
		}
	}, [inputPath, resetRange]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}

		const handleLoaded = () => {
			setDuration(video.duration || 0);
			if (resetRange && resetRangeRef.current) {
				setStartTime("00:00:00");
				setEndTime(formatTime(video.duration || 0));
				resetRangeRef.current = false;
			}
			onVideoSize?.({
				width: video.videoWidth || 0,
				height: video.videoHeight || 0,
			});
		};
		const handleTime = () => {
			setCurrentTime(video.currentTime || 0);
		};
		const handlePlaying = () => onIsPlaying?.(true);
		const handlePaused = () => onIsPlaying?.(false);

		video.addEventListener("loadedmetadata", handleLoaded);
		video.addEventListener("timeupdate", handleTime);
		video.addEventListener("play", handlePlaying);
		video.addEventListener("pause", handlePaused);
		video.addEventListener("ended", handlePaused);

		return () => {
			video.removeEventListener("loadedmetadata", handleLoaded);
			video.removeEventListener("timeupdate", handleTime);
			video.removeEventListener("play", handlePlaying);
			video.removeEventListener("pause", handlePaused);
			video.removeEventListener("ended", handlePaused);
		};
	}, [
		onIsPlaying,
		onVideoSize,
		resetRange,
		setCurrentTime,
		setDuration,
		setEndTime,
		setStartTime,
		videoRef,
	]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !inputPath) {
			return;
		}
		video.src = `media://${encodeURI(inputPath)}`;
	}, [inputPath, videoRef]);
};

export { useVideoSetup };
