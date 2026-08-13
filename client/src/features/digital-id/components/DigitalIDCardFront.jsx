import UserAvatar from "@/shared/components/ui/Avatar"
import { resolveFileUrl } from "@/lib/fileUrl"

function normalizeAvatarUrl(url) {
  if (!url) return ""
  try {
    const parsed = new URL(url)
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : ""
  } catch {
    return ""
  }
}

export default function DigitalIDCardFront({ profile = {} }) {
  const fullName = profile?.full_name || "Your Name"
  const positionTitle = profile?.position_title || "No position title"
  const businessName = profile?.business_name || ""
  const bio = profile?.bio || ""
  const imageSrc = normalizeAvatarUrl(resolveFileUrl(profile?.avatar_url)) || null

  return (
    <div className="relative flex h-full w-full flex-col rounded-3xl bg-white" style={{ clipPath: "inset(0 round 1.5rem)" }}>
      {/* frame image */}
      <img src="/front.png" alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* avatar */}
      <div className="relative z-10 flex flex-col items-center pt-[30%]">
        <div className="relative aspect-square w-[34%] min-w-[88px] max-w-[150px] shrink-0">
          <div className="absolute inset-0 overflow-hidden rounded-full border-[3px] border-[var(--color-primary)] bg-neutral-100 shadow-md">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={fullName}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-neutral-500">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-3 text-center text-[clamp(1.1rem,4.5vw,1.5rem)] font-extrabold tracking-tight text-neutral-900">
          {fullName.toUpperCase()}
        </h2>
        <p className="text-center text-[clamp(0.75rem,2.8vw,0.9rem)] text-neutral-500 flex items-center gap-1.5 mt-1">
          <span className="inline-flex items-center rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(242, 92, 5, 0.1)' }}>
            {positionTitle}
          </span>
        </p>
        {businessName && (
          <p className="text-center text-[clamp(0.75rem,2.8vw,0.9rem)] text-neutral-500 flex items-center gap-1.5 mt-1 font-medium">
            {businessName}
          </p>
        )}
      </div>

      {/* body */}
      <div className="relative z-10 flex flex-col gap-3 px-[7%] pb-[6%] pt-[5%] text-neutral-800">
        {bio && (
          <div className="border-t border-neutral-200 pt-3">
            <h3 className="text-[clamp(0.85rem,3vw,0.95rem)] font-bold text-neutral-900">Bio</h3>
            <p className="mt-1 line-clamp-3 text-[clamp(0.7rem,2.6vw,0.8rem)] leading-relaxed text-neutral-500">
              {bio}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
