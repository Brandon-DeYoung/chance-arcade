import assert from "node:assert/strict";
import test from "node:test";
import { selectPositionBoard } from "../app/standings";

test("position board shows the top six before anyone finishes",()=>{
  assert.deepEqual(selectPositionBoard([], [1,2,3,4,5,6,7]), [1,2,3,4,5,6]);
});

test("position board keeps the podium and the next three approaching",()=>{
  assert.deepEqual(selectPositionBoard([1,2,3,4,5,6,7], [8,9,10,11]), [1,2,3,8,9,10]);
});

test("position board shows the three slowest as the race ends",()=>{
  const through48=Array.from({length:48},(_,index)=>index+1);
  const through49=Array.from({length:49},(_,index)=>index+1);
  const complete=Array.from({length:50},(_,index)=>index+1);
  assert.deepEqual(selectPositionBoard(through48, [49,50]), [1,2,3,48,49,50]);
  assert.deepEqual(selectPositionBoard(through49, [50]), [1,2,3,48,49,50]);
  assert.deepEqual(selectPositionBoard(complete, []), [1,2,3,48,49,50]);
});
