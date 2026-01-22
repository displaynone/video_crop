const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds)) {
    return '--:--:--.---';
  }
  const clamped = Math.max(0, seconds);
  let total = Math.floor(clamped);
  let milliseconds = Math.round((clamped - total) * 1_000);
  if (milliseconds >= 1_000) {
    total += 1;
    milliseconds = 0;
  }
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const time = [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
  return `${time}.${String(milliseconds).padStart(3, '0')}`;
};

const parseTime = (value: string): number => {
  if (!value) {
    return Number.NaN;
  }
  const raw = value.trim();
  if (!raw) {
    return Number.NaN;
  }
  if (raw.includes(':')) {
    const parts = raw.split(':');
    if (parts.length < 2 || parts.length > 3) {
      return Number.NaN;
    }
    const [head, middle, tail] = parts.length === 2 ? [null, parts[0], parts[1]] : parts;
    const hours = head === null ? 0 : Number(head);
    const minutes = Number(middle);
    const [secPart, microPart] = String(tail).split('.');
    const seconds = Number(secPart);
    if ([hours, minutes, seconds].some((part) => Number.isNaN(part))) {
      return Number.NaN;
    }
    const millis = microPart ? Number(microPart.padEnd(3, '0').slice(0, 3)) : 0;
    if (Number.isNaN(millis)) {
      return Number.NaN;
    }
    return hours * 3600 + minutes * 60 + seconds + millis / 1_000;
  }
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
};

export { formatTime, parseTime };
