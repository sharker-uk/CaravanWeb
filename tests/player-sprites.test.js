const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sprites=require('../src/player-sprites.js');
const dir=path.join(__dirname,'../assets/player');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
test('all directions and default action frames exist with transparent SVG artwork',()=>{
 assert.deepEqual(sprites.directions,['down','left','right','up']);
 for(const [action,count] of Object.entries(sprites.frames))for(const direction of sprites.directions){
  const frames=manifest.animations[action+'_'+direction];
  assert.equal(frames.length,count);
  for(const [index,frame] of frames.entries()){
   assert.equal(frame.w,32);assert.equal(frame.h,32);
   assert.equal(frame.x,index*32);
   assert.match(sprites.frameSvg(direction,index,action),/<rect /);
  }
 }
});
test('sprite atlas is transparent and has correct grid dimensions',()=>{
 const atlas=fs.readFileSync(path.join(dir,manifest.image),'utf8');
 assert.match(atlas,/<svg[^>]+width="192"[^>]+height="768"/);
 assert.doesNotMatch(atlas,/<image |<foreignObject/);
 assert.equal(manifest.anchor.y,30);
});
test('living park loads the sprite module before the map',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(html.indexOf('src/player-sprites.js')<html.indexOf('src/management-map.js'));
});
