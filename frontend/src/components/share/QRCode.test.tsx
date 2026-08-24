import { render, screen, waitFor } from "@testing-library/react";
import QRCode from "./QRCode";

// Written against the previous implementation first, so the refactor that
// follows has to keep these true.
//
// Generating the code is asynchronous, so the component shows a loader until
// it has one. The part worth pinning down is what happens when the link
// changes: the old code for the old link must not stay on screen, and the
// answer that arrives for a link nobody is looking at any more must not
// replace the one that is.

const toDataURL = jest.fn();

jest.mock("qrcode", () => ({
  __esModule: true,
  default: {
    toDataURL: (...args: unknown[]) => toDataURL(...args),
  },
}));

const deferred = () => {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((r) => (resolve = r));
  return { promise, resolve };
};

const image = () => screen.queryByAltText("qrcode");

beforeEach(() => toDataURL.mockReset());

describe("QRCode", () => {
  it("shows a loader until the code has been generated", async () => {
    const first = deferred();
    toDataURL.mockReturnValue(first.promise);

    render(<QRCode link="https://example.invalid/s/one" />);
    expect(image()).not.toBeInTheDocument();

    first.resolve("data:image/png;base64,ONE");
    await waitFor(() =>
      expect(image()).toHaveAttribute("src", "data:image/png;base64,ONE"),
    );
  });

  it("goes back to the loader when the link changes", async () => {
    const first = deferred();
    toDataURL.mockReturnValue(first.promise);

    const { rerender } = render(<QRCode link="https://example.invalid/s/one" />);
    first.resolve("data:image/png;base64,ONE");
    await waitFor(() => expect(image()).toBeInTheDocument());

    const second = deferred();
    toDataURL.mockReturnValue(second.promise);
    rerender(<QRCode link="https://example.invalid/s/two" />);

    expect(image()).not.toBeInTheDocument();

    second.resolve("data:image/png;base64,TWO");
    await waitFor(() =>
      expect(image()).toHaveAttribute("src", "data:image/png;base64,TWO"),
    );
  });

  it("asks for a code for whichever link it was given", async () => {
    toDataURL.mockReturnValue(deferred().promise);
    render(<QRCode link="https://example.invalid/s/one" />);

    expect(toDataURL).toHaveBeenCalledWith(
      "https://example.invalid/s/one",
      expect.objectContaining({ width: 400 }),
    );
  });

  it("keeps showing the loader when generating fails", async () => {
    toDataURL.mockReturnValue(Promise.reject(new Error("nope")));

    render(<QRCode link="https://example.invalid/s/one" />);

    await waitFor(() => expect(toDataURL).toHaveBeenCalled());
    expect(image()).not.toBeInTheDocument();
  });
});
