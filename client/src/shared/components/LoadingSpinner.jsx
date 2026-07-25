import { Loader } from "lucide-react";

export default function LoadingSpinner({ size = "default", className = "" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader className={`animate-spin text-indigo-500 ${sizeClasses[size]}`} />
    </div>
  );
}