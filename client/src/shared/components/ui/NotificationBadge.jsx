export default function NotificationBadge({ count }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}
