import type { FC } from "react";
import { useEffect } from "react";
import {
	CaretDoubleLeftIcon,
	CaretDoubleRightIcon,
	HandSwipeLeftIcon,
	HandSwipeRightIcon,
} from "@phosphor-icons/react";
import { Range, getTrackBackground } from "react-range";
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
	const setStartTime = useVideoStore((state) => state.setStartTime);
	const setEndTime = useVideoStore((state) => state.setEndTime);
	const setDuration = useVideoStore((state) => state.setDuration);
	const setCurrentTime = useVideoStore((state) => state.setCurrentTime);

	const frameStep = 1 / 30;
	const startSeconds = Number.isFinite(parseTime(startTime))
		? parseTime(startTime)
		: 0;
	const endSeconds = Number.isFinite(parseTime(endTime))
		? parseTime(endTime)
		: 0;
	const safeDuration = Math.max(0, duration || 0);
	const clampedStartSeconds = Math.min(Math.max(0, startSeconds), safeDuration);
	const clampedEndSeconds = Math.min(Math.max(0, endSeconds), safeDuration);
	const rangeValues = [
		Math.min(clampedStartSeconds, clampedEndSeconds),
		Math.max(clampedStartSeconds, clampedEndSeconds),
	];
	const rangeMax = safeDuration > 0 ? safeDuration : 1;
	const rangeDisabled = safeDuration <= 0;

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
		video.addEventListener("loadedmetadata", handleLoaded);
		video.addEventListener("timeupdate", handleTime);

		return () => {
			video.removeEventListener("loadedmetadata", handleLoaded);
			video.removeEventListener("timeupdate", handleTime);
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
				: Math.min(
						duration || video.duration || Infinity,
						video.currentTime + frameStep
				  );
		video.currentTime = nextTime;
	};

	const handleRangeChange = (values: number[]) => {
		const [nextStart, nextEnd] = values;
		setStartTime(formatTime(nextStart));
		setEndTime(formatTime(nextEnd));
	};

	return (
		<section className="flex flex-col gap-4 rounded-3xl">
			<video
				ref={videoRef}
				className="aspect-video w-full rounded-2xl bg-black/40"
				controls
			/>
			<div className="flex items-start justify-between text-xs text-white/60">
				<span>{formatTime(currentTime)}</span>
				<div className="flex flex-wrap items-center justify-center gap-3 text-xs text-white/70">
					<button className="btn btn-sm " onClick={setStartToCurrent}>
						<HandSwipeLeftIcon size={16} />
					</button>
					<button
						className="btn btn-sm "
						onClick={() => handleStepFrame("back")}
						aria-label="Frame anterior"
						title="Frame anterior"
					>
						<CaretDoubleLeftIcon size={18} />
					</button>
					<button
						className="btn btn-sm "
						onClick={() => handleStepFrame("forward")}
						aria-label="Frame siguiente"
						title="Frame siguiente"
					>
						<CaretDoubleRightIcon size={18} />
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
								colors: [
									"rgba(255,255,255,0.2)",
									"rgba(245,200,76,0.9)",
									"rgba(255,255,255,0.2)",
								],
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
						aria-label={index === 0 ? "Inicio" : "Fin"}
						className="h-6 w-2 border border-white/60 bg-white"
						style={props.style}
					/>
				)}
			/>

			<div className="">
				<div className="gap-4 p-0 flex">
					<div className="form-control gap-2 flex-1 flex-row flex">
						<label className="label">
							<span className="label-text text-white/70">Desde</span>
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
					<div className="form-control gap-2 flex-1 flex-row flex">
						<label className="label">
							<span className="label-text text-white/70">Hasta</span>
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
		</section>
	);
};

export default VideoPanel;
