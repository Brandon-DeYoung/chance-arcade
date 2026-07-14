import { performance } from "node:perf_hooks";
import { createDefaultLevel } from "../app/default-level";
import {
  createBalls,
  createRuntimeTrack,
  positionWaitingBalls,
  releaseWaitingBalls,
  stepPhysics,
} from "../app/physics";

const runs = 5;
const steps = 120 * 30;
const times: number[] = [];
const level = createDefaultLevel();

for (let run = 0; run < runs; run += 1) {
  const balls = createBalls(100, level, () => 0.5);
  const track = createRuntimeTrack(level);
  positionWaitingBalls(balls, level, 1.75);
  releaseWaitingBalls(balls, level);
  const started = performance.now();
  for (let step = 0; step < steps; step += 1) {
    stepPhysics(balls, track, 1 / 120, step / 120);
  }
  times.push(performance.now() - started);
}

const sorted = [...times].sort((a, b) => a - b);
console.log(JSON.stringify({
  scenario: "100 marbles, 30 simulated seconds",
  runs,
  steps,
  milliseconds: times.map((time) => Number(time.toFixed(1))),
  medianMilliseconds: Number(sorted[Math.floor(sorted.length / 2)].toFixed(1)),
}, null, 2));
