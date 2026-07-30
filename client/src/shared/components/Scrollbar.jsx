import { useEffect, cloneElement } from "react";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  viewport: "scrollbar-viewport",
  container: "scrollbar-custom",
};

export function Scrollbar({
  children,
  className = "",
  variant = "container",
  asChild = false,
  hideScrollbar = false,
  autoHide = false,
  ...props
}) {
  useEffect(() => {
    if (variant !== "viewport") return;

    const root = document.documentElement;
    root.classList.add("scrollbar-viewport");

    return () => {
      root.classList.remove("scrollbar-viewport");
    };
  }, [variant]);

  const scrollbarClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.container;

  const sizeClass = hideScrollbar
    ? "scrollbar-none"
    : autoHide
    ? "scrollbar-auto-hide"
    : "";

  const combinedClass = cn(scrollbarClass, sizeClass, className);

  if (asChild) {
    const child = children;
    if (typeof child === "object" && child !== null) {
      return cloneElement(child, {
        className: cn(child.props.className, combinedClass),
        ...props,
      });
    }
    return <div className={combinedClass} {...props}>{children}</div>;
  }

  if (variant === "viewport") {
    return <>{children}</>;
  }

  return (
    <div
      className={cn("overflow-auto", combinedClass)}
      {...props}
    >
      {children}
    </div>
  );
}