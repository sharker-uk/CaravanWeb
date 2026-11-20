const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../src/field-art.js'),P=require('../src/land-parcels.js');
test('organic field geometry remains inside authoritative rectangular parcel extents',()=>{
 for(const p of P.PARCELS){
  const pts=A.polygon(p);
  assert.ok(pts.length>=7);
  for(const [x,y] of pts){assert.ok(x>=p.x-1e-9&&x<=p.x+p.w+1e-9);assert.ok(y>=p.y-1e-9&&y<=p.y+p.h+1e-9);}
  assert.ok(A.path(p,20).endsWith(' Z'));
 }
 assert.ok(P.validate());
});
test('field art is deterministic, non-interactive and includes an old barn only on South Field',()=>{
 const south=P.PARCELS.find(p=>p.id==='south_field'),north=P.PARCELS.find(p=>p.id==='north_field');
 const a=A.render(south),b=A.render(south);
 assert.equal(a,b);
 assert.match(a,/OLD BARN · FUTURE RENOVATION/);
 assert.doesNotMatch(A.render(north),/OLD BARN/);
 assert.match(a,/pointer-events="none"/);
 assert.match(a,/clipPath/);
 assert.match(a,/FOR SALE · PREVIEW/);
});
test('field art loads before management map',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(html.indexOf('src/field-art.js')>=0);
 assert.ok(html.indexOf('src/field-art.js')<html.indexOf('src/management-map.js'));
});
