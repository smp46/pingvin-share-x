import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require("sharp");

const IMAGES_PATH = "../frontend/public/img";

const MASKABLE_BACKGROUNDS = {
  light: "#ffffff",
  dark: "#1a1b1e",
};
const MASKABLE_SCHEMES = Object.keys(MASKABLE_BACKGROUNDS) as Array<
  keyof typeof MASKABLE_BACKGROUNDS
>;
const MASKABLE_SIZES = [192, 512];
const MASKABLE_LOGO_RATIO = 0.6;

@Injectable()
export class LogoService implements OnModuleInit {
  private readonly logger = new Logger(LogoService.name);

  async onModuleInit() {
    await this.createMaskableIcons();
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
