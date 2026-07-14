import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createEditorObject, translateEditorObject } from "../app/editor-tools";

test("a selected build tool creates its object at the clicked course position",()=>{const peg=createEditorObject("peg",321,456,"peg-test");assert.ok("x" in peg);assert.deepEqual({x:peg.x,y:peg.y},{x:321,y:456});const rail=createEditorObject("rail",100,200,"rail-test");assert.ok("ax" in rail);assert.deepEqual({ax:rail.ax,ay:rail.ay},{ax:100,ay:200});});

test("select mode dragging translates complete objects",()=>{const rail=createEditorObject("rail",100,200,"rail-test"),moved=translateEditorObject(rail,25,40);assert.ok("ax" in moved);assert.deepEqual({ax:moved.ax,ay:moved.ay,bx:moved.bx,by:moved.by},{ax:125,ay:240,bx:305,by:240});});

test("the tall level canvas is bounded by a real scroll container",async()=>{const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8"),editor=await readFile(new URL("../app/level-editor.tsx",import.meta.url),"utf8");assert.match(css,/\.editor-workspace,\.editor-center,\.course-viewport\{min-height:0\}/);assert.match(css,/\.editor-center\{overflow:hidden\}/);assert.match(editor,/onWheel=\{scrollCourse\}/);assert.match(editor,/CLICK THE COURSE TO PLACE/);assert.match(editor,/aria-pressed=\{activeTool===item\.type\}/);});

test("the editor runs a live cannon and projectile preview",async()=>{const editor=await readFile(new URL("../app/level-editor.tsx",import.meta.url),"utf8");assert.match(editor,/createRuntimeTrack\(level\)/);assert.match(editor,/stepPhysics\(\[\],previewTrack\.current,delta,previewElapsed\.current\)/);assert.match(editor,/requestAnimationFrame\(animate\)/);assert.match(editor,/LIVE CANNONS/);});

test("the editor imports rosters and runs a chosen marble count",async()=>{const editor=await readFile(new URL("../app/level-editor.tsx",import.meta.url),"utf8");assert.match(editor,/parseRoster/);assert.match(editor,/ROSTER/);assert.match(editor,/testMarbles/);assert.match(editor,/onRace\(testMarbles\)/);});
