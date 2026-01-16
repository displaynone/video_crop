const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds)) {
    return '--:--:--';
  }
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
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
    const parts = raw.split(':').map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) {
      return Number.NaN;
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return Number.NaN;
  }
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
};

export { formatTime, parseTime };
