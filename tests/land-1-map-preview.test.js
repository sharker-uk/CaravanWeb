const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('external geometry loads before map renderer',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('src/land-parcels.js')>=0);
 assert.ok(html.indexOf('src/land-parcels.js')<html.indexOf('src/management-map.js'));
});
test('step 1 is display-only: no purchase or construction mutation',()=>{
 const map=fs.readFileSync(path.join(root,'src/management-map.js'),'utf8');
 assert.match(map,/function externalFieldPreview\(/);
 assert.match(map,/pointer-events="none"/);
 assert.match(map,/PREVIEW/);
 assert.doesNotMatch(map,/externalParcels\.purchasePlot/);
});
