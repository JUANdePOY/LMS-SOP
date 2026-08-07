import { cn } from "@/lib/utils";

const MEDAL = {
  1: "bg-yellow-400 text-yellow-900",
  2: "bg-slate-300 text-slate-700",
  3: "bg-amber-700 text-amber-100",
};

function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PodiumUser({ user, elevated }) {
  const size = elevated ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm";
  return (
    <div className={cn("flex flex-col items-center", elevated && "order-1 sm:-mt-4")}>
      <div className="relative">
        <div className={cn("flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white shadow-md", size)}>
          {initials(user.name)}
        </div>
        <span className={cn("absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white", MEDAL[user.rank])}>
          {user.rank}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</p>
      <p className="text-[11px] text-slate-400">{user.points} pts</p>
    </div>
  );
}

export default function LeaderboardPodium({ entries = [] }) {
  const top3 = entries.slice(0, 3).sort((a, b) => a.rank - b.rank);

  return (
    <div className="flex items-end justify-center gap-4 py-2">
      {top3.map((user) => (
        <PodiumUser key={user.rank} user={user} elevated={user.rank === 1} />
      ))}
    </div>
  );
}
