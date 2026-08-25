import { filterDuplicateFiles, getNormalizedFileName } from "./file.util";

// A folder upload carries a path rather than a name, and a browser on windows
// spells that path with backslashes. Everything downstream compares these as
// strings, so two spellings of the same file would be treated as two files.

const fileLike = (name: string, webkitRelativePath?: string) =>
  ({ name, webkitRelativePath }) as unknown as File;

describe("getNormalizedFileName", () => {
  it("uses the plain name when there is no folder", () => {
    expect(getNormalizedFileName(fileLike("report.pdf"))).toBe("report.pdf");
  });

  it("prefers the folder path when a folder was uploaded", () => {
    expect(
      getNormalizedFileName(fileLike("report.pdf", "docs/report.pdf")),
    ).toBe("docs/report.pdf");
  });

  it("writes a windows path the way the rest of the app expects", () => {
    expect(
      getNormalizedFileName(fileLike("report.pdf", "docs\\2026\\report.pdf")),
    ).toBe("docs/2026/report.pdf");
  });

  it("drops a leading separator so paths compare as equal", () => {
    expect(getNormalizedFileName(fileLike("a.txt", "/docs/a.txt"))).toBe(
      "docs/a.txt",
    );
    expect(getNormalizedFileName(fileLike("a.txt", "\\docs\\a.txt"))).toBe(
      "docs/a.txt",
    );
  });

  it("falls back to the name when the path is empty", () => {
    expect(getNormalizedFileName(fileLike("a.txt", ""))).toBe("a.txt");
  });
});

describe("filterDuplicateFiles", () => {
  const collect = () => {
    const reported: string[] = [];
    return { reported, onDuplicate: (n: string) => reported.push(n) };
  };

  it("keeps files that are not already there", () => {
    const { reported, onDuplicate } = collect();

    const kept = filterDuplicateFiles(
      [fileLike("a.txt"), fileLike("b.txt")],
      [{ name: "c.txt" }],
      onDuplicate,
    );

    expect(kept.map((f) => f.name)).toEqual(["a.txt", "b.txt"]);
    expect(reported).toEqual([]);
  });

  it("drops one that is already in the list and says which", () => {
    const { reported, onDuplicate } = collect();

    const kept = filterDuplicateFiles(
      [fileLike("a.txt"), fileLike("b.txt")],
      [{ name: "a.txt" }],
      onDuplicate,
    );

    expect(kept.map((f) => f.name)).toEqual(["b.txt"]);
    expect(reported).toEqual(["a.txt"]);
  });

  it("drops a repeat inside the same selection", () => {
    const { reported, onDuplicate } = collect();

    const kept = filterDuplicateFiles(
      [fileLike("a.txt"), fileLike("a.txt")],
      [],
      onDuplicate,
    );

    expect(kept).toHaveLength(1);
    expect(reported).toEqual(["a.txt"]);
  });

  // a file the user removed is not occupying its name any more
  it("lets a name be reused once the file holding it was deleted", () => {
    const { reported, onDuplicate } = collect();

    const kept = filterDuplicateFiles(
      [fileLike("a.txt")],
      [{ name: "a.txt", deleted: true }],
      onDuplicate,
    );

    expect(kept).toHaveLength(1);
    expect(reported).toEqual([]);
  });

  // the same file spelled two ways is still the same file
  it("matches a windows path against the same path already present", () => {
    const { reported, onDuplicate } = collect();

    const kept = filterDuplicateFiles(
      [fileLike("a.txt", "docs\\a.txt")],
      [{ name: "a.txt", webkitRelativePath: "docs/a.txt" }],
      onDuplicate,
    );

    expect(kept).toEqual([]);
    expect(reported).toEqual(["docs/a.txt"]);
  });

  it("treats the same name in two folders as two files", () => {
    const { reported, onDuplicate } = collect();

    const kept = filterDuplicateFiles(
      [fileLike("a.txt", "one/a.txt"), fileLike("a.txt", "two/a.txt")],
      [],
      onDuplicate,
    );

    expect(kept).toHaveLength(2);
    expect(reported).toEqual([]);
  });
});
