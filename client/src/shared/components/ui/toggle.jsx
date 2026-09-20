import * as React from "react";
import { cn } from "@/lib/utils";

const Toggle = React.forwardRef(({ className, checked, onCheckedChange, disabled, size, ...props }, ref) => {
  const sizeClasses = size === 'sm'
    ? 'h-3.5 w-[30px]'
    : 'h-[18px] w-[34px]';
  const thumbClasses = size === 'sm'
    ? 'h-2.5 w-2.5'
    : 'h-3.5 w-3.5';
  const translateClasses = size === 'sm'
    ? checked ? 'translate-x-[18px]' : 'translate-x-0'
    : checked ? 'translate-x-4' : 'translate-x-0';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses,
        checked ? "bg-indigo-600" : "bg-neutral-200 dark:bg-neutral-700",
        className
      )}
      ref={ref}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform",
          thumbClasses,
          translateClasses
        )}
      />
    </button>
  );
});
Toggle.displayName = "Toggle";

export { Toggle };
