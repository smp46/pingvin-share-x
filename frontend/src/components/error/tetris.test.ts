import {
  COLS,
  Cell,
  ROWS,
  clearRows,
  collides,
  emptyBoard,
  findFullRows,
  gravityMs,
  levelForLines,
  makeCells,
  rotateCW,
  scoreForLines,
  shuffledBag,
  tryRotate,
} from "./tetris";

const filled = (digit = "4"): Cell => ({ color: "#000000", digit });

const fillRow = (board: ReturnType<typeof emptyBoard>, y: number) => {
  for (let x = 0; x < COLS; x++) board[y][x] = filled();
};

describe("board and collision", () => {
  it("starts empty at 10x20", () => {
    const board = emptyBoard();
    expect(board).toHaveLength(ROWS);
    expect(board[0]).toHaveLength(COLS);
    expect(board.flat().every((c) => c === null)).toBe(true);
  });

  it("blocks movement through the side walls", () => {
    const board = emptyBoard();
    const cells = makeCells("O", ["4"]);
    expect(collides(board, cells, -1, 0)).toBe(true);
    expect(collides(board, cells, COLS - 1, 0)).toBe(true);
    expect(collides(board, cells, 0, 0)).toBe(false);
  });

  it("blocks movement through the floor", () => {
    const board = emptyBoard();
    const cells = makeCells("O", ["4"]);
    expect(collides(board, cells, 0, ROWS - 2)).toBe(false);
    expect(collides(board, cells, 0, ROWS - 1)).toBe(true);
  });

  it("blocks movement into settled blocks", () => {
    const board = emptyBoard();
    board[5][0] = filled();
    const cells = makeCells("O", ["4"]);
    expect(collides(board, cells, 0, 4)).toBe(true);
    expect(collides(board, cells, 2, 4)).toBe(false);
  });

  it("ignores cells above the top of the board", () => {
    const board = emptyBoard();
    const cells = makeCells("I", ["4"]);
    expect(collides(board, cells, 3, -1)).toBe(false);
  });
});

describe("rotation", () => {
  it("turns a T piece clockwise", () => {
    const cells = makeCells("T", ["x"]);
    const filledMap = (m: (string | null)[][]) =>
      m.map((row) => row.map((v) => (v ? 1 : 0)));

    expect(filledMap(cells)).toEqual([
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ]);
    expect(filledMap(rotateCW(cells))).toEqual([
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ]);
  });

  it("returns to the start after four turns", () => {
    const cells = makeCells("J", ["4", "0", "4"]);
    expect(rotateCW(rotateCW(rotateCW(rotateCW(cells))))).toEqual(cells);
  });

  it("carries the digits along with the rotation", () => {
    const cells = makeCells("O", ["4", "0", "4"]);
    const rotated = rotateCW(cells);
    const digits = (m: (string | null)[][]) =>
      m.flat().filter((v) => v !== null).sort();
    expect(digits(rotated)).toEqual(digits(cells));
  });

  it("kicks off the wall instead of refusing to rotate", () => {
    const board = emptyBoard();
    const cells = makeCells("I", ["4"]);
    // an upright I hugging the left wall has no room to turn in place
    const upright = rotateCW(cells);
    const kicked = tryRotate(board, upright, -2, 5);
    expect(kicked).not.toBeNull();
    expect(collides(board, kicked!.cells, kicked!.x, kicked!.y)).toBe(false);
  });

  it("gives up when nothing fits", () => {
    const board = emptyBoard();
    // bury the piece so no kick offset can succeed
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) board[y][x] = filled();
    }
    const cells = makeCells("T", ["4"]);
    expect(tryRotate(board, cells, 3, 5)).toBeNull();
  });
});

describe("line clearing", () => {
  it("finds only the complete rows", () => {
    const board = emptyBoard();
    fillRow(board, 19);
    fillRow(board, 17);
    board[15][0] = filled();
    expect(findFullRows(board)).toEqual([17, 19]);
  });

  it("removes cleared rows and drops the stack down", () => {
    const board = emptyBoard();
    fillRow(board, 19);
    board[18][3] = filled("marker");

    const result = clearRows(board, [19]);

    expect(result).toHaveLength(ROWS);
    // the marker fell from row 18 into row 19
    expect(result[19][3]?.digit).toBe("marker");
    expect(result[18][3]).toBeNull();
    expect(result[0].every((c) => c === null)).toBe(true);
  });

  it("clears four rows at once", () => {
    const board = emptyBoard();
    [16, 17, 18, 19].forEach((y) => fillRow(board, y));
    const result = clearRows(board, [16, 17, 18, 19]);
    expect(result.flat().every((c) => c === null)).toBe(true);
  });
});

describe("scoring and levels", () => {
  it("uses the guideline values at level 1", () => {
    expect(scoreForLines(1, 1)).toBe(100);
    expect(scoreForLines(2, 1)).toBe(300);
    expect(scoreForLines(3, 1)).toBe(500);
    expect(scoreForLines(4, 1)).toBe(800);
  });

  it("multiplies by the current level", () => {
    expect(scoreForLines(1, 5)).toBe(500);
    expect(scoreForLines(4, 3)).toBe(2400);
  });

  it("scores nothing for zero lines", () => {
    expect(scoreForLines(0, 9)).toBe(0);
  });

  it("moves up a level every ten lines", () => {
    expect(levelForLines(0)).toBe(1);
    expect(levelForLines(9)).toBe(1);
    expect(levelForLines(10)).toBe(2);
    expect(levelForLines(25)).toBe(3);
  });
});

describe("gravity", () => {
  it("is about a second per row at level 1", () => {
    expect(gravityMs(1)).toBe(1000);
  });

  it("speeds up as the level goes up", () => {
    expect(gravityMs(2)).toBeLessThan(gravityMs(1));
    expect(gravityMs(8)).toBeLessThan(gravityMs(5));
  });

  it("never drops below the frame floor", () => {
    expect(gravityMs(30)).toBeGreaterThanOrEqual(25);
    expect(gravityMs(100)).toBeGreaterThanOrEqual(25);
  });
});

describe("piece bag", () => {
  it("deals all seven pieces before repeating", () => {
    const bag = shuffledBag();
    expect(bag).toHaveLength(7);
    expect(new Set(bag).size).toBe(7);
  });
});

describe("digits", () => {
  it("writes the error code into the blocks", () => {
    const cells = makeCells("I", ["4", "0", "4"]);
    const written = cells.flat().filter((v): v is string => v !== null);
    expect(written).toEqual(["4", "0", "4", "4"]);
  });

  it("only fills the cells the shape occupies", () => {
    const cells = makeCells("T", ["4", "0", "4"]);
    expect(cells.flat().filter((v) => v !== null)).toHaveLength(4);
  });
});
