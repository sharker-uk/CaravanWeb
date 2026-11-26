const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const model=fs.readFileSync(path.join(__dirname,'../src/management-model.js'),'utf8');
const map=fs.readFileSync(path.join(__dirname,'../src/management-map.js'),'utf8');
test('beach access map marker is on public beach, not inland',()=>{
 assert.match(model,/p\.x=62;p\.y=24;p\.w=2;p\.h=2/);
 assert.match(map,/p\.type==='beach_gate'.*transform="translate/);
 assert.doesNotMatch(map,/M920 480H1000V520H920/);
});
test('beach purchase mechanics remain unchanged in this visual-only pass',()=>{
 const land=fs.readFileSync(path.join(__dirname,'../src/land-expansion.js'),'utf8');
 assert.match(land,/const BEACH=\{id:'beach'/);
 assert.match(land,/function beachQuote\(s\)/);
});
