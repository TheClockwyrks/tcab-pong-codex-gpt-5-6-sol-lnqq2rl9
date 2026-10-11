import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { describe, expect, it } from "vitest";
import {
  FIELD_CY,
  FIELD_H,
  FIELD_W,
  HOLD_TIME,
  SERVE_SPEED,
} from "./constants";
import { BACKGROUND, game } from "./game";

function harness(step = 10) {
  const canvas = createCanvas(FIELD_W, FIELD_H);
  const events = new EventTarget();
  return createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: FIELD_W,
    height: FIELD_H,
    game,
    background: BACKGROUND,
    layout: "dual-vertical",
    clock: new ConstantClock(step),
    surface: {
      cssWidth: () => FIELD_W,
      cssHeight: () => FIELD_H,
      dpr: () => 1,
      events: () => events,
    },
  });
}

describe("Carom simulation", () => {
  it("initializes the complete title world and debug contract", async () => {
    const engine = harness();
    await engine.initialize();
    const snap = engine.debug.snapshot(engine.state);
    expect(snap).toMatchObject({
      version: 1,
      screen: "title",
      mode: "solo",
      score: { p1: 0, p2: 0 },
      receiver: "left",
      obstacleClock: 0,
    });
    expect(snap.ball).toMatchObject({
      x: FIELD_W / 2,
      y: FIELD_CY,
      held: true,
      holdTimer: HOLD_TIME,
      speed: 0,
    });
    expect(snap.obstacles).toHaveLength(2);
  });

  it("serves toward the receiver after a real-time countdown", async () => {
    const engine = harness(10);
    await engine.initialize();
    engine.apply((s) => engine.debug.setScreen(s, "countdown"));
    engine.apply((s) => engine.debug.setBallServeSign(s, 1));
    await engine.advance(100);
    const ball = engine.debug.snapshot(engine.state).ball;
    expect(engine.state.screen).toBe("playing");
    expect(ball?.held).toBe(false);
    expect(ball?.vx).toBeLessThan(0);
    expect(ball?.vy).toBeGreaterThan(0);
    expect(ball?.speed).toBeCloseTo(SERVE_SPEED, 6);
  });

  it("moves a driven paddle with clamping and leaves posed state immutable", async () => {
    const engine = harness(100);
    await engine.initialize();
    const before = engine.state;
    engine.apply((s) => engine.debug.setScreen(s, "countdown"));
    engine.apply((s) => engine.debug.setPaddleDriven(s, "left", true));
    engine.apply((s) => engine.debug.setPaddleVy(s, "left", 900));
    await engine.advance(10);
    expect(engine.state.paddles.left.cy).toBeLessThanOrEqual(FIELD_H - 55);
    expect(before.screen).toBe("title");
    expect(before.paddles.left.cy).toBe(FIELD_CY);
  });

  it("scores through the same playing update used in the browser", async () => {
    const engine = harness(4);
    await engine.initialize();
    engine.apply((s) => engine.debug.clearWorld(s));
    engine.apply((s) => engine.debug.spawnBall(s));
    engine.apply((s) => engine.debug.setScreen(s, "playing"));
    engine.apply((s) => engine.debug.setBallHeld(s, false));
    engine.apply((s) =>
      engine.debug.setBallPosition(s, FIELD_W + 20, FIELD_CY),
    );
    engine.apply((s) => engine.debug.setBallVelocity(s, 100, 0));
    await engine.advance(1);
    expect(engine.state.score).toEqual({ p1: 1, p2: 0 });
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.receiver).toBe("right");
    expect(engine.state.ball?.trail).toEqual([]);
  });
});
