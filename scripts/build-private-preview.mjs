import {cpSync,existsSync,mkdirSync,rmSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd(),output=path.join(root,'dist');
rmSync(output,{recursive:true,force:true});mkdirSync(output,{recursive:true});
for(const name of ['index.html','walkabout.html','src','styles','assets'])cpSync(path.join(root,name),path.join(output,name),{recursive:true});
// A private Site may retain the first explorer for side-by-side review.
if(existsSync(path.join(root,'explorer')))cpSync(path.join(root,'explorer'),path.join(output,'explorer'),{recursive:true});
console.log('Static management game prepared in dist/.');
