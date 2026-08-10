import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function ImageLightbox({ src, alt, onClose }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const previousStyle = useRef({});

  useEffect(() => {
    if (!src) return;

    const scrollY = window.scrollY;
    const body = document.body;

    previousStyle.current = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    const handleEsc = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("keydown", handleEsc);
      const body = document.body;
      body.style.overflow = previousStyle.current.overflow;
      body.style.position = previousStyle.current.position;
      body.style.top = previousStyle.current.top;
      body.style.width = previousStyle.current.width;
      window.scrollTo(0, scrollY);
    };
  }, [src]);

  if (!src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1 transition-colors z-10"
      >
        <X size={28} />
      </button>
      <img
        src={src}
        alt={alt || "Zoomed image"}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
