const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const coast=require('../src/coastal-art.js');
test('organic coastline uses existing uploaded art and a curved shoreline',()=>{
 const svg=coast.render({shore:1200,top:-200,worldHeight:500,beachWidth:150});
 assert.match(svg,/mg-organic-coast/);assert.match(svg,/beach_main\.png/);assert.match(svg,/sea\.png/);assert.match(svg,/Grass003\.png/);
 assert.match(svg,/ Q/);assert.match(svg,/pointer-events="none"/);
 for(const name of ['beach_main.png','sea.png','Grass003.png'])assert.ok(fs.existsSync(path.join(__dirname,'../assets/source/nature',name)));
});
test('coast rendering is deterministic and rejects invalid geometry',()=>{
 const args={shore:1200,top:-200,worldHeight:500,beachWidth:150};
 assert.equal(coast.render(args),coast.render(args));
 assert.equal(coast.render({shore:NaN}), '');
});
test('renderer is loaded before the management map',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(html.indexOf('src/coastal-art.js')>=0&&html.indexOf('src/coastal-art.js')<html.indexOf('src/management-map.js'));
});
