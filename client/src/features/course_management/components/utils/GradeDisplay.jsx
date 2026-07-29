export default function GradeDisplay({ score, maxScore }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const label = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${pct >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
        {label}
      </div>
      <div>
        <p className="text-sm font-medium">{score} / {maxScore}</p>
        <p className="text-xs text-neutral-500">{pct}%</p>
      </div>
    </div>
  );
}
