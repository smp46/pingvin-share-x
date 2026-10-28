# RareUI components in RV Files

Manually copied and adapted from [Codewithswappy/RareUI](https://github.com/Codewithswappy/RareUI), pinned to commit `e50c0c7a3bbc51c11b5799c05a600d0a78e9350e` (source inspected 2026-10-28). Copyright (c) 2025 Swapnil Kalambe (RareUI). Distributed under the MIT license, reproduced in [LICENSE](./LICENSE). The application's BSD-2 license remains unchanged.

Selected source paths:

- [`components/Background/background.tsx`](https://github.com/Codewithswappy/RareUI/blob/e50c0c7a3bbc51c11b5799c05a600d0a78e9350e/components/Background/background.tsx) → `InteractiveBackground.tsx`: particle connections and animated aurora. Uses existing `framer-motion` 11 instead of upstream `motion/react`; no React 19 API is needed. Removed unused size state, scoped canvas sizing with ResizeObserver, limited particles to 40, guarded zero-distance division, corrected purple color branch, made canvas decorative/non-intercepting, and added reduced-motion support.
- [`components/rareui/GlassShimmerButton/GlassShimmerButton.tsx`](https://github.com/Codewithswappy/RareUI/blob/e50c0c7a3bbc51c11b5799c05a600d0a78e9350e/components/rareui/GlassShimmerButton/GlassShimmerButton.tsx) → `GlassShimmerButton.tsx`: retains animated shimmer/gloss, rendered as a Next Link for navigation; violet gradient, explicit focus style, reduced-motion support, simplified layers so shimmer appears above its background.
- [`components/rareui/VaporSmokeText/VaporSmokeText.tsx`](https://github.com/Codewithswappy/RareUI/blob/e50c0c7a3bbc51c11b5799c05a600d0a78e9350e/components/rareui/VaporSmokeText/VaporSmokeText.tsx) → `VaporSmokeText.tsx`: retains staggered blur/spring letter reveal; motion 11 compatible, grouped words for responsive wrapping, semantic heading supplied by caller, accessible text label, reduced-motion support, shorter reveal and inherited typography.

Removed `cn` imports in favor of simple class concatenation: these components do not need `clsx` or `tailwind-merge`. No new dependencies, CLI initialization, scaffolding, or React/Mantine upgrades were used. No React-19-only component fallback was necessary.

**Update (inspection-checkpoint redesign):** all three components were removed from the app because their glow/particle/smoke styling no longer fits the visual identity. This attribution and the MIT LICENSE are kept for the git history that contained them.
