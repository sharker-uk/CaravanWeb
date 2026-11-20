const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('../src/land-expansion.js'),P=require('../src/land-parcels.js');
const root=path.join(__dirname,'..');
const fresh=()=>({cash:13500,land:L.createState(true),landmarks:[],tiles:[],pitches:[],facilities:[],constructions:[],transactions:[]});
test('South Field test purchase charges once, adds external ownership, and survives restore',()=>{
 const s=fresh(),q=L.southFieldQuote(s);assert.equal(q.ok,true);assert.equal(q.price,6500);
 const tx=(amount,category,description)=>{s.cash+=amount;s.transactions.push({amount,category,description});return true;};
 const result=L.purchaseSouthFieldTest(s,tx);assert.equal(result.ok,true);
 assert.equal(s.cash,7000);assert.deepEqual(s.land.ownedPlotIds,['south_field']);
 assert.equal(P.canDevelopAt(s.land,14.5,42.5),true);
 assert.equal(P.canDevelopAt(s.land,40.5,42.5),false);
 const reloaded={...s,land:JSON.parse(JSON.stringify(L.restoreState(s)))};
 assert.equal(L.restoreState(reloaded).ownedPlotIds.includes('south_field'),true);
 assert.equal(L.southFieldQuote(reloaded).ok,false);
 assert.equal(L.purchaseSouthFieldTest(reloaded,tx).ok,false);
 assert.equal(s.transactions.length,1);
});
test('insufficient funds and rejected ledger transactions cannot grant ownership',()=>{
 const low=fresh();low.cash=6499;assert.equal(L.purchaseSouthFieldTest(low,()=>true).ok,false);
 assert.equal(low.land.ownedPlotIds.length,0);
 const rejected=fresh();assert.equal(L.purchaseSouthFieldTest(rejected,()=>false).ok,false);
 assert.equal(rejected.land.ownedPlotIds.length,0);
});
test('existing legacy Meadow and Dune ownership is preserved alongside external purchase',()=>{
 const s=fresh();s.land.ownedPlotIds=['meadow','dunes','south_field'];
 assert.deepEqual(L.restoreState(s).ownedPlotIds,['meadow','dunes','south_field']);
 assert.equal(L.getPlots(s).filter(p=>p.owned).length,2);
});
test('development grant is opt-in, limited to new farm, and logged in ledger',()=>{
 const bridge=fs.readFileSync(path.join(root,'src/management-bridge.js'),'utf8');
 assert.match(bridge,/get\('landTest'\)==='1'/);
 assert.match(bridge,/TEST_GRANT=12000/);
 assert.match(bridge,/Economy\.recordTransaction\(state,TEST_GRANT/);
 assert.match(bridge,/if\(mode==='new'\)applyLandTestCapital\(\)/);
 assert.match(bridge,/if\(!landTestEnabled\)return fail\('Development test is disabled/);
});
test('tablet exposes a dedicated estate agent test purchase, and parcels load first',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('src/land-parcels.js')<html.indexOf('src/land-expansion.js'));
 const shell=fs.readFileSync(path.join(root,'src/management-shell.js'),'utf8');
 assert.match(shell,/data-test-south-buy/);
 assert.match(shell,/api\.purchaseSouthFieldTest\(\)/);
});
