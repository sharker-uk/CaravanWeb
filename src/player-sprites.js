/* CaravanWeb LP-1.2: deterministic, transparent 32x32 pixel-character frames. */
(function(root){
'use strict';
function frameSvg(direction="down",frame=0,action="walk",palette={}){
 const c={skin:"#e8b78f",hair:"#67412c",top:"#b84d3f",trousers:"#34495e",boots:"#433b32",outline:"#423b36",...palette};
 const out=[],r=(x,y,w,h,fill)=>out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
 const side=direction==="left"||direction==="right",back=direction==="up",step=action==="walk"?(frame%4===1?2:frame%4===3?-2:0):0;
 const swing=action==="chop"&&frame%6>=1&&frame%6<=3,tool=action==="chop"||action==="dig"||action==="mine";
 r(9,29,14,2,"#334b3a44");
 r(11,23,4,6,c.trousers);r(18,23,4,6,c.trousers);
 r(10,27+Math.max(0,step),5,3,c.boots);r(18,27+Math.max(0,-step),5,3,c.boots);
 r(9,16,14,9,c.outline);r(10,16,12,8,c.top);r(15,17,2,6,"#e9c6a644");
 r(7,17+(swing?-4:0),3,7,c.top);r(22,17+(swing?-5:0),3,7,c.top);
 r(7,23+(swing?-4:0),3,3,c.skin);r(22,23+(swing?-5:0),3,3,c.skin);
 r(12,8,9,9,c.skin);r(11,9,2,6,c.skin);
 if(side){r(direction==="left"?12:19,12,2,2,c.outline);}
 else if(!back){r(13,12,2,2,c.outline);r(19,12,2,2,c.outline);r(16,15,2,1,"#b67c65");}
 r(11,6,11,4,c.hair);r(10,9,3,5,c.hair);if(back)r(11,10,11,6,c.hair);
 if(tool){const lift=swing?2:14; r(24,lift,2,13,"#9a7249");r(21,lift-2,8,4,"#aeb8b7");r(21,lift-2,3,4,"#e1e4d9");}
 if(action==="carry"){for(let i=0;i<3;i++){r(20,17+i*3,10,3,"#92633b");r(27,18+i*3,2,1,"#e0b679");}}
 return out.join("");
}
const directions=['down','left','right','up'];
const frames={walk:4,idle:1,chop:6,dig:4,mine:4,carry:1};
const defaultPalette=Object.freeze({skin:'#e8b78f',hair:'#67412c',top:'#b84d3f',trousers:'#34495e'});
const api={width:32,height:32,directions,frames,defaultPalette,frameSvg};
root.CaravanPlayerSprites=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
