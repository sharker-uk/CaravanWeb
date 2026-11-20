const test=require('node:test');const assert=require('node:assert/strict');const C=require('../src/world-camera.js');
test('camera reveals village at roadside and retains park detail inland',()=>{const a=C.target({x:4,y:20}),b=C.target({x:30,y:20});assert.ok(a.zoom<b.zoom);assert.ok(a.x<80);assert.equal(b.region,'park');});
test('camera targets are finite and zoom stays positive',()=>{for(const x of [-10,0,8,30,80]){const t=C.target({x,y:20},{width:360,height:640});assert.ok([t.x,t.y,t.zoom].every(Number.isFinite));assert.ok(t.zoom>0);}});
test('smoothing is stable and converges without overshoot',()=>{const a={x:0,y:0,zoom:1},b={x:100,y:80,zoom:.4};const n=C.smooth(a,b,.016);assert.ok(n.x>0&&n.x<100);assert.ok(n.zoom<1&&n.zoom>.4);assert.deepEqual(C.smooth(a,b,0),a);});
