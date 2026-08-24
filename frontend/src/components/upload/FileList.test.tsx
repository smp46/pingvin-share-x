import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { FileListItem } from "../../types/File.type";
import FileList from "./FileList";

// pulls in the markdown editor, which is esm only and irrelevant here
jest.mock("./modals/showTextEditorModal", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// The list edits the array it was handed. remove and restore wrote into it
// with splice and index assignment before passing a copy on, which means the
// array the parent still holds in state had already changed underneath it.
//
// So these check both halves: the array that comes out, and the array that
// went in being left exactly as it was.

const uploaded = (name: string, extra: Record<string, unknown> = {}) =>
  ({ name, size: 10, ...extra }) as unknown as FileListItem;

// queued, not yet started: that is the state the list offers a remove button
// for, an upload already in progress shows a progress indicator instead
const queued = (name: string) =>
  ({ name, size: 10, uploadingProgress: 0 }) as unknown as FileListItem;

const renderList = (files: FileListItem[]) => {
  const setFiles = jest.fn();
  renderWithProviders(<FileList files={files} setFiles={setFiles} />);
  return setFiles;
};

// scoped to the row, so a file whose state renders a different set of buttons
// cannot shift which one a click lands on
const buttonInRowFor = (name: string) => {
  const row = screen.getByText(name, { exact: false }).closest("tr");
  return row!.querySelectorAll("button")[0];
};

describe("FileList", () => {
  it("marks an uploaded file deleted rather than dropping it", () => {
    const files = [uploaded("a.txt"), uploaded("b.txt")];
    const snapshot = JSON.stringify(files);
    const setFiles = renderList(files);

    fireEvent.click(buttonInRowFor("a.txt"));

    const next = setFiles.mock.calls[0][0];
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ name: "a.txt", deleted: true });
    expect(next[1]).toMatchObject({ name: "b.txt" });
    expect(JSON.stringify(files)).toBe(snapshot);
  });

  // not a .txt, so the row offers removal and nothing else. A queued text file
  // also gets an edit button, which would be the one a click landed on first.
  it("drops a file that has not been sent yet", () => {
    const files = [queued("a.bin"), uploaded("b.txt")];
    const snapshot = JSON.stringify(files);
    const setFiles = renderList(files);

    fireEvent.click(buttonInRowFor("a.bin"));

    const next = setFiles.mock.calls[0][0];
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ name: "b.txt" });
    expect(JSON.stringify(files)).toBe(snapshot);
  });

  it("brings a deleted file back", () => {
    const files = [uploaded("a.txt", { deleted: true }), uploaded("b.txt")];
    const snapshot = JSON.stringify(files);
    const setFiles = renderList(files);

    fireEvent.click(buttonInRowFor("a.txt"));

    const next = setFiles.mock.calls[0][0];
    expect(next[0]).toMatchObject({ name: "a.txt", deleted: false });
    expect(JSON.stringify(files)).toBe(snapshot);
  });

  it("hands back a different array, not the one it was given", () => {
    const files = [uploaded("a.txt")];
    const setFiles = renderList(files);

    fireEvent.click(buttonInRowFor("a.txt"));

    expect(setFiles.mock.calls[0][0]).not.toBe(files);
  });
});
