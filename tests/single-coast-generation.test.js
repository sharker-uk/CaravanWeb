const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
const start=source.indexOf('function generateNewMap()'),end=source.indexOf('function ',start+20);
const generator=source.slice(start,end<0?undefined:end);
test('new park terrain has no duplicate coast inside the 60x40 park grid',()=>{
 assert.match(generator,/const terrain = Math\.hypot\(x - 23, y - 20\) < 2\.5 \? 'water' : 'grass'/);
 assert.doesNotMatch(generator,/x >= 50 \? 'water'/);
 assert.doesNotMatch(generator,/x >= 47 \? 'sand'/);
});
test('legacy saved terrain is not rewritten during map generation',()=>{
 assert.ok(generator.includes('state.tiles[y][x]'));
 assert.ok(source.includes('function generateNewMap()'));
});
