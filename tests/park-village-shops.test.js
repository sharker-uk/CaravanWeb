const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
test('new farm starts without off-site village businesses',()=>{const section=source.split('const STARTING_LANDMARKS = [')[1].split('];')[0];for(const type of ['rusty_resales','fiddl_shop','job_centre'])assert.doesNotMatch(section,new RegExp("type: '"+type+"'"));assert.match(section,/type: 'farmhouse'/);});
test('saved-game landmark migration strips village shops but preserves farm landmarks',()=>{assert.match(source,/state\.landmarks = \(Array\.isArray\(data\.landmarks\)/);assert.match(source,/\.filter\(item => !\['rusty_resales', 'fiddl_shop', 'job_centre'\]\.includes\(item\?\.type\)\)/);});

test('farmhouse sits beside western boundary and north of entrance drive',()=>{const section=source.split('const STARTING_LANDMARKS = [')[1].split('];')[0];assert.match(section,/type: 'farmhouse'[^\n]*x: 10, y: 18, w: 6, h: 5/);assert.match(source,/oldFarmhouse\.x=10;oldFarmhouse\.y=18/);});
