import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// create() answers the http request that uploaded the logo, so by the time it
// resolves every file it is responsible for has to be on disk. It used to
// start the favicon and the pwa icons without waiting for them, which meant
// the response said done while they were still being written.

let root: string;

jest.mock("./logoPaths", () => ({
  get IMAGES_PATH() {
    return root;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require("sharp");

const pngOf = (size: number) =>
  sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 20, g: 40, b: 60, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

const PWA_SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512];

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "logo-spec-"));
  fs.mkdirSync(path.join(root, "icons"));
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

// required rather than imported so the path mock above is in place first
const service = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LogoService } = require("./logo.service");
  return new LogoService();
};

describe("LogoService", () => {
  it("has written every file once create resolves", async () => {
    await service().create(await pngOf(1000));

    expect(fs.existsSync(path.join(root, "logo.png"))).toBe(true);
    expect(fs.existsSync(path.join(root, "favicon.ico"))).toBe(true);
    for (const size of PWA_SIZES)
      expect(
        fs.existsSync(path.join(root, "icons", `icon-${size}x${size}.png`)),
      ).toBe(true);
  }, 30_000);

  it("has written the dark logo once createDark resolves", async () => {
    await service().createDark(await pngOf(1000));

    expect(fs.existsSync(path.join(root, "logo-dark.png"))).toBe(true);
  }, 30_000);

  it("writes a logo no wider than 900", async () => {
    await service().create(await pngOf(2000));

    const meta = await sharp(path.join(root, "logo.png")).metadata();
    expect(meta.width).toBe(900);
  }, 30_000);

  it("reports a failure rather than leaving it unhandled", async () => {
    root = path.join(root, "gone");

    await expect(service().create(await pngOf(100))).rejects.toBeDefined();
  }, 30_000);
});
