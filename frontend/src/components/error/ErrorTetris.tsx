import {
  Box,
  Button,
  createStyles,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  Board,
  CLEAR_MS,
  COLS,
  HARD_DROP_POINTS,
  Matrix,
  NEXT_COUNT,
  PieceType,
  ROWS,
  SOFT_DROP_POINTS,
  bounds,
  clearRows,
  collides,
  emptyBoard,
  findFullRows,
  gravityMs,
  inkFor,
  levelForLines,
  makeCells,
  scoreForLines,
  shuffledBag,
  tryRotate,
} from "./tetris";

type Status = "idle" | "playing" | "over";

type Piece = {
  type: PieceType;
  cells: Matrix;
  color: string;
  x: number;
  y: number;
};

type Game = {
  board: Board;
  piece: Piece | null;
  queue: PieceType[];
  bag: PieceType[];
  status: Status;
  score: number;
  lines: number;
  level: number;
  dropTimer: number;
  clearing: { rows: number[]; elapsed: number } | null;
};

const useStyles = createStyles((theme) => ({
  wrapper: {
    display: "flex",
    gap: theme.spacing.xl,
    justifyContent: "center",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  boardWrap: {
    position: "relative",
    lineHeight: 0,
  },
  canvas: {
    borderRadius: theme.radius.md,
    border: `1px solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    lineHeight: 1.4,
    textAlign: "center",
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor:
      theme.colorScheme === "dark"
        ? "rgba(0,0,0,0.62)"
        : "rgba(255,255,255,0.78)",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.sm,
    minWidth: 120,
  },
  statLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
}));

const ErrorTetris = ({ digits = ["4", "0", "4"] }: { digits?: string[] }) => {
  const { classes } = useStyles();
  const theme = useMantineTheme();
  const isSmall = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

  const cell = isSmall ? 17 : 25;
  const nextCell = Math.round(cell * 0.55);

  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const rafRef = useRef<number>();
  const lastRef = useRef(0);

  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);

  const dark = theme.colorScheme === "dark";
  const shade = dark ? 5 : 6;
  const palette = theme.colors;

  // block colours come straight from the site palette, so a custom primary
  // colour or a theme switch carries through to the game
  const colors = {
    boardBg: dark ? palette.dark[7] : palette.gray[0],
    grid: dark ? palette.dark[5] : palette.gray[2],
    piece: {
      I: palette.cyan[shade],
      J: palette.blue[shade],
      L: palette.orange[shade],
      O: palette.yellow[shade],
      S: palette.green[shade],
      T: palette.grape[shade],
      Z: palette.red[shade],
    } as Record<PieceType, string>,
  };
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  const digitsRef = useRef(digits);
  digitsRef.current = digits;

  const makePiece = useCallback((type: PieceType): Piece => {
    const cells = makeCells(type, digitsRef.current);
    return {
      type,
      cells,
      color: colorsRef.current.piece[type],
      x: Math.floor((COLS - cells.length) / 2),
      y: type === "I" ? -1 : 0,
    };
  }, []);

  const pull = useCallback((g: Game): PieceType => {
    if (g.bag.length === 0) g.bag = shuffledBag();
    return g.bag.pop() as PieceType;
  }, []);

  const spawn = useCallback(
    (g: Game) => {
      const type = g.queue.shift() as PieceType;
      g.queue.push(pull(g));
      const piece = makePiece(type);
      g.piece = piece;
      // no room for the new piece means top out
      if (collides(g.board, piece.cells, piece.x, piece.y)) g.status = "over";
    },
    [makePiece, pull],
  );

  const lock = useCallback(
    (g: Game) => {
      const p = g.piece;
      if (!p) return;
      for (let y = 0; y < p.cells.length; y++) {
        for (let x = 0; x < p.cells[y].length; x++) {
          const d = p.cells[y][x];
          if (!d) continue;
          const by = p.y + y;
          const bx = p.x + x;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            g.board[by][bx] = { color: p.color, digit: d };
          }
        }
      }
      g.piece = null;

      const full = findFullRows(g.board);
      if (full.length > 0) {
        g.clearing = { rows: full, elapsed: 0 };
      } else {
        spawn(g);
      }
    },
    [spawn],
  );

  const finishClear = useCallback(
    (g: Game) => {
      const cleared = g.clearing;
      if (!cleared) return;
      g.board = clearRows(g.board, cleared.rows);
      g.score += scoreForLines(cleared.rows.length, g.level);
      g.lines += cleared.rows.length;
      g.level = levelForLines(g.lines);
      g.clearing = null;
      spawn(g);
    },
    [spawn],
  );

  const step = useCallback(
    (g: Game) => {
      const p = g.piece;
      if (!p) return;
      if (!collides(g.board, p.cells, p.x, p.y + 1)) p.y += 1;
      else lock(g);
    },
    [lock],
  );

  const blockPainter = useCallback(
    (ctx: CanvasRenderingContext2D, size: number) => {
      const radius = Math.max(2, Math.round(size * 0.16));
      const font = `bold ${Math.round(size * 0.58)}px ${theme.fontFamilyMonospace}`;
      // roundRect is missing on older Safari, square blocks are fine there
      const rounded = typeof ctx.roundRect === "function";
      return (
        px: number,
        py: number,
        color: string,
        digit: string,
        alpha = 1,
      ) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        if (rounded) {
          ctx.beginPath();
          ctx.roundRect(px + 1, py + 1, size - 2, size - 2, radius);
          ctx.fill();
        } else {
          ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
        }
        ctx.fillStyle = inkFor(color);
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(digit, px + size / 2, py + size / 2 + size * 0.04);
        ctx.globalAlpha = 1;
      };
    },
    [theme.fontFamilyMonospace],
  );

  const draw = useCallback(() => {
    const canvas = boardRef.current;
    const g = gameRef.current;
    if (!canvas || !g) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const c = colorsRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = COLS * cell;
    const h = ROWS * cell;

    ctx.fillStyle = c.boardBg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, h);
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(w, y * cell + 0.5);
    }
    ctx.stroke();

    const paint = blockPainter(ctx, cell);
    const clearing = g.clearing;
    const progress = clearing ? clearing.elapsed / CLEAR_MS : 0;

    for (let y = 0; y < ROWS; y++) {
      const fading = clearing?.rows.includes(y) ?? false;
      for (let x = 0; x < COLS; x++) {
        const data = g.board[y][x];
        if (!data) continue;
        paint(x * cell, y * cell, data.color, data.digit, fading ? 1 - progress : 1);
      }
      if (fading) {
        ctx.globalAlpha = (1 - progress) * 0.5;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, y * cell, w, cell);
        ctx.globalAlpha = 1;
      }
    }

    const p = g.piece;
    if (p && !clearing) {
      for (let y = 0; y < p.cells.length; y++) {
        for (let x = 0; x < p.cells[y].length; x++) {
          const d = p.cells[y][x];
          if (!d) continue;
          const by = p.y + y;
          if (by < 0) continue;
          paint((p.x + x) * cell, by * cell, p.color, d);
        }
      }
    }
  }, [blockPainter, cell]);

  const drawNext = useCallback(() => {
    const canvas = nextRef.current;
    const g = gameRef.current;
    if (!canvas || !g) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const c = colorsRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const boxW = 4 * nextCell;
    const boxH = 3 * nextCell;
    const gap = 6;
    ctx.clearRect(0, 0, boxW, NEXT_COUNT * (boxH + gap));

    const paint = blockPainter(ctx, nextCell);

    g.queue.slice(0, NEXT_COUNT).forEach((type, index) => {
      const cells = makeCells(type, digitsRef.current);
      const b = bounds(cells);
      const pw = (b.maxX - b.minX + 1) * nextCell;
      const ph = (b.maxY - b.minY + 1) * nextCell;
      const originX = (boxW - pw) / 2;
      const originY = index * (boxH + gap) + (boxH - ph) / 2;

      for (let y = b.minY; y <= b.maxY; y++) {
        for (let x = b.minX; x <= b.maxX; x++) {
          const d = cells[y][x];
          if (!d) continue;
          paint(
            originX + (x - b.minX) * nextCell,
            originY + (y - b.minY) * nextCell,
            c.piece[type],
            d,
          );
        }
      }
    });
  }, [blockPainter, nextCell]);

  const start = useCallback(() => {
    const g: Game = {
      board: emptyBoard(),
      piece: null,
      queue: [],
      bag: [],
      status: "playing",
      score: 0,
      lines: 0,
      level: 1,
      dropTimer: 0,
      clearing: null,
    };
    for (let i = 0; i < NEXT_COUNT + 1; i++) g.queue.push(pull(g));
    gameRef.current = g;
    spawn(g);
    setScore(0);
    setLines(0);
    setLevel(1);
    setStatus("playing");
    lastRef.current = performance.now();
  }, [pull, spawn]);

  // size both canvases for the current pixel ratio and seed an idle board
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const board = boardRef.current;
    if (board) {
      board.width = COLS * cell * dpr;
      board.height = ROWS * cell * dpr;
      board.style.width = `${COLS * cell}px`;
      board.style.height = `${ROWS * cell}px`;
    }
    const next = nextRef.current;
    if (next) {
      const boxW = 4 * nextCell;
      const boxH = NEXT_COUNT * (3 * nextCell + 6);
      next.width = boxW * dpr;
      next.height = boxH * dpr;
      next.style.width = `${boxW}px`;
      next.style.height = `${boxH}px`;
    }
    if (!gameRef.current) {
      const g: Game = {
        board: emptyBoard(),
        piece: null,
        queue: [],
        bag: [],
        status: "idle",
        score: 0,
        lines: 0,
        level: 1,
        dropTimer: 0,
        clearing: null,
      };
      for (let i = 0; i < NEXT_COUNT + 1; i++) g.queue.push(pull(g));
      gameRef.current = g;
    }
    draw();
    drawNext();
  }, [cell, nextCell, draw, drawNext, pull]);

  useEffect(() => {
    const loop = (now: number) => {
      const g = gameRef.current;
      const dt = Math.min(now - lastRef.current, 250);
      lastRef.current = now;

      if (g && g.status === "playing") {
        if (g.clearing) {
          g.clearing.elapsed += dt;
          if (g.clearing.elapsed >= CLEAR_MS) finishClear(g);
        } else {
          g.dropTimer += dt;
          const speed = gravityMs(g.level);
          while (g.dropTimer >= speed && !g.clearing && g.status === "playing") {
            g.dropTimer -= speed;
            step(g);
          }
        }

        if (g.score !== score) setScore(g.score);
        if (g.lines !== lines) setLines(g.lines);
        if (g.level !== level) setLevel(g.level);
        if (g.status !== "playing") setStatus(g.status);
      }

      draw();
      drawNext();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, drawNext, finishClear, step, score, lines, level]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current;

      if (e.key === "Enter") {
        // leave Enter alone when a link or button has focus
        const tag = document.activeElement?.tagName;
        if (tag === "BUTTON" || tag === "A" || tag === "INPUT") return;
        if (!g || g.status !== "playing") {
          e.preventDefault();
          start();
        }
        return;
      }

      if (!g || g.status !== "playing" || g.clearing) return;
      const p = g.piece;
      if (!p) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (!collides(g.board, p.cells, p.x - 1, p.y)) p.x -= 1;
          break;
        case "ArrowRight":
          e.preventDefault();
          if (!collides(g.board, p.cells, p.x + 1, p.y)) p.x += 1;
          break;
        case "ArrowUp": {
          e.preventDefault();
          const kicked = tryRotate(g.board, p.cells, p.x, p.y);
          if (kicked) {
            p.cells = kicked.cells;
            p.x = kicked.x;
            p.y = kicked.y;
          }
          break;
        }
        case "ArrowDown":
          e.preventDefault();
          if (!collides(g.board, p.cells, p.x, p.y + 1)) {
            p.y += 1;
            g.score += SOFT_DROP_POINTS;
            g.dropTimer = 0;
          }
          break;
        case " ":
        case "Spacebar": {
          e.preventDefault();
          let dropped = 0;
          while (!collides(g.board, p.cells, p.x, p.y + 1)) {
            p.y += 1;
            dropped++;
          }
          g.score += dropped * HARD_DROP_POINTS;
          lock(g);
          g.dropTimer = 0;
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lock, start]);

  const stat = (id: string, value: number) => (
    <Box>
      <Text size="xs" color="dimmed" className={classes.statLabel}>
        <FormattedMessage id={id} />
      </Text>
      <Text size="lg" weight={700}>
        {value}
      </Text>
    </Box>
  );

  return (
    <Box className={classes.wrapper}>
      <Box className={classes.boardWrap}>
        <canvas ref={boardRef} className={classes.canvas} />
        {status !== "playing" && (
          <Box className={classes.overlay}>
            <Text weight={700}>
              <FormattedMessage
                id={status === "over" ? "404.tetris.over" : "404.tetris.title"}
              />
            </Text>
            {status === "over" && (
              <Text size="sm" color="dimmed">
                <FormattedMessage id="404.tetris.score" /> {score}
              </Text>
            )}
            <Button size="xs" mt="xs" onClick={start}>
              <FormattedMessage
                id={status === "over" ? "404.tetris.again" : "404.tetris.start"}
              />
            </Button>
          </Box>
        )}
      </Box>

      <Box className={classes.panel}>
        <Box>
          <Text size="xs" color="dimmed" className={classes.statLabel} mb={4}>
            <FormattedMessage id="404.tetris.next" />
          </Text>
          <canvas ref={nextRef} />
        </Box>
        {stat("404.tetris.score", score)}
        {stat("404.tetris.level", level)}
        {stat("404.tetris.lines", lines)}
        <Text size="xs" color="dimmed">
          <FormattedMessage id="404.tetris.controls" />
        </Text>
      </Box>
    </Box>
  );
};

export default ErrorTetris;
