import { createEmotionCache } from "@mantine/core";

// One cache shared by the provider that renders the styles and the document
// that extracts them. Left to their defaults the two end up holding separate
// instances, the extraction finds an empty cache, and the server sends markup
// whose class names have no rules behind them. The browser then paints
// everything unstyled until hydration fills them in.
export const emotionCache = createEmotionCache({ key: "mantine" });
