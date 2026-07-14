import type { LevelObject, LevelObjectType } from "./level-types";

export function createEditorObject(type: LevelObjectType, x: number, y: number, id: string): LevelObject {
  if(type==="rail")return{id,ax:x,ay:y,bx:x+180,by:y,width:18,color:"#17b8b2"};
  if(type==="peg")return{id,x,y,radius:15,color:"#ffd052"};
  if(type==="bumper")return{id,x,y,radius:48,color:"#ff5b70",bounce:1.4,kick:450};
  if(type==="spinner")return{id,x,y,length:170,arms:4,speed:1.8};
  if(type==="cannon")return{id,x,y,minAngle:-Math.PI/2,maxAngle:-Math.PI/6,phase:0,delay:.2,interval:.6,speed:1080,distance:2700,color:"#7065dc"};
  return{id,x,y,text:"NEW SECTION"};
}

export function translateEditorObject(original: LevelObject, dx: number, dy: number): LevelObject {
  const object=structuredClone(original);
  if("ax" in object){object.ax+=dx;object.ay+=dy;object.bx+=dx;object.by+=dy;}else{object.x+=dx;object.y+=dy;}
  return object;
}

export function appendEditorObject<T extends {rails: LevelObject[];pegs: LevelObject[];spinners: LevelObject[];cannons: LevelObject[];labels: LevelObject[]}>(level:T,object:LevelObject){
  if("ax" in object)level.rails.push(object);else if("radius" in object)level.pegs.push(object);else if("arms" in object)level.spinners.push(object);else if("minAngle" in object)level.cannons.push(object);else level.labels.push(object);
}
