const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const shell=fs.readFileSync(path.join(__dirname,'../src/management-shell.js'),'utf8');
const M=require('../src/living-park-movement.js');
test('E key searches four adjacent tiles even without selected interaction',()=>{
 assert.match(shell,/if\(key==='e'\)\{/);
 assert.match(shell,/\{x:p\.x,y:p\.y-1\}/);
 assert.match(shell,/\{x:p\.x\+1,y:p\.y\}/);
 assert.match(shell,/\{x:p\.x,y:p\.y\+1\}/);
 assert.match(shell,/\{x:p\.x-1,y:p\.y\}/);
 assert.match(shell,/api\.build\('clear',target,target\)/);
 assert.doesNotMatch(shell,/if\(key==='e'&&interaction\)/);
});
test('adjacency excludes diagonal and current tile, avoiding remote clearing',()=>{
 const p={x:10,y:10};
 for(const q of [{x:10,y:9},{x:11,y:10},{x:10,y:11},{x:9,y:10}])assert.equal(M.adjacent(p,q),true);
 for(const q of [{x:10,y:10},{x:11,y:11},{x:12,y:10}])assert.equal(M.adjacent(p,q),false);
});
