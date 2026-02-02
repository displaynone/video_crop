import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import type { FC, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { formatTime, parseTime } from "../lib/time";
import { useVideoSetup } from "../lib/useVideoSetup";
import { useVideoStore } from "../store/useVideoStore";

interface TrackPanelProps {
	videoRef: React.RefObject<HTMLVideoElement | null>;
	onBack: () => void;
}

type CropRect = { x: number; y: number; width: number; height: number };

const TrackPanel: FC<TrackPanelProps> = ({ videoRef, onBack }) => {
	const startTime = useVideoStore((state) => state.startTime);
	const endTime = useVideoStore((state) => state.endTime);
	const duration = useVideoStore((state) => state.duration);
	const currentTime = useVideoStore((state) => state.currentTime);
	const cropRect = useVideoStore((state) => state.cropRect);
	const cropAspectEnabled = useVideoStore((state) => state.cropAspectEnabled);
	const cropAspectRatio = useVideoStore((state) => state.cropAspectRatio);
	const cropPathEnabled = useVideoStore((state) => state.cropPathEnabled);
	const cropPathStart = useVideoStore((state) => state.cropPathStart);
	const cropPathEnd = useVideoStore((state) => state.cropPathEnd);
	const setCropPathEnabled = useVideoStore((state) => state.setCropPathEnabled);
	const setCropPathStart = useVideoStore((state) => state.setCropPathStart);
	const setCropPathEnd = useVideoStore((state) => state.setCropPathEnd);

	const videoContainerRef = useRef<HTMLDivElement | null>(null);
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);
	const [isSelecting, setIsSelecting] = useState(false);
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
	const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
	const [isPlaying, setIsPlaying] = useState(false);
	const [activePoint, setActivePoint] = useState<"start" | "end">("start");

	const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
	const aspectRatio =
		cropAspectEnabled && cropAspectRatio.width > 0 && cropAspectRatio.height > 0
			? cropAspectRatio.width / cropAspectRatio.height
			: null;
	const videoAspectRatio =
		videoSize.width > 0 && videoSize.height > 0 ? videoSize.width / videoSize.height : null;
	const containerAspectRatio =
		containerSize.width > 0 && containerSize.height > 0
			? containerSize.width / containerSize.height
			: null;
	const baseAspectRatio = videoAspectRatio || containerAspectRatio;
	const normalizedAspectRatio =
		aspectRatio && baseAspectRatio ? aspectRatio / baseAspectRatio : null;

	const activeRect = activePoint === "start" ? cropPathStart : cropPathEnd;
	const setActiveRect = activePoint === "start" ? setCropPathStart : setCropPathEnd;

	useEffect(() => {
		if (!cropPathStart && cropRect) {
			setCropPathStart(cropRect);
		}
		if (!cropPathEnd && cropRect) {
			setCropPathEnd(cropRect);
		}
	}, [cropPathEnd, cropPathStart, cropRect, setCropPathEnd, setCropPathStart]);

	useEffect(() => {
		if (!cropPathEnabled && (cropPathStart || cropPathEnd)) {
			setCropPathEnabled(true);
		}
	}, [cropPathEnabled, cropPathEnd, cropPathStart, setCropPathEnabled]);

	useVideoSetup(videoRef, {
		onVideoSize: setVideoSize,
		onIsPlaying: setIsPlaying,
		resetRange: false,
	});

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

	const applyAspectRatio = useCallback(
		(rect: CropRect) => {
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
		if (isPlaying) {
			return;
		}
		if (!cropPathEnabled) {
			setCropPathEnabled(true);
		}
		const point = getRelativePoint(event);
		if (!point) {
			return;
		}
		dragStartRef.current = point;
		setIsSelecting(true);
		setActiveRect({ x: point.x, y: point.y, width: 0, height: 0 });
	};

	const handleCropMove = (event: MouseEvent<HTMLDivElement>) => {
		if (isPlaying || !isSelecting || !dragStartRef.current) {
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
		setActiveRect({ x, y, width, height });
	};

	const handleCropEnd = () => {
		if (isPlaying) {
			return;
		}
		setIsSelecting(false);
		dragStartRef.current = null;
	};

	useEffect(() => {
		if (!activeRect || !normalizedAspectRatio) {
			return;
		}
		const adjusted = applyAspectRatio(activeRect);
		if (
			Math.abs(adjusted.width - activeRect.width) > 0.0001 ||
			Math.abs(adjusted.height - activeRect.height) > 0.0001
		) {
			setActiveRect(adjusted);
		}
	}, [activeRect, applyAspectRatio, normalizedAspectRatio, setActiveRect]);

	const toPixelRect = (rect: CropRect | null) =>
		rect && containerSize.width > 0 && containerSize.height > 0
			? {
				x: rect.x * containerSize.width,
				y: rect.y * containerSize.height,
				width: rect.width * containerSize.width,
				height: rect.height * containerSize.height,
			}
			: null;

	const updateCropFromPixels = (next: CropRect) => {
		if (containerSize.width <= 0 || containerSize.height <= 0) {
			return;
		}
		const normalized = {
			x: clamp01(next.x / containerSize.width),
			y: clamp01(next.y / containerSize.height),
			width: clamp01(next.width / containerSize.width),
			height: clamp01(next.height / containerSize.height),
		};
		setActiveRect(normalizedAspectRatio ? applyAspectRatio(normalized) : normalized);
	};

	const startSeconds = Number.isFinite(parseTime(startTime)) ? parseTime(startTime) : 0;
	const endSeconds = Number.isFinite(parseTime(endTime)) ? parseTime(endTime) : 0;
	const pathDuration = Math.max(0, endSeconds - startSeconds);
	const progress = pathDuration > 0 ? clamp01((currentTime - startSeconds) / pathDuration) : 0;
	const resolvedStart = cropPathStart ?? cropRect ?? null;
	const resolvedEnd = cropPathEnd ?? cropPathStart ?? cropRect ?? null;

	const previewRect = useMemo(() => {
		if (isPlaying && resolvedStart && resolvedEnd) {
			return {
				x: resolvedStart.x + (resolvedEnd.x - resolvedStart.x) * progress,
				y: resolvedStart.y + (resolvedEnd.y - resolvedStart.y) * progress,
				width: resolvedStart.width + (resolvedEnd.width - resolvedStart.width) * progress,
				height: resolvedStart.height + (resolvedEnd.height - resolvedStart.height) * progress,
			};
		}
		return activeRect ?? resolvedStart ?? resolvedEnd;
	}, [activeRect, isPlaying, progress, resolvedEnd, resolvedStart]);

	const previewPixelRect = toPixelRect(previewRect);
	const activePixelRect = toPixelRect(activeRect);

	const handleTogglePlayback = () => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		if (video.paused) {
			if (Number.isFinite(startSeconds) && Number.isFinite(endSeconds)) {
				if (video.currentTime < startSeconds || video.currentTime > endSeconds) {
					video.currentTime = startSeconds;
				}
			}
			void video.play();
		} else {
			video.pause();
		}
	};

	useEffect(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		if (Number.isFinite(startSeconds) && Number.isFinite(endSeconds)) {
			if (video.currentTime < startSeconds || video.currentTime > endSeconds) {
				video.currentTime = startSeconds;
			}
		}
	}, [endSeconds, startSeconds, videoRef]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
			return;
		}
		if (video.currentTime > endSeconds) {
			video.pause();
			video.currentTime = endSeconds;
		}
		if (video.currentTime < startSeconds) {
			video.currentTime = startSeconds;
		}
	}, [currentTime, endSeconds, startSeconds, videoRef]);

	return (
		<section className="flex flex-col gap-4 rounded-3xl">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-col">
					<h2 className="text-lg font-semibold text-white">Path tracking</h2>
					<span className="text-xs text-white/60">
						Define start/end crop positions, then play to preview the motion.
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button className="btn btn-sm btn-ghost" onClick={onBack}>
						Back
					</button>
					<button
						className={`btn btn-sm ${cropPathEnabled ? "btn-warning" : "btn-outline"}`}
						onClick={() => setCropPathEnabled(!cropPathEnabled)}
					>
						{cropPathEnabled ? "Path enabled" : "Enable path"}
					</button>
				</div>
			</header>
			<div ref={videoContainerRef} className="relative overflow-hidden rounded-2xl">
				<video
					ref={videoRef}
					className="w-full rounded-2xl bg-black/40 object-contain"
					style={{
						aspectRatio:
							videoSize.width > 0 && videoSize.height > 0
								? `${videoSize.width} / ${videoSize.height}`
								: "16 / 9",
					}}
					controls={false}
				/>
				{previewPixelRect && (
					<div className="pointer-events-none absolute inset-0">
						<div
							className="absolute rounded-md border-2 border-[#f5c84c] bg-[#f5c84c]/10"
							style={{
								left: previewPixelRect.x,
								top: previewPixelRect.y,
								width: previewPixelRect.width,
								height: previewPixelRect.height,
								boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
							}}
						/>
					</div>
				)}
				{!isPlaying && (!activeRect || isSelecting) && (
					<div
						className="absolute inset-0 cursor-crosshair"
						onMouseDown={handleCropStart}
						onMouseMove={handleCropMove}
						onMouseUp={handleCropEnd}
						onMouseLeave={handleCropEnd}
					>
						{activeRect && activeRect.width > 0 && activeRect.height > 0 && (
							<div
								className="absolute rounded-md border-2 border-[#f5c84c] bg-[#f5c84c]/10"
								style={{
									left: `${activeRect.x * 100}%`,
									top: `${activeRect.y * 100}%`,
									width: `${activeRect.width * 100}%`,
									height: `${activeRect.height * 100}%`,
								}}
							/>
						)}
					</div>
				)}
				{!isPlaying && !isSelecting && activePixelRect && activePixelRect.width > 0 && (
					<Rnd
						bounds="parent"
						size={{
							width: activePixelRect.width,
							height: activePixelRect.height,
						}}
						position={{ x: activePixelRect.x, y: activePixelRect.y }}
						minWidth={20}
						minHeight={20}
						lockAspectRatio={aspectRatio || false}
						onDragStop={(_, data) =>
							updateCropFromPixels({
								x: data.x,
								y: data.y,
								width: activePixelRect.width,
								height: activePixelRect.height,
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
					/>
				)}
			</div>
			<div className="flex items-center justify-between text-xs text-white/60">
				<span>{formatTime(currentTime)}</span>
				<div className="flex items-center gap-3">
					<button
						className="btn btn-sm"
						onClick={handleTogglePlayback}
						aria-label={isPlaying ? "Pause video" : "Play video"}
						title={isPlaying ? "Pause video" : "Play video"}
					>
						{isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
					</button>
					<button
						className={`btn btn-sm ${activePoint === "start" ? "btn-warning" : "btn-outline"}`}
						onClick={() => setActivePoint("start")}
						disabled={isPlaying}
					>
						Start
					</button>
					<button
						className={`btn btn-sm ${activePoint === "end" ? "btn-warning" : "btn-outline"}`}
						onClick={() => setActivePoint("end")}
						disabled={isPlaying}
					>
						End
					</button>
				</div>
				<span>{formatTime(duration)}</span>
			</div>
		</section>
	);
};

export default TrackPanel;
