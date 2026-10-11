import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as K from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
  readonly theta: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly obstacleClock: number;
  readonly obstacleClockRunning: boolean;
  readonly simTime: number;
  readonly muted: boolean;
}
export interface MenuRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export type CaromSnapshot = Omit<CaromState, "ball"> & {
  readonly version: number;
  readonly ball: (BallState & { readonly speed: number }) | null;
};
export interface CaromDebugApi {
  readonly version: number;
  clearWorld(s: DeepReadonly<CaromState>): CaromState;
  spawnBall(s: DeepReadonly<CaromState>): CaromState;
  spawnObstacle(s: DeepReadonly<CaromState>, index: number): CaromState;
  reset(s: DeepReadonly<CaromState>): CaromState;
  reconcile(s: DeepReadonly<CaromState>): CaromState;
  setScreen(s: DeepReadonly<CaromState>, v: Screen): CaromState;
  setMode(s: DeepReadonly<CaromState>, v: Mode): CaromState;
  setMenuIndex(s: DeepReadonly<CaromState>, v: number): CaromState;
  setTitleIndex(s: DeepReadonly<CaromState>, v: number): CaromState;
  setResumeScreen(
    s: DeepReadonly<CaromState>,
    v: "countdown" | "playing",
  ): CaromState;
  setScore(s: DeepReadonly<CaromState>, p1: number, p2: number): CaromState;
  setWinner(s: DeepReadonly<CaromState>, v: Side | null): CaromState;
  setReceiver(s: DeepReadonly<CaromState>, v: Side): CaromState;
  setPaddleCy(s: DeepReadonly<CaromState>, side: Side, v: number): CaromState;
  setPaddleVy(s: DeepReadonly<CaromState>, side: Side, v: number): CaromState;
  setPaddleDriven(
    s: DeepReadonly<CaromState>,
    side: Side,
    v: boolean,
  ): CaromState;
  setBallPosition(
    s: DeepReadonly<CaromState>,
    x: number,
    y: number,
  ): CaromState;
  setBallVelocity(
    s: DeepReadonly<CaromState>,
    x: number,
    y: number,
  ): CaromState;
  setBallSpin(s: DeepReadonly<CaromState>, v: number): CaromState;
  setBallHeld(s: DeepReadonly<CaromState>, v: boolean): CaromState;
  setBallHoldTimer(s: DeepReadonly<CaromState>, v: number): CaromState;
  setBallServeSign(s: DeepReadonly<CaromState>, v: 1 | -1): CaromState;
  drawBallServeSign(s: DeepReadonly<CaromState>): CaromState;
  setAiTracking(s: DeepReadonly<CaromState>, v: boolean): CaromState;
  setAiMovement(s: DeepReadonly<CaromState>, v: boolean): CaromState;
  setMuted(s: DeepReadonly<CaromState>, v: boolean): CaromState;
  setObstacleClock(s: DeepReadonly<CaromState>, v: number): CaromState;
  setObstacleClockRunning(s: DeepReadonly<CaromState>, v: boolean): CaromState;
  snapshot(s: DeepReadonly<CaromState>): CaromSnapshot;
  menuItemRect(s: DeepReadonly<CaromState>, index: number): MenuRect | null;
}

export const BACKGROUND = "#07111f";
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number =>
  Math.max(a, Math.min(b, v));
const randomSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
function obstacle(index: number, t: number): ObstacleState {
  const c = K.OBSTACLE_CENTERS[index];
  if (!c) throw new RangeError(`Carom: obstacle index ${index} does not exist`);
  const sway =
    K.OBSTACLE_SWAY_AMP * Math.sin((TAU * t) / K.OBSTACLE_SWAY_PERIOD);
  return {
    index,
    cx: c.x,
    cy: c.y + (index === 0 ? sway : -sway),
    theta: K.OBSTACLE_SPIN_RATE * t,
  };
}
function parkedBall(): BallState {
  return {
    x: K.FIELD_CX,
    y: K.FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: K.HOLD_TIME,
    serveSign: randomSign(),
    trail: [],
  };
}
function initial(muted = false, titleIndex = 0, simTime = 0): CaromState {
  const paddle = (): PaddleState => ({
    cy: K.FIELD_CY,
    vy: 0,
    driven: false,
    drivenVy: 0,
  });
  return {
    screen: "title",
    mode: "solo",
    menuIndex: titleIndex,
    titleIndex,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: { left: paddle(), right: paddle() },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: parkedBall(),
    obstacles: [obstacle(0, 0), obstacle(1, 0)],
    obstacleClock: 0,
    obstacleClockRunning: true,
    simTime,
    muted,
  };
}
function copy(s: DeepReadonly<CaromState>): CaromState {
  return {
    ...s,
    score: { ...s.score },
    paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
    ai: { ...s.ai },
    ball:
      s.ball === null
        ? null
        : { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) },
    obstacles: s.obstacles.map((o) => ({ ...o })),
  };
}
function needBall(s: DeepReadonly<CaromState>): BallState {
  if (!s.ball) throw new Error("Carom: no ball is present");
  return { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) };
}
function ballPose(
  s: DeepReadonly<CaromState>,
  p: Partial<BallState>,
): CaromState {
  return { ...copy(s), ball: { ...needBall(s), ...p } };
}
function paddlePose(
  s: DeepReadonly<CaromState>,
  side: Side,
  p: Partial<PaddleState>,
): CaromState {
  return {
    ...copy(s),
    paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...p } },
  };
}
function count(screen: Screen): number {
  return screen === "title"
    ? 3
    : screen === "howto"
      ? 1
      : screen === "paused"
        ? 3
        : screen === "matchover"
          ? 2
          : 0;
}
function itemRect(screen: Screen, i: number): MenuRect | null {
  if (!Number.isInteger(i) || i < 0 || i >= count(screen)) return null;
  const w = screen === "howto" ? 280 : 360,
    h = 58;
  const y =
    screen === "title"
      ? 376
      : screen === "howto"
        ? 570
        : screen === "paused"
          ? 330
          : 410;
  return { x: K.FIELD_CX - w / 2, y: y + i * 72, w, h };
}
function surface(): CaromDebugApi {
  const set = <P extends keyof CaromState>(
    s: DeepReadonly<CaromState>,
    p: P,
    v: CaromState[P],
  ): CaromState => ({ ...copy(s), [p]: v });
  return {
    version: K.CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...copy(s), ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...copy(s), ball: parkedBall() }),
    spawnObstacle: (s, i) => ({
      ...copy(s),
      obstacles: [
        ...s.obstacles.filter((o) => o.index !== i).map((o) => ({ ...o })),
        obstacle(i, s.obstacleClock),
      ].sort((a, b) => a.index - b.index),
    }),
    reset: (s) => initial(s.muted),
    reconcile: (s) => ({
      ...copy(s),
      obstacles: s.obstacles.map((o) => obstacle(o.index, s.obstacleClock)),
    }),
    setScreen: (s, v) => set(s, "screen", v),
    setMode: (s, v) => set(s, "mode", v),
    setMenuIndex: (s, v) => set(s, "menuIndex", v),
    setTitleIndex: (s, v) => set(s, "titleIndex", v),
    setResumeScreen: (s, v) => set(s, "resumeScreen", v),
    setScore: (s, p1, p2) => ({ ...copy(s), score: { p1, p2 } }),
    setWinner: (s, v) => set(s, "winner", v),
    setReceiver: (s, v) => set(s, "receiver", v),
    setPaddleCy: (s, side, v) => paddlePose(s, side, { cy: v }),
    setPaddleVy: (s, side, v) => paddlePose(s, side, { drivenVy: v }),
    setPaddleDriven: (s, side, v) => paddlePose(s, side, { driven: v }),
    setBallPosition: (s, x, y) => ballPose(s, { x, y }),
    setBallVelocity: (s, vx, vy) => ballPose(s, { vx, vy }),
    setBallSpin: (s, v) => ballPose(s, { spin: v }),
    setBallHeld: (s, v) => ballPose(s, { held: v }),
    setBallHoldTimer: (s, v) => ballPose(s, { holdTimer: v }),
    setBallServeSign: (s, v) => ballPose(s, { serveSign: v }),
    drawBallServeSign: (s) => ballPose(s, { serveSign: randomSign() }),
    setAiTracking: (s, v) => ({ ...copy(s), ai: { ...s.ai, tracking: v } }),
    setAiMovement: (s, v) => ({ ...copy(s), ai: { ...s.ai, movement: v } }),
    setMuted: (s, v) => set(s, "muted", v),
    setObstacleClock: (s, v) => ({
      ...copy(s),
      obstacleClock: v,
      obstacles: s.obstacles.map((o) => obstacle(o.index, v)),
    }),
    setObstacleClockRunning: (s, v) => set(s, "obstacleClockRunning", v),
    snapshot: (s) => ({
      ...copy(s),
      version: K.CAROM_DEBUG_VERSION,
      ball:
        s.ball === null
          ? null
          : {
              ...s.ball,
              trail: s.ball.trail.map((p) => ({ ...p })),
              speed: Math.hypot(s.ball.vx, s.ball.vy),
            },
    }),
    menuItemRect: (s, i) => itemRect(s.screen, i),
  };
}

function integrate(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const raw = p.cy + vy * dt,
    cy = clamp(raw, K.PADDLE_MIN_CY, K.PADDLE_MAX_CY);
  return { ...p, cy, vy: dt > 0 && cy !== raw ? (cy - p.cy) / dt : vy };
}
function paddles(
  s: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  const value = (n: string): number => api.input.value(n);
  let lv =
    s.mode === "solo"
      ? (Math.max(value("p1-down"), value("p2-down")) -
          Math.max(value("p1-up"), value("p2-up"))) *
        K.PADDLE_SPEED
      : (value("p1-down") - value("p1-up")) * K.PADDLE_SPEED;
  let rv = (value("p2-down") - value("p2-up")) * K.PADDLE_SPEED;
  if (s.mode === "solo") {
    let target = K.AI_HOME_Y,
      zone = K.AI_HOME_DEADZONE;
    if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
      target = s.ball.y - s.ball.vy * K.AI_REACT;
      zone = K.AI_DEADZONE;
    }
    const d = target - s.paddles.right.cy;
    rv =
      !s.ai.movement || Math.abs(d) <= zone
        ? 0
        : Math.sign(d) *
          Math.min(K.AI_SPEED, dt > 0 ? Math.abs(d) / dt : K.AI_SPEED);
  }
  if (s.paddles.left.driven) lv = s.paddles.left.drivenVy;
  if (s.paddles.right.driven) rv = s.paddles.right.drivenVy;
  return {
    ...copy(s),
    paddles: {
      left: integrate(s.paddles.left, lv, dt),
      right: integrate(s.paddles.right, rv, dt),
    },
  };
}
interface Hits {
  wall: boolean;
  paddle: boolean;
  obstacle: boolean;
}
function hitPaddle(
  b: BallState,
  p: DeepReadonly<PaddleState>,
  x0: number,
  x1: number,
  dir: 1 | -1,
  hits: Hits,
): BallState {
  const y0 = p.cy - K.PADDLE_HALF,
    y1 = p.cy + K.PADDLE_HALF;
  if (!(
    b.x > x0 - K.BALL_R &&
    b.x < x1 + K.BALL_R &&
    b.y > y0 - K.BALL_R &&
    b.y < y1 + K.BALL_R
  ))
    return b;
  const ds = [
    b.x - x0 + K.BALL_R,
    x1 + K.BALL_R - b.x,
    b.y - y0 + K.BALL_R,
    y1 + K.BALL_R - b.y,
  ];
  const face = ds.indexOf(Math.min(...ds));
  if (face < 2) {
    const speed = Math.min(Math.hypot(b.vx, b.vy) * K.SPEED_MULT, K.SPEED_CAP),
      a = clamp((b.y - p.cy) / K.PADDLE_HALF, -1, 1) * K.MAX_BOUNCE_ANGLE;
    hits.paddle = true;
    return {
      ...b,
      x: dir === 1 ? K.P1_X1 + K.BALL_R : K.P2_X0 - K.BALL_R,
      vx: dir * speed * Math.cos(a),
      vy: speed * Math.sin(a),
      spin: clamp(
        b.spin + p.vy * K.SPIN_FROM_PADDLE,
        -K.SPIN_CLAMP,
        K.SPIN_CLAMP,
      ),
    };
  }
  hits.wall = true;
  return face === 2
    ? { ...b, y: y0 - K.BALL_R, vy: b.vy > 0 ? -b.vy : b.vy }
    : { ...b, y: y1 + K.BALL_R, vy: b.vy < 0 ? -b.vy : b.vy };
}
function hitObstacle(
  b: BallState,
  o: DeepReadonly<ObstacleState>,
  hits: Hits,
): BallState {
  const c = Math.cos(o.theta),
    sn = Math.sin(o.theta),
    dx = b.x - o.cx,
    dy = b.y - o.cy;
  const lx = dx * c + dy * sn,
    ly = -dx * sn + dy * c,
    qx = clamp(lx, -K.OBSTACLE_HW, K.OBSTACLE_HW),
    qy = clamp(ly, -K.OBSTACLE_HH, K.OBSTACLE_HH);
  let nx = lx - qx,
    ny = ly - qy;
  const d = Math.hypot(nx, ny);
  let push = K.BALL_R - d;
  if (d >= K.BALL_R) return b;
  if (d > 1e-9) {
    nx /= d;
    ny /= d;
  } else {
    const px = K.OBSTACLE_HW - Math.abs(lx),
      py = K.OBSTACLE_HH - Math.abs(ly);
    if (px <= py) {
      nx = lx >= 0 ? 1 : -1;
      ny = 0;
      push = K.BALL_R + px;
    } else {
      nx = 0;
      ny = ly >= 0 ? 1 : -1;
      push = K.BALL_R + py;
    }
  }
  const wx = nx * c - ny * sn,
    wy = nx * sn + ny * c,
    dot = b.vx * wx + b.vy * wy;
  if (dot < 0) {
    hits.obstacle = true;
    return {
      ...b,
      x: b.x + wx * push,
      y: b.y + wy * push,
      vx: b.vx - 2 * dot * wx,
      vy: b.vy - 2 * dot * wy,
    };
  }
  return { ...b, x: b.x + wx * push, y: b.y + wy * push };
}
function physics(
  s: DeepReadonly<CaromState>,
  dt: number,
): { state: CaromState; hits: Hits } {
  const hits = { wall: false, paddle: false, obstacle: false };
  if (!s.ball || s.ball.held) return { state: copy(s), hits };
  let b = needBall(s);
  const n = Math.max(
      1,
      Math.ceil((Math.hypot(b.vx, b.vy) * dt) / K.MAX_SUBSTEP),
    ),
    h = dt / n;
  for (let i = 0; i < n; i += 1) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const a = (b.spin / speed) * h,
        c = Math.cos(a),
        sn = Math.sin(a),
        vx = b.vx * c - b.vy * sn,
        vy = b.vx * sn + b.vy * c;
      b = { ...b, vx, vy };
    }
    b = {
      ...b,
      spin: b.spin * Math.pow(0.5, h / K.SPIN_HALFLIFE),
      x: b.x + b.vx * h,
      y: b.y + b.vy * h,
    };
    if (b.y - K.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: K.BALL_R, vy: -b.vy };
      hits.wall = true;
    } else if (b.y + K.BALL_R > K.FIELD_H && b.vy > 0) {
      b = { ...b, y: K.FIELD_H - K.BALL_R, vy: -b.vy };
      hits.wall = true;
    }
    b = hitPaddle(b, s.paddles.left, K.P1_X0, K.P1_X1, 1, hits);
    b = hitPaddle(b, s.paddles.right, K.P2_X0, K.P2_X1, -1, hits);
    for (const o of s.obstacles) b = hitObstacle(b, o, hits);
  }
  return { state: { ...copy(s), ball: b }, hits };
}
function start(s: DeepReadonly<CaromState>, mode: Mode): CaromState {
  const f = initial(s.muted, s.titleIndex, s.simTime);
  return {
    ...copy(s),
    screen: "countdown",
    mode,
    menuIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: f.paddles,
    receiver: "left",
    ball: f.ball,
    obstacles: f.obstacles,
    obstacleClock: 0,
    obstacleClockRunning: true,
  };
}
const title = (s: DeepReadonly<CaromState>): CaromState =>
  initial(s.muted, s.titleIndex, s.simTime);
function confirm(s: DeepReadonly<CaromState>): CaromState {
  if (s.screen === "title") {
    const n = { ...copy(s), titleIndex: s.menuIndex };
    return s.menuIndex === 0
      ? start(n, "solo")
      : s.menuIndex === 1
        ? start(n, "versus")
        : { ...n, screen: "howto", menuIndex: 0 };
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...copy(s), screen: s.resumeScreen }
      : s.menuIndex === 1
        ? start(s, s.mode)
        : title(s);
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? start(s, s.mode) : title(s);
  return copy(s);
}
const inside = (r: MenuRect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function input(s: DeepReadonly<CaromState>, api: UpdateApi): CaromState {
  const began = s.screen;
  let n = copy(s);
  if (
    (began === "countdown" || began === "playing") &&
    api.input.pressed("pause")
  )
    return { ...n, screen: "paused", resumeScreen: began, menuIndex: 0 };
  if (
    began === "paused" &&
    (api.input.pressed("pause") || api.input.pressed("back"))
  )
    return { ...n, screen: s.resumeScreen };
  if (
    began === "howto" &&
    (api.input.pressed("confirm") || api.input.pressed("back"))
  )
    return title(s);
  if (began === "matchover" && api.input.pressed("back")) return title(s);
  const total = count(began);
  if (!total) return n;
  const up = api.input.pressed("p1-up") || api.input.pressed("p2-up"),
    down = api.input.pressed("p1-down") || api.input.pressed("p2-down");
  if (up || down)
    n = { ...n, menuIndex: (n.menuIndex + (up ? -1 : 1) + total) % total };
  else if (api.input.pressed("confirm")) return confirm(n);
  let downItem: number | null = null,
    activate: number | null = null;
  for (const sample of api.input.pointerSamples()) {
    const item = Array.from({ length: total }, (_, i) => i).find((i) =>
      inside(itemRect(began, i)!, sample.x, sample.y),
    );
    if (item !== undefined) n = { ...n, menuIndex: item };
    if (sample.type === "down" && sample.button === "primary")
      downItem = item ?? null;
    if (
      sample.type === "up" &&
      sample.button === "primary" &&
      item === downItem
    )
      activate = item ?? null;
  }
  if (activate !== null) return confirm({ ...n, menuIndex: activate });
  const p = api.input.pointer();
  if (p.device !== "touch")
    for (let i = 0; i < total; i += 1)
      if (inside(itemRect(began, i)!, p.x, p.y)) n = { ...n, menuIndex: i };
  return n;
}
function update(
  s0: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  let s: CaromState = { ...copy(s0), simTime: s0.simTime + dt };
  let scored = false;
  if (api.input.pressed("mute")) s = { ...s, muted: !s.muted };
  if (s.muted !== api.audio.muted()) api.audio.setMuted(s.muted);
  s = input(s, api);
  if (s.screen !== "countdown" && s.screen !== "playing")
    return { ...s, muted: api.audio.muted() };
  s = paddles(s, api, dt);
  if (s.screen === "countdown" && s.ball) {
    const timer = s.ball.holdTimer - dt;
    if (timer <= 0) {
      const dir = s.receiver === "left" ? -1 : 1;
      s = {
        ...s,
        screen: "playing",
        ball: {
          ...s.ball,
          held: false,
          holdTimer: 0,
          trail: [],
          vx: dir * K.SERVE_SPEED * Math.cos(K.SERVE_ANGLE),
          vy: s.ball.serveSign * K.SERVE_SPEED * Math.sin(K.SERVE_ANGLE),
        },
      };
    } else
      s = {
        ...s,
        ball: { ...s.ball, x: K.FIELD_CX, y: K.FIELD_CY, holdTimer: timer },
      };
  } else if (s.screen === "playing") {
    const result = physics(s, dt);
    s = result.state;
    if (result.hits.wall) api.audio.play(K.CUES.wallBounce);
    if (result.hits.paddle) api.audio.play(K.CUES.paddleHit);
    if (result.hits.obstacle) api.audio.play(K.CUES.obstacleBounce);
    if (
      s.ball &&
      (s.ball.x - K.BALL_R > K.FIELD_W || s.ball.x + K.BALL_R < 0)
    ) {
      scored = true;
      const scorer: Side = s.ball.x > K.FIELD_W ? "left" : "right",
        score = {
          p1: s.score.p1 + (scorer === "left" ? 1 : 0),
          p2: s.score.p2 + (scorer === "right" ? 1 : 0),
        };
      api.audio.play(K.CUES.score);
      const won =
        (score.p1 >= K.WIN_SCORE && score.p1 - score.p2 >= K.WIN_LEAD) ||
        (score.p2 >= K.WIN_SCORE && score.p2 - score.p1 >= K.WIN_LEAD);
      s = won
        ? { ...s, score, winner: scorer, screen: "matchover", menuIndex: 0 }
        : {
            ...s,
            score,
            receiver: scorer === "left" ? "right" : "left",
            ball: parkedBall(),
            screen: "countdown",
          };
    }
  }
  if ((s.screen === "countdown" || s.screen === "playing") && s.ball && !scored)
    s = {
      ...s,
      ball: {
        ...s.ball,
        trail: [
          ...s.ball.trail,
          { x: s.ball.x, y: s.ball.y, t: s.simTime },
        ].filter((p) => p.t >= s.simTime - K.TRAIL_TIME),
      },
    };
  if (
    (s.screen === "countdown" || s.screen === "playing") &&
    s.obstacleClockRunning
  ) {
    const t = s.obstacleClock + dt;
    s = {
      ...s,
      obstacleClock: t,
      obstacles: s.obstacles.map((o) => obstacle(o.index, t)),
    };
  }
  return { ...s, muted: api.audio.muted() };
}

function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function label(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color = "#eaf7ff",
  align: CanvasTextAlign = "center",
): void {
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}
function field(
  s: DeepReadonly<CaromState>,
  ctx: CanvasRenderingContext2D,
  dim: boolean,
): void {
  ctx.save();
  if (dim) ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "rgba(126,203,255,.22)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 18]);
  ctx.beginPath();
  ctx.moveTo(K.NET_X, 72);
  ctx.lineTo(K.NET_X, K.FIELD_H - 34);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.theta);
    ctx.shadowColor = "#ffb84d";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ffb84d";
    round(
      ctx,
      -K.OBSTACLE_W / 2,
      -K.OBSTACLE_H / 2,
      K.OBSTACLE_W,
      K.OBSTACLE_H,
      10,
    );
    ctx.restore();
  }
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#29e7cd";
  ctx.fillStyle = "#29e7cd";
  round(
    ctx,
    K.P1_X0,
    s.paddles.left.cy - K.PADDLE_HALF,
    K.PADDLE_W,
    K.PADDLE_H,
    8,
  );
  ctx.shadowColor = "#ff4f91";
  ctx.fillStyle = "#ff4f91";
  round(
    ctx,
    K.P2_X0,
    s.paddles.right.cy - K.PADDLE_HALF,
    K.PADDLE_W,
    K.PADDLE_H,
    8,
  );
  ctx.shadowBlur = 0;
  if (s.ball) {
    s.ball.trail.forEach((p, i) => {
      ctx.globalAlpha = dim ? 0.25 : ((i + 1) / s.ball!.trail.length) * 0.45;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, K.BALL_R * ((i + 1) / s.ball!.trail.length), 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = dim ? 0.25 : 1;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, K.BALL_R, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
function menu(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  items: readonly string[],
  selected: number,
): void {
  items.forEach((item, i) => {
    const r = itemRect(screen, i)!;
    ctx.fillStyle =
      i === selected ? "rgba(41,231,205,.18)" : "rgba(255,255,255,.035)";
    ctx.strokeStyle = i === selected ? "#29e7cd" : "rgba(255,255,255,.12)";
    ctx.lineWidth = 2;
    round(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.stroke();
    label(
      ctx,
      item,
      K.FIELD_CX,
      r.y + r.h / 2,
      22,
      i === selected ? "#fff" : "#8ba2b5",
    );
  });
}
function render(s: DeepReadonly<CaromState>, api: RenderApi): void {
  const ctx = api.ctx,
    hasMenu = ["title", "howto", "paused", "matchover"].includes(s.screen);
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
  field(s, ctx, hasMenu);
  if (["countdown", "playing", "paused"].includes(s.screen)) {
    label(ctx, String(s.score.p1), K.FIELD_CX - 92, 58, 42, "#29e7cd");
    label(ctx, String(s.score.p2), K.FIELD_CX + 92, 58, 42, "#ff4f91");
    label(
      ctx,
      s.mode === "solo" ? "SOLO // HUMAN VS CIRCUIT" : "VERSUS // LOCAL DUEL",
      K.FIELD_CX,
      K.FIELD_H - 28,
      15,
      "#66859a",
    );
  }
  if (s.screen === "title") {
    label(ctx, K.TITLE_TEXT, K.FIELD_CX, 180, 92);
    label(
      ctx,
      "SPIN THE ANGLE. BANK THE SHOT.",
      K.FIELD_CX,
      250,
      17,
      "#7e9bb0",
    );
    menu(ctx, s.screen, K.TITLE_ITEMS, s.menuIndex);
  } else if (s.screen === "howto") {
    label(ctx, "HOW TO PLAY", K.FIELD_CX, 105, 44);
    label(ctx, "W / S", 320, 210, 26, "#29e7cd");
    label(ctx, "LEFT PADDLE", 320, 250, 16, "#8ba2b5");
    label(ctx, "↑ / ↓", 960, 210, 26, "#ff4f91");
    label(ctx, "RIGHT PADDLE", 960, 250, 16, "#8ba2b5");
    label(
      ctx,
      "Move as you strike to bend the ball with spin.",
      K.FIELD_CX,
      345,
      22,
    );
    label(
      ctx,
      "Curve around rotating bars—or bank hard off their faces.",
      K.FIELD_CX,
      392,
      18,
      "#9bb3c4",
    );
    label(
      ctx,
      "First to 11, win by 2  •  P / ESC pauses  •  M mutes",
      K.FIELD_CX,
      465,
      16,
      "#6f8da2",
    );
    menu(ctx, s.screen, ["BACK TO MENU"], s.menuIndex);
  } else if (s.screen === "countdown")
    label(
      ctx,
      String(Math.max(1, Math.ceil(s.ball?.holdTimer ?? 0))),
      K.FIELD_CX,
      K.FIELD_CY - 72,
      58,
    );
  else if (s.screen === "paused") {
    ctx.fillStyle = "rgba(3,9,17,.70)";
    ctx.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
    label(ctx, "PAUSED", K.FIELD_CX, 220, 48);
    menu(ctx, s.screen, K.PAUSE_ITEMS, s.menuIndex);
  } else if (s.screen === "matchover") {
    ctx.fillStyle = "rgba(3,9,17,.75)";
    ctx.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
    label(
      ctx,
      `${s.winner === "left" ? "PLAYER ONE" : s.mode === "solo" ? "CIRCUIT" : "PLAYER TWO"} WINS`,
      K.FIELD_CX,
      190,
      48,
      s.winner === "left" ? "#29e7cd" : "#ff4f91",
    );
    label(ctx, `${s.score.p1}  —  ${s.score.p2}`, K.FIELD_CX, 270, 42);
    menu(ctx, s.screen, K.MATCHOVER_ITEMS, s.menuIndex);
  }
  if (s.muted) label(ctx, "MUTED", K.FIELD_W - 28, 24, 13, "#70889a", "right");
}

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>): [CaromState, CaromDebugApi] {
    for (const a of K.ACTIONS)
      api.input.register(a, { keys: [...K.BINDINGS[a]] });
    api.audio.define(K.CUES.paddleHit, {
      wave: "square",
      freq: 280,
      freqTo: 620,
      gain: 0.13,
      durationMs: 55,
    });
    api.audio.define(K.CUES.wallBounce, {
      wave: "triangle",
      freq: 390,
      freqTo: 260,
      gain: 0.1,
      durationMs: 45,
    });
    api.audio.define(K.CUES.obstacleBounce, {
      wave: "sawtooth",
      freq: 170,
      freqTo: 360,
      gain: 0.09,
      durationMs: 70,
    });
    api.audio.define(K.CUES.score, {
      wave: "sine",
      freq: 520,
      freqTo: 880,
      gain: 0.15,
      durationMs: 180,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("score", (s) => `${s.score.p1}-${s.score.p2}`);
    api.diagnostics.register("ball pos", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
    );
    api.diagnostics.register("ball vel", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
    );
    api.diagnostics.register("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy).toFixed(1) : "0",
    );
    api.diagnostics.register(
      "ball spin",
      (s) => s.ball?.spin.toFixed(1) ?? "none",
    );
    api.diagnostics.register(
      "left paddle",
      (s) =>
        `${s.paddles.left.cy.toFixed(1)} / ${s.paddles.left.vy.toFixed(1)}`,
    );
    api.diagnostics.register(
      "right paddle",
      (s) =>
        `${s.paddles.right.cy.toFixed(1)} / ${s.paddles.right.vy.toFixed(1)}`,
    );
    return [initial(), surface()];
  },
  update,
  render,
};
