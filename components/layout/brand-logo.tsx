import * as React from "react"
import { cn } from "@/lib/utils"

export function BrandLogo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={cn("size-6 rounded-md shrink-0 shadow-xs", className)}
      aria-label="MyOS"
      {...props}
    >
      <defs>
        <linearGradient id="brandLogoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#262626" />
          <stop offset="100%" stopColor="#121212" />
        </linearGradient>
        <linearGradient id="brandLogoAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#a3a3a3" />
        </linearGradient>
      </defs>

      {/* Background Base */}
      <rect width="512" height="512" rx="112" fill="url(#brandLogoBgGrad)" />

      {/* Subtle Outer Rim */}
      <rect
        x="16"
        y="16"
        width="480"
        height="480"
        rx="96"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.1"
        strokeWidth="4"
      />

      {/* Outer Orbit Ring */}
      <circle
        cx="256"
        cy="256"
        r="160"
        fill="none"
        stroke="url(#brandLogoAccentGrad)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="750 250"
      />

      {/* Inner Circle */}
      <circle
        cx="256"
        cy="256"
        r="96"
        fill="#1f1f1f"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="8"
      />

      {/* Core Glyph (Stylized OS Monogram) */}
      <path
        d="M208 200 L208 312 M208 240 L256 280 L304 240 M304 200 L304 312"
        fill="none"
        stroke="url(#brandLogoAccentGrad)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
