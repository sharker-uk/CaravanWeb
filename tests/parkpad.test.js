const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('ParkPad loads after existing management engine and keeps original map mounted',()=>{
 const html=read('index.html');
 assert.ok(html.indexOf('src/management-shell.js')<html.indexOf('src/parkpad.js'));
 assert.match(html,/styles\/parkpad\.css/);
 const pad=read('src/parkpad.js');
 assert.match(pad,/querySelector\('#management-app'\)/);
 assert.match(pad,/data-parkpad-open/);
 assert.match(pad,/\.main-nav \[data-view=/);
 assert.match(pad,/window\.CaravanGame/);
 assert.match(pad,/caravan:ready/);
});
test('estate agent listings derive from all five authoritative external parcels',()=>{
 const pad=read('src/parkpad.js'),parcels=require('../src/land-parcels.js');
 assert.equal(parcels.PARCELS.length,5);
 assert.match(pad,/P\.PARCELS\.map\(p=>/);
 assert.match(pad,/P\.ownsParcel\(s\.land,p\.id\)/);
 assert.match(pad,/game\(\)\.purchaseSouthFieldTest\(\)/);
 assert.match(pad,/game\(\)\.southFieldQuote\(\)/);
 assert.doesNotMatch(pad,/LandExpansion\.purchasePlot/);
});
test('ParkPad preserves normal-mode restrictions and test purchase confirmation',()=>{
 const pad=read('src/parkpad.js');
 assert.match(pad,/landTestEnabled/);
 assert.match(pad,/window\.confirm/);
 assert.match(pad,/two-day conveyancing/);
 assert.match(pad,/game\(\)\.save\(\)/);
});
