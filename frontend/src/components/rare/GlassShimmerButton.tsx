// Adapted from RareUI; see ATTRIBUTION.md and LICENSE in this directory.
import Link from "next/link";
import { ReactNode } from "react";

export function GlassShimmerButton({
  children,
  href,
  className = "",
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <>
      <style jsx>{`
        @keyframes glass-shimmer {
          0% {
            transform: translateX(-150%) skewX(-20deg);
          }
          100% {
            transform: translateX(150%) skewX(-20deg);
          }
        }
        .shimmer {
          animation: glass-shimmer 3s infinite linear;
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer {
            animation: none;
            opacity: 0;
          }
        }
      `}</style>
      <Link
        href={href}
        className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-white/20 bg-linear-to-r from-violet-500 to-indigo-500 px-8 py-4 text-base font-semibold text-white shadow-lg transition-transform duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 motion-reduce:transform-none ${className}`}
      >
        <span
          aria-hidden="true"
          className="shimmer pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,.3) 50%, transparent)",
            width: "200%",
            left: "-50%",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent"
        />
        <span className="relative z-10 inline-flex items-center gap-3">
          {children}
        </span>
      </Link>
    </>
  );
}
