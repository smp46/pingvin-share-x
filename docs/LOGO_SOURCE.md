# RV crest source and presentation

The default app branding uses the complete circular crest from
[New RV College logo.png on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:New_RV_College_logo.png),
credited there to **Shreyas shaurya**, under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
The [original PNG](https://upload.wikimedia.org/wikipedia/commons/1/1f/New_RV_College_logo.png)
is 120 × 120 pixels. Its internal ring lettering, RV shield, circular borders,
and registration mark are retained. There is no separate college-name text to
the right of this source image.

## Assets

- `frontend/public/img/logo.png` and `logo-dark.png` are byte-for-byte copies of
  that source. The transparent black crest is displayed over a white circular
  CSS background on a separate wrapper in `Logo.tsx`, with `object-fit: contain`
  on the image to avoid distortion. The wrapper has visible overflow;
  the image has no border radius, so its source corner pixels remain visible.
- `logo.svg` embeds those exact PNG bytes in a 120 × 120 SVG image, over a white
  circle. It is a native presentation wrapper, not a vector redraw or AI cutout.
- `favicon.ico` (16, 32, and 48 pixels), `rv-files-touch-icon.png` (180 pixels),
  the PNGs in `img/icons/`, and the legacy `rv-files-192.png`/`rv-files-512.png`
  are native SVG renders of the same wrapper using Sharp/librsvg. They preserve
  the square framing and white circle at every size. The raster source has not
  gained detail through enlargement.
- `_document.tsx` declares the SVG favicon, ICO fallback, and Apple touch icon.
  The manifest uses the SVG and the existing 192/512-pixel PWA icon paths under
  `img/icons/`, which are also the paths updated by the admin logo service.

The source pixels are unchanged. The added white backing and icon-size exports
are presentation adaptations distributed under the same CC BY-SA 4.0 license.
No endorsement by the crest's owner is implied.

## Custom logos

The existing `/img/logo.png` and `/img/logo-dark.png` URLs remain the preferred
light/dark app logos. Admin uploads can continue replacing them. The fallback
order remains dark PNG → light PNG → bundled SVG. Both custom PNGs receive the
same white circular backing and contain sizing. The backing wrapper does not
clip the image: square/rectangular custom uploads retain their corners, as does
the default crest's outside registration mark. The shared Logo component serves
the header and admin views.

## Verification

Static asset SVG renders were inspected at 35 and 80 pixels on white and dark
backgrounds, plus the original 120-pixel size. All show the complete circular
border, ring lettering and shield, without the earlier oversized margins.
Browser verification was unavailable because local browser use is disabled in
Work settings; this static inspection does not claim browser execution.

`scripts/tests/logo-render.test.cjs` server-renders the actual React component
in light/dark schemes at 35 × 35, 80 × 80, and 120 × 80 pixels. Its regression
checks enforce square image corners, contain sizing, and a separate backing
wrapper with visible overflow. All six checks failed on the original clipping
CSS and pass after moving the circular backing to the wrapper.

`docs/logo-component-preview.html` contains the actual server-rendered component
markup/styles, with embedded crest images and a custom corner-color fixture for
offline browser review. Generate it with
`LOGO_PREVIEW_PATH=docs/logo-component-preview.html node --test scripts/tests/logo-render.test.cjs`
from the repository root. It has not been visually executed in a browser here.
