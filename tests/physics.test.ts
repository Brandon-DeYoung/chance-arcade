import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultLevel } from "../app/default-level";
import { BALL_RADIUS, createBalls, createRuntimeTrack, positionWaitingBalls, releaseWaitingBalls, stepPhysics, waitingRingLayout } from "../app/physics";
import { parseLevel } from "../app/level-types";

const seeded=(seed:number)=>{let value=seed;return()=>((value=value*16807%2147483647)-1)/2147483646;};

test("Tool Booth Classic preserves the imported default course",()=>{const level=createDefaultLevel();assert.equal(level.height,10500);assert.equal(level.finishY,10250);assert.equal(level.rails.length,33);assert.equal(level.pegs.length,239);assert.equal(level.spinners.length,6);assert.equal(level.cannons.length,8);assert.equal(level.pegs.filter((peg)=>peg.kick).length,13);assert.equal(level.rails.filter((rail)=>rail.platform).length,11);assert.ok(level.pegs.some((peg)=>peg.id==="bumper-179eeaab"&&peg.radius===90));});

test("100 waiting marbles use enough rings to avoid overlaps",()=>{const level=createDefaultLevel(),balls=createBalls(100,level,seeded(8675309)),rings=waitingRingLayout(100,level);assert.equal(rings.length,4);positionWaitingBalls(balls,level,1.75);for(let first=0;first<balls.length;first+=1)for(let second=first+1;second<balls.length;second+=1)assert.ok(Math.hypot(balls[first].x-balls[second].x,balls[first].y-balls[second].y)>=BALL_RADIUS*2,`marbles ${first} and ${second} overlap`);});

test("the default course produces a physics winner",()=>{const level=createDefaultLevel(),balls=createBalls(50,level,seeded(481516)),track=createRuntimeTrack(level);positionWaitingBalls(balls,level,1.75);releaseWaitingBalls(balls,level);for(let step=0;step<120*75&&!balls.some((ball)=>ball.finished);step+=1)stepPhysics(balls,track,1/120,step/120);assert.ok(balls.some((ball)=>ball.finished),"expected a marble to finish within 75 simulated seconds");});

test("exported level JSON imports without changing the course",()=>{const level=createDefaultLevel(),imported=parseLevel(JSON.stringify(level));assert.deepEqual(imported,level);});

test("level import rejects malformed, unsupported, and invalid object data",()=>{
  assert.throws(()=>parseLevel("{"),/valid JSON/i);
  assert.throws(()=>parseLevel(JSON.stringify({...createDefaultLevel(),version:2})),/unsupported/i);
  const duplicate=createDefaultLevel();duplicate.pegs[1].id=duplicate.pegs[0].id;assert.throws(()=>parseLevel(JSON.stringify(duplicate)),/duplicate level object id/i);
  const invalidCannon=createDefaultLevel();invalidCannon.cannons[0].interval=0;assert.throws(()=>parseLevel(JSON.stringify(invalidCannon)),/firing settings/i);
});

test("cannon distance controls how far a projectile travels",()=>{const shortLevel=createDefaultLevel();shortLevel.cannons=[{...shortLevel.cannons[0],delay:0,interval:100,distance:100}];const shortTrack=createRuntimeTrack(shortLevel);stepPhysics([],shortTrack,.1,0);assert.equal(shortTrack.projectiles.length,0);const longLevel=createDefaultLevel();longLevel.cannons=[{...longLevel.cannons[0],delay:0,interval:100,distance:1000}];const longTrack=createRuntimeTrack(longLevel);stepPhysics([],longTrack,.1,0);assert.equal(longTrack.projectiles.length,1);assert.equal(longTrack.projectiles[0].maxDistance,1000);});
