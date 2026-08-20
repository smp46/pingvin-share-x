// Pure game rules for the error page Tetris. Kept free of React and canvas
// so the mechanics can be tested on their own.

export const COLS = 10;
export const ROWS = 20;
export const NEXT_COUNT = 3;
export const LINES_PER_LEVEL = 10;
export const CLEAR_MS = 320;

// guideline scoring: single, double, triple, tetris
export const LINE_SCORE = [0, 100, 300, 500, 800];
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;

export type PieceType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
export type Matrix = (string | null)[][];
export type Cell = { color: string; digit: string } | null;
export type Board = Cell[][];

export const SHAPES: Record<PieceType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

export const PIECE_TYPES = Object.keys(SHAPES) as PieceType[];

// offsets tried in order when a rotation would overlap a wall or the stack
export const KICKS: [number, number][] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
];

export const emptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

// fills the shape with the digits of the error code, cycling through them.
// they live in the matrix itself so they rotate along with the piece.
export const makeCells = (type: PieceType, digits: string[]): Matrix => {
  let i = 0;
  return SHAPES[type].map((row) =>
    row.map((v) => (v ? digits[i++ % digits.length] : null)),
  );
};

export const rotateCW = (cells: Matrix): Matrix => {
  const n = cells.length;
  const out: Matrix = Array.from({ length: n }, () =>
    Array<string | null>(n).fill(null),
  );
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) out[x][n - 1 - y] = cells[y][x];
  }
  return out;
};

export const collides = (
  board: Board,
  cells: Matrix,
  px: number,
  py: number,
): boolean => {
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      if (!cells[y][x]) continue;
      const bx = px + x;
      const by = py + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
};

// returns the rotated matrix plus the kick that made it fit, or null
export const tryRotate = (
  board: Board,
  cells: Matrix,
  px: number,
  py: number,
): { cells: Matrix; x: number; y: number } | null => {
  const rotated = rotateCW(cells);
  for (const [dx, dy] of KICKS) {
    if (!collides(board, rotated, px + dx, py + dy)) {
      return { cells: rotated, x: px + dx, y: py + dy };
    }
  }
  return null;
};

export const findFullRows = (board: Board): number[] => {
  const rows: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    if (board[y].every((c) => c !== null)) rows.push(y);
  }
  return rows;
};

export const clearRows = (board: Board, rows: number[]): Board => {
  const kept = board.filter((_, y) => !rows.includes(y));
  while (kept.length < ROWS) kept.unshift(Array<Cell>(COLS).fill(null));
  return kept;
};

export const scoreForLines = (count: number, level: number): number =>
  (LINE_SCORE[count] ?? 0) * level;

export const levelForLines = (lines: number): number =>
  Math.floor(lines / LINES_PER_LEVEL) + 1;

// guideline gravity curve, about a second per row at level 1 and much
// faster later on. Floored so it never outruns the frame loop.
export const gravityMs = (level: number): number =>
  Math.max(Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000, 25);

export const shuffledBag = (): PieceType[] => {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
};

// bounding box of the filled cells, used to centre the next previews
export const bounds = (cells: Matrix) => {
  let minX = cells.length;
  let maxX = -1;
  let minY = cells.length;
  let maxY = -1;
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      if (!cells[y][x]) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, maxX, minY, maxY };
};

// black or white digits, whichever stays readable on the block colour
export const inkFor = (hex: string): string => {
  const c = hex.replace("#", "");
  if (c.length < 6) return "rgba(0,0,0,0.75)";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.9)";
};
