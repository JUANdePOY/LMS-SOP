import { RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFlipCard } from "../hooks/useFlipCard"
import DigitalIDCardFront from "./DigitalIDCardFront"
import DigitalIDCardBack from "./DigitalIDCardBack"

export default function DigitalIDCard({ profile = {}, links = [] }) {
  const { isFlipped, flip } = useFlipCard()

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Click to flip the digital ID card"
        onClick={flip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") flip()
        }}
        className={cn(
          "card-flip-container w-full",
          "max-w-[clamp(260px,80vw,360px)] aspect-[3/5]",
          "cursor-pointer"
        )}
      >
        <div className={cn("card-flip-inner", isFlipped && "is-flipped")}>
          <div className={cn("card-flip-face shadow-xl rounded-3xl overflow-hidden", isFlipped && "pointer-events-none")}>
            <DigitalIDCardFront
              profile={profile}
            />
          </div>

          <div className={cn("card-flip-face card-flip-face--back shadow-xl rounded-3xl overflow-hidden", !isFlipped && "pointer-events-none")}>
            <DigitalIDCardBack
              profile={profile}
              links={links}
            />
          </div>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <RotateCw size={13} />
        Click the card to flip it and view your QR code on the back
      </p>
    </div>
  )
}