import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require("sharp");

const IMAGES_PATH = "../frontend/public/img";

// Background colors of the maskable PWA icons, they match the page background
// of the light and dark color scheme (Mantine: white / dark.7).
// Keep in sync with frontend/src/utils/pwaColors.util.ts
const MASKABLE_BACKGROUNDS = {
  light: "#ffffff",
  dark: "#1a1b1e",
};
const MASKABLE_SCHEMES = Object.keys(MASKABLE_BACKGROUNDS) as Array<
  keyof typeof MASKABLE_BACKGROUNDS
>;
const MASKABLE_SIZES = [192, 512];
// Share of the icon the logo occupies, the rest is padding. Maskable icons
// can be cropped by the launcher, so the logo has to stay in the safe zone.
const MASKABLE_LOGO_RATIO = 0.6;

@Injectable()
export class LogoService implements OnModuleInit {
  private readonly logger = new Logger(LogoService.name);

  async onModuleInit() {
    // Create the maskable icons for existing installations and the default logo
    const missing = MASKABLE_SCHEMES.some((scheme) =>
      MASKABLE_SIZES.some(
        (size) =>
          !fs.existsSync(
            `${IMAGES_PATH}/icons/icon-maskable-${scheme}-${size}x${size}.png`,
          ),
      ),
    );
    if (missing) await this.createMaskableIcons();
  }

  async create(file: Buffer) {
    const resized = await sharp(file).resize(900).toBuffer();
    fs.writeFileSync(`${IMAGES_PATH}/logo.png`, resized, "binary");
    this.createFavicon(file);
    this.createPWAIcons(file);
    await this.createMaskableIcons();
  }

  async createDark(file: Buffer) {
    const resized = await sharp(file).resize(900).toBuffer();
    fs.writeFileSync(`${IMAGES_PATH}/logo-dark.png`, resized, "binary");
    await this.createMaskableIcons();
  }

  async createFavicon(file: Buffer) {
    const resized = await sharp(file).resize(16).toBuffer();
    fs.promises.writeFile(`${IMAGES_PATH}/favicon.ico`, resized, "binary");
  }

  async createPWAIcons(file: Buffer) {
    const sizes = [48, 72, 96, 128, 144, 152, 192, 384, 512];

    for (const size of sizes) {
      const resized = await sharp(file).resize(size).toBuffer();
      fs.promises.writeFile(
        `${IMAGES_PATH}/icons/icon-${size}x${size}.png`,
        resized,
        "binary",
      );
    }
  }

  // Maskable icons have an opaque background and some padding, so the icon
  // looks the same on every Android launcher and browser instead of being
  // filled with a browser specific color. The dark variant uses the dark logo
  // if one was uploaded.
  async createMaskableIcons() {
    try {
      const lightLogoPath = `${IMAGES_PATH}/logo.png`;
      const darkLogoPath = fs.existsSync(`${IMAGES_PATH}/logo-dark.png`)
        ? `${IMAGES_PATH}/logo-dark.png`
        : lightLogoPath;
      const sources = { light: lightLogoPath, dark: darkLogoPath };

      await fs.promises.mkdir(`${IMAGES_PATH}/icons`, { recursive: true });

      for (const scheme of MASKABLE_SCHEMES) {
        for (const size of MASKABLE_SIZES) {
          const innerSize = Math.round(size * MASKABLE_LOGO_RATIO);
          const logo = await sharp(sources[scheme])
            .resize(innerSize, innerSize, {
              fit: "contain",
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .toBuffer();

          await sharp({
            create: {
              width: size,
              height: size,
              channels: 3,
              background: MASKABLE_BACKGROUNDS[scheme],
            },
          })
            .composite([{ input: logo, gravity: "center" }])
            .png()
            .toFile(
              `${IMAGES_PATH}/icons/icon-maskable-${scheme}-${size}x${size}.png`,
            );
        }
      }
    } catch (e) {
      this.logger.error(`Failed to create maskable PWA icons: ${e}`);
    }
  }
}
