const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Park Map uses the same CharacterSystem avatar as walking gameplay',()=>{
 const map=read('src/management-map.js'),game=read('src/main.js');
 assert.match(map,/CharacterSystem\.drawCharacter\(ctx,avatar/);
 assert.match(game,/CharacterSystem\.drawCharacter\(ctx, state\.playerAvatar/);
 assert.doesNotMatch(map,/sprites\.frameSvg\(/);
});
test('Builders no longer offers remote clearing or utility tools',()=>{
 const shell=read('src/management-shell.js');
 const builders=shell.slice(shell.indexOf('function renderBuild(state)'),shell.indexOf('function renderUtilities(state)'));
 assert.doesNotMatch(builders,/toolButton\('clear'/);
 assert.doesNotMatch(builders,/utility_/);
 assert.match(builders,/toolButton\('path'/);
 assert.match(builders,/toolButton\('road'/);
 const utilities=shell.slice(shell.indexOf('function renderUtilities(state)'),shell.indexOf('function panelHeader('));
 assert.match(utilities,/utility_/);
 assert.doesNotMatch(utilities,/toolButton\('clear'/);
 assert.doesNotMatch(utilities,/toolButton\('path'/);
});
test('Park Office is administration only and staffing is routed to Job Centre',()=>{
 const shell=read('src/management-shell.js');
 const office=shell.slice(shell.indexOf("if(app.view==='settings')"),shell.indexOf("if(html!==lastPanel)",shell.indexOf("if(app.view==='settings')")));
 assert.match(office,/data-parkpad-open="jobs"/);
 assert.doesNotMatch(office,/data-action="grounds"/);
 assert.doesNotMatch(office,/data-action="handyman"/);
 assert.doesNotMatch(office,/data-action="shovel"/);
 assert.match(office,/mg-export/);
 const pad=read('src/parkpad.js');
 assert.match(pad,/function renderJobs\(/);
 assert.match(pad,/Vacancy advertising is being developed/);
 assert.match(pad,/Place vacancy advert · Coming soon/);
});
