import type { ChangeEvent, FC, MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	CaretDoubleLeftIcon,
	CaretDoubleRightIcon,
	CropIcon,
	HandSwipeLeftIcon,
	HandSwipeRightIcon,
	PauseIcon,
	PlayIcon,
	RewindIcon,
	FastForwardIcon,
} from "@phosphor-icons/react";
import { Range, getTrackBackground } from "react-range";
import { Rnd } from "react-rnd";
import { setEndToCurrent, setStartToCurrent } from "../lib/videoActions";
import { formatTime, parseTime } from "../lib/time";
import { useVideoStore } from "../store/useVideoStore";

interface VideoPanelProps {
	videoRef: React.RefObject<HTMLVideoElement | null>;
}

const VideoPanel: FC<VideoPanelProps> = ({ videoRef }) => {
	const inputPath = useVideoStore((state) => state.inputPath);
	const startTime = useVideoStore((state) => state.startTime);
	const endTime = useVideoStore((state) => state.endTime);
	const duration = useVideoStore((state) => state.duration);
	const currentTime = useVideoStore((state) => state.currentTime);
	const cropEnabled = useVideoStore((state) => state.cropEnabled);
	const cropRect = useVideoStore((state) => state.cropRect);
	const cropAspectEnabled = useVideoStore((state) => state.cropAspectEnabled);
	const cropAspectRatio = useVideoStore((state) => state.cropAspectRatio);
	const setStartTime = useVideoStore((state) => state.setStartTime);
	const setEndTime = useVideoStore((state) => state.setEndTime);
	const setDuration = useVideoStore((state) => state.setDuration);
	const setCurrentTime = useVideoStore((state) => state.setCurrentTime);
	const setCropEnabled = useVideoStore((state) => state.setCropEnabled);
	const setCropRect = useVideoStore((state) => state.setCropRect);
	const setCropAspectEnabled = useVideoStore((state) => state.setCropAspectEnabled);
	const setCropAspectRatio = useVideoStore((state) => state.setCropAspectRatio);

	const videoContainerRef = useRef<HTMLDivElement | null>(null);
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);
	const [isSelecting, setIsSelecting] = useState(false);
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
	const [isPlaying, setIsPlaying] = useState(false);

	const frameStep = 1 / 30;
	const startSeconds = Number.isFinite(parseTime(startTime)) ? parseTime(startTime) : 0;
	const endSeconds = Number.isFinite(parseTime(endTime)) ? parseTime(endTime) : 0;
	const safeDuration = Math.max(0, duration || 0);
	const clampedStartSeconds = Math.min(Math.max(0, startSeconds), safeDuration);
	const clampedEndSeconds = Math.min(Math.max(0, endSeconds), safeDuration);
	const rangeValues = [
		Math.min(clampedStartSeconds, clampedEndSeconds),
		Math.max(clampedStartSeconds, clampedEndSeconds),
	];
	const rangeMax = safeDuration > 0 ? safeDuration : 1;
	const rangeDisabled = safeDuration <= 0;

	const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
	const aspectRatio =
		cropAspectEnabled && cropAspectRatio.width > 0 && cropAspectRatio.height > 0
			? cropAspectRatio.width / cropAspectRatio.height
			: null;
	const containerAspectRatio =
		containerSize.width > 0 && containerSize.height > 0
			? containerSize.width / containerSize.height
			: null;
	const normalizedAspectRatio =
		aspectRatio && containerAspectRatio ? aspectRatio / containerAspectRatio : null;

	const applyAspectRatio = useCallback(
		(rect: { x: number; y: number; width: number; height: number }) => {
			if (!normalizedAspectRatio || rect.width === 0 || rect.height === 0) {
				return rect;
			}
			let width = rect.width;
			let height = width / normalizedAspectRatio;
			if (rect.y + height > 1) {
				height = 1 - rect.y;
				width = height * normalizedAspectRatio;
			}
			if (rect.x + width > 1) {
				width = 1 - rect.x;
				height = width / normalizedAspectRatio;
			}
			return { ...rect, width, height };
		},
		[normalizedAspectRatio],
	);

	const getRelativePoint = (event: MouseEvent<HTMLDivElement>) => {
		const bounds = videoContainerRef.current?.getBoundingClientRect();
		if (!bounds) {
			return null;
		}
		return {
			x: clamp01((event.clientX - bounds.left) / bounds.width),
			y: clamp01((event.clientY - bounds.top) / bounds.height),
		};
	};

	const handleCropStart = (event: MouseEvent<HTMLDivElement>) => {
		if (!cropEnabled) {
			return;
		}
		const point = getRelativePoint(event);
		if (!point) {
			return;
		}
		dragStartRef.current = point;
		setIsSelecting(true);
		setCropRect({ x: point.x, y: point.y, width: 0, height: 0 });
	};

	const handleCropMove = (event: MouseEvent<HTMLDivElement>) => {
		if (!cropEnabled || !isSelecting || !dragStartRef.current) {
			return;
		}
		const point = getRelativePoint(event);
		if (!point) {
			return;
		}
		const start = dragStartRef.current;
		const dx = point.x - start.x;
		const dy = point.y - start.y;
		const maxWidth = dx >= 0 ? 1 - start.x : start.x;
		const maxHeight = dy >= 0 ? 1 - start.y : start.y;
		let width = Math.min(Math.abs(dx), maxWidth);
		let height = Math.min(Math.abs(dy), maxHeight);

		if (normalizedAspectRatio) {
			if (width / Math.max(height, 0.0001) > normalizedAspectRatio) {
				width = Math.min(width, maxWidth);
				height = width / normalizedAspectRatio;
				if (height > maxHeight) {
					height = maxHeight;
					width = height * normalizedAspectRatio;
				}
			} else {
				height = Math.min(height, maxHeight);
				width = height * normalizedAspectRatio;
				if (width > maxWidth) {
					width = maxWidth;
					height = width / normalizedAspectRatio;
				}
			}
		}

		const x = dx >= 0 ? start.x : start.x - width;
		const y = dy >= 0 ? start.y : start.y - height;
		setCropRect({ x, y, width, height });
	};

	const handleCropEnd = () => {
		if (!cropEnabled) {
			return;
		}
		setIsSelecting(false);
		dragStartRef.current = null;
	};

	useEffect(() => {
		const container = videoContainerRef.current;
		if (!container) {
			return;
		}
		const updateSize = () => {
			setContainerSize({
				width: container.clientWidth,
				height: container.clientHeight,
			});
		};
		updateSize();
		const observer = new ResizeObserver(() => updateSize());
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!cropEnabled || !cropRect || !normalizedAspectRatio) {
			return;
		}
		const adjusted = applyAspectRatio(cropRect);
		if (
			Math.abs(adjusted.width - cropRect.width) > 0.0001 ||
			Math.abs(adjusted.height - cropRect.height) > 0.0001
		) {
			setCropRect(adjusted);
		}
	}, [applyAspectRatio, cropEnabled, cropRect, normalizedAspectRatio, setCropRect]);

	const cropPixelRect =
		cropRect && containerSize.width > 0 && containerSize.height > 0
			? {
					x: cropRect.x * containerSize.width,
					y: cropRect.y * containerSize.height,
					width: cropRect.width * containerSize.width,
					height: cropRect.height * containerSize.height,
				}
			: null;

	const updateCropFromPixels = (next: { x: number; y: number; width: number; height: number }) => {
		if (containerSize.width <= 0 || containerSize.height <= 0) {
			return;
		}
		const normalized = {
			x: clamp01(next.x / containerSize.width),
			y: clamp01(next.y / containerSize.height),
			width: clamp01(next.width / containerSize.width),
			height: clamp01(next.height / containerSize.height),
		};
		setCropRect(normalizedAspectRatio ? applyAspectRatio(normalized) : normalized);
	};

	useEffect(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		const handleLoaded = () => {
			setDuration(video.duration || 0);
			setStartTime("00:00:00");
			setEndTime(formatTime(video.duration || 0));
		};
		const handleTime = () => {
			setCurrentTime(video.currentTime || 0);
		};
		const handlePlaying = () => setIsPlaying(true);
		const handlePaused = () => setIsPlaying(false);
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
	}, [setCurrentTime, setDuration, setEndTime, setStartTime, videoRef]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !inputPath) {
			return;
		}
		video.src = `media://${encodeURI(inputPath)}`;
	}, [inputPath, videoRef]);

	const handleStepFrame = (direction: "back" | "forward") => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		const nextTime =
			direction === "back"
				? Math.max(0, video.currentTime - frameStep)
				: Math.min(duration || video.duration || Infinity, video.currentTime + frameStep);
		video.currentTime = nextTime;
	};

	const handleJumpSeconds = (seconds: number) => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		const maxTime =
			Number.isFinite(duration) && duration > 0 ? duration : video.duration || Infinity;
		const nextTime = Math.min(maxTime, Math.max(0, video.currentTime + seconds));
		video.currentTime = nextTime;
	};

	const handleTogglePlayback = () => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		if (video.paused) {
			void video.play();
		} else {
			video.pause();
		}
	};

	const handleRangeChange = (values: number[]) => {
		const [nextStart, nextEnd] = values;
		setStartTime(formatTime(nextStart));
		setEndTime(formatTime(nextEnd));
	};

	const handleAspectRatioChange =
		(field: "width" | "height") => (event: ChangeEvent<HTMLInputElement>) => {
			const nextValue = Number(event.target.value);
			if (!Number.isFinite(nextValue) || nextValue <= 0) {
				return;
			}
			setCropAspectRatio({
				...cropAspectRatio,
				[field]: nextValue,
			});
		};

	return (
		<section className="flex flex-col gap-4 rounded-3xl">
			<div ref={videoContainerRef} className="relative overflow-hidden">
				<video
					ref={videoRef}
					className="aspect-video w-full rounded-2xl bg-black/40"
					controls={!cropEnabled}
				/>
				{cropEnabled && (!cropRect || isSelecting) && (
					<div
						className="absolute inset-0 cursor-crosshair"
						onMouseDown={handleCropStart}
						onMouseMove={handleCropMove}
						onMouseUp={handleCropEnd}
						onMouseLeave={handleCropEnd}
					>
						{cropRect && cropRect.width > 0 && cropRect.height > 0 && (
							<div
								className="absolute rounded-md border-2 border-[#f5c84c] bg-[#f5c84c]/10"
								style={{
									left: `${cropRect.x * 100}%`,
									top: `${cropRect.y * 100}%`,
									width: `${cropRect.width * 100}%`,
									height: `${cropRect.height * 100}%`,
									boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
								}}
							/>
						)}
					</div>
				)}
				{cropEnabled && !isSelecting && cropPixelRect && cropPixelRect.width > 0 && (
					<>
						<div className="pointer-events-none absolute inset-0 bg-black/40" />
						<Rnd
							bounds="parent"
							size={{
								width: cropPixelRect.width,
								height: cropPixelRect.height,
							}}
							position={{ x: cropPixelRect.x, y: cropPixelRect.y }}
							minWidth={20}
							minHeight={20}
							lockAspectRatio={aspectRatio || false}
							onDragStop={(_, data) =>
								updateCropFromPixels({
									x: data.x,
									y: data.y,
									width: cropPixelRect.width,
									height: cropPixelRect.height,
								})
							}
							onResizeStop={(_, __, ref, ___, position) =>
								updateCropFromPixels({
									x: position.x,
									y: position.y,
									width: ref.offsetWidth,
									height: ref.offsetHeight,
								})
							}
							className="border-2 border-[#f5c84c] bg-[#f5c84c]/10"
							style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
						/>
					</>
				)}
			</div>
			<div className="flex items-start justify-between text-xs text-white/60">
				<span>{formatTime(currentTime)}</span>
				<div className="flex flex-wrap items-center justify-center gap-3 text-xs text-white/70">
					<button className="btn btn-sm " onClick={setStartToCurrent}>
						<HandSwipeLeftIcon size={16} />
					</button>
					<button
						className="btn btn-sm "
						onClick={() => handleStepFrame("forward")}
						aria-label="Next frame"
						title="Next frame"
					>
						<CaretDoubleRightIcon size={18} />
					</button>
					<button
						className="btn btn-sm "
						onClick={() => handleJumpSeconds(-5)}
						aria-label="Back 5 seconds"
						title="Back 5 seconds"
					>
						<RewindIcon size={18} />
					</button>
					<button
						className="btn btn-sm "
						onClick={handleTogglePlayback}
						aria-label={isPlaying ? "Pause video" : "Play video"}
						title={isPlaying ? "Pause video" : "Play video"}
					>
						{isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
					</button>
					<button
						className="btn btn-sm "
						onClick={() => handleJumpSeconds(5)}
						aria-label="Forward 5 seconds"
						title="Forward 5 seconds"
					>
						<FastForwardIcon size={18} />
					</button>
					<button
						className="btn btn-sm "
						onClick={() => handleStepFrame("back")}
						aria-label="Previous frame"
						title="Previous frame"
					>
						<CaretDoubleLeftIcon size={18} />
					</button>
					<button className="btn btn-sm" onClick={setEndToCurrent}>
						<HandSwipeRightIcon size={16} />
					</button>
				</div>
				<span>{formatTime(duration)}</span>
			</div>
			<Range
				values={rangeValues}
				step={0.1}
				min={0}
				max={rangeMax}
				onChange={handleRangeChange}
				disabled={rangeDisabled}
				renderTrack={({ props, children }) => (
					<div
						{...props}
						className="relative h-4 w-full rounded-full"
						style={{
							...props.style,
							background: getTrackBackground({
								values: rangeValues,
								colors: ["rgba(255,255,255,0.2)", "rgba(245,200,76,0.9)", "rgba(255,255,255,0.2)"],
								min: 0,
								max: rangeMax,
							}),
						}}
					>
						{children}
					</div>
				)}
				renderThumb={({ props, index }) => (
					<div
						{...props}
						aria-label={index === 0 ? "Start" : "End"}
						className="h-6 w-2 border border-white/60 bg-white"
						style={props.style}
					/>
				)}
			/>

			<div className="">
				<div className="gap-4 p-0 flex">
					<div className="form-control gap-2 flex-row flex">
						<label className="label">
							<span className="label-text text-white/70">From</span>
						</label>
						<div className="flex gap-2">
							<input
								className="input input-bordered w-full"
								value={startTime}
								onChange={(event) => setStartTime(event.target.value)}
								placeholder="00:00:00"
							/>
						</div>
					</div>
					<div className="form-control gap-2 flex-row flex">
						<label className="label">
							<span className="label-text text-white/70">To</span>
						</label>
						<div className="flex gap-2">
							<input
								className="input input-bordered w-full"
								value={endTime}
								onChange={(event) => setEndTime(event.target.value)}
								placeholder="00:00:00"
							/>
						</div>
					</div>
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<span className="text-xs text-white/60">Crop</span>
				<div className="flex flex-wrap gap-2">
					<button
						className={`btn btn-sm ${cropEnabled ? "btn-warning" : "btn-outline"}`}
						onClick={() => setCropEnabled(!cropEnabled)}
					>
						<CropIcon size={24} /> {cropEnabled ? "Finish crop" : "Select crop"}
					</button>
					<button
						className="btn btn-sm btn-ghost"
						onClick={() => setCropRect(null)}
						disabled={!cropRect}
					>
						Clear crop
					</button>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						className={`btn btn-sm ${cropAspectEnabled ? "btn-warning" : "btn-outline"}`}
						onClick={() => setCropAspectEnabled(!cropAspectEnabled)}
					>
						{cropAspectEnabled ? "Fixed ratio" : "Force ratio"}
					</button>
					<div className="flex items-center gap-2">
						<input
							type="number"
							min={1}
							className="input input-bordered input-sm w-20"
							value={cropAspectRatio.width}
							onChange={handleAspectRatioChange("width")}
							disabled={!cropAspectEnabled}
						/>
						<span className="text-xs text-white/60">/</span>
						<input
							type="number"
							min={1}
							className="input input-bordered input-sm w-20"
							value={cropAspectRatio.height}
							onChange={handleAspectRatioChange("height")}
							disabled={!cropAspectEnabled}
						/>
					</div>
					<div className="flex gap-2">
						<button
							className="btn btn-sm btn-ghost"
							onClick={() => setCropAspectRatio({ width: 1, height: 1 })}
							disabled={!cropAspectEnabled}
						>
							1:1
						</button>
						<button
							className="btn btn-sm btn-ghost"
							onClick={() => setCropAspectRatio({ width: 16, height: 9 })}
							disabled={!cropAspectEnabled}
						>
							16:9
						</button>
						<button
							className="btn btn-sm btn-ghost"
							onClick={() => setCropAspectRatio({ width: 9, height: 16 })}
							disabled={!cropAspectEnabled}
						>
							9:16
						</button>
					</div>
				</div>
				<p className="text-xs text-white/50">Drag over the video to define the area to export.</p>
			</div>
		</section>
	);
};

export default VideoPanel;
