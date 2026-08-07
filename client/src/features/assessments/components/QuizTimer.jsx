import { Clock } from "lucide-react";

const SIZE = 44;
const STROKE = 3.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function colorFor(remaining, total) {
  if (!total || remaining == null) return "text-neutral-700";
  const pct = remaining / total;
  if (pct > 0.5) return "text-indigo-600";
  if (pct > 0.25) return "text-amber-600";
  return "text-rose-600";
}

function trackColor(remaining, total) {
  if (!total || remaining == null) return "stroke-neutral-300";
  const pct = remaining / total;
  if (pct > 0.5) return "stroke-indigo-600";
  if (pct > 0.25) return "stroke-amber-500";
  return "stroke-rose-600";
}

export default function QuizTimer({ remaining, total }) {
  const safe = Number(remaining) || 0;
  const totalSec = Number(total) || 0;
  const display = Math.max(0, safe);
  const minutes = Math.floor(display / 60);
  const seconds = display % 60;
  const label = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const pct = totalSec > 0 ? Math.max(0, Math.min(1, safe / totalSec)) : 0;
  const dashOffset = CIRCUMFERENCE - pct * CIRCUMFERENCE;
  const isUrgent = totalSec > 0 && safe <= 30;
  const isCritical = totalSec > 0 && safe <= 10;
  const colorCls = colorFor(safe, totalSec);
  const trackCls = trackColor(safe, totalSec);

  return (
    <div className={`inline-flex items-center gap-2 ${isUrgent ? colorCls : "text-neutral-700"}`}>
      <div className={`relative ${isCritical ? "quiz-timer-critical" : ""}`} style={{ width: SIZE, height: SIZE }} aria-hidden="true">
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="opacity-20"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className={`transition-all duration-500 ease-out ${trackCls}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Clock className="h-3.5 w-3.5 opacity-70" />
        </div>
      </div>
      <span className={`font-mono text-sm tabular-nums ${isUrgent ? colorCls : ""}`}>
        {label}
      </span>
      {isCritical && (
        <span className="text-[11px] font-medium text-rose-600">Time running out</span>
      )}
    </div>
  );
}
