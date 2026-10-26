import fs from 'node:fs';
const INK='#2B1A12', SKIN='#F3CBA2', SKIN2='#E2A97F', CREAM='#F4E8C8', MUST='#E8A92B', ORG='#D9622B', BRICK='#B8352A', TURQ='#2E8C8C', NAVY='#1E2F4A', OLIVE='#7A8B3A', PLUM='#6A3D6E', NIGHT='#181640';
const attrs = (base, extra) => { const m = {}; for (const [,k,v] of (base+' '+extra).matchAll(/([\w-]+)="([^"]*)"/g)) m[k]=v; return Object.entries(m).map(([k,v])=>`${k}="${v}"`).join(' '); };
const o = (fill, extra='') => attrs(`fill="${fill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`, extra);
const ln = (extra='') => attrs(`fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`, extra);

// ---------- Mambo (shared face) ----------
function face(cx, cy, {lip=BRICK, glasses=null, mask=false}={}) {
  const L=cx-17, R=cx+17, ey=cy+2;
  let s='';
  s+=`<ellipse cx="${cx}" cy="${cy}" rx="38" ry="44" ${o(SKIN)}/>`;
  s+=`<ellipse cx="${cx-24}" cy="${cy+16}" rx="8" ry="5" fill="${ORG}" opacity=".35"/><ellipse cx="${cx+24}" cy="${cy+16}" rx="8" ry="5" fill="${ORG}" opacity=".35"/>`;
  // eyes: half-lidded, almond
  for (const [x,dir] of [[L,-1],[R,1]]) {
    s+=`<path d="M${x-12} ${ey} Q${x} ${ey-9} ${x+12} ${ey} Q${x} ${ey+8} ${x-12} ${ey}Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    s+=`<circle cx="${x+dir*1+2}" cy="${ey}" r="5.2" fill="${TURQ}" stroke="${INK}" stroke-width="2"/><circle cx="${x+dir*1+2}" cy="${ey}" r="2.2" fill="${INK}"/>`;
    s+=`<path d="M${x-13} ${ey-1} Q${x} ${ey-11} ${x+13} ${ey-1}" ${ln('stroke-width="5"')}/>`; // heavy half-lid
    s+=`<path d="M${x+11} ${ey-3} l${dir>0?6:-0} -5 M${x+13} ${ey-1} l5 -2" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`; // lashes (right edge)
    s+=`<path d="M${x-12} ${ey-2} l-5 -3 M${x-13} ${ey} l-5 0" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  // eyebrows: one raised
  s+=`<path d="M${L-13} ${ey-14} Q${L} ${ey-19} ${L+12} ${ey-13}" ${ln('stroke-width="4"')}/>`;
  s+=`<path d="M${R-12} ${ey-18} Q${R+2} ${ey-27} ${R+14} ${ey-17}" ${ln('stroke-width="4"')}/>`;
  // nose + smirk
  s+=`<path d="M${cx+1} ${cy+8} q-4 8 2 10" ${ln('stroke-width="3"')}/>`;
  s+=`<path d="M${cx-11} ${cy+27} Q${cx+3} ${cy+33} ${cx+15} ${cy+24}" fill="${lip}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  s+=`<path d="M${cx+15} ${cy+24} q4 -1 5 -5" ${ln('stroke-width="3"')}/>`;
  if (mask) s+=`<path d="M${cx-34} ${ey-8} Q${cx} ${ey-20} ${cx+34} ${ey-8} L${cx+30} ${ey+9} Q${cx+17} ${ey+3} ${cx+8} ${ey+9} L${cx-8} ${ey+9} Q${cx-17} ${ey+3} ${cx-30} ${ey+9}Z" ${o(INK)} opacity=".92"/>` +
    `<ellipse cx="${L}" cy="${ey}" rx="9" ry="5" fill="#fff" stroke="none"/><ellipse cx="${R}" cy="${ey}" rx="9" ry="5" fill="#fff" stroke="none"/><circle cx="${L+2}" cy="${ey}" r="3.6" fill="${INK}"/><circle cx="${R+2}" cy="${ey}" r="3.6" fill="${INK}"/>`;
  if (glasses==='butterfly') s+=`<path d="M${cx-37} ${ey-8} Q${cx-20} ${ey-14} ${cx-3} ${ey-4} Q${cx-6} ${ey+14} ${cx-22} ${ey+14} Q${cx-38} ${ey+10} ${cx-37} ${ey-8}Z M${cx+37} ${ey-8} Q${cx+20} ${ey-14} ${cx+3} ${ey-4} Q${cx+6} ${ey+14} ${cx+22} ${ey+14} Q${cx+38} ${ey+10} ${cx+37} ${ey-8}Z" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="4"/><path d="M${cx-3} ${ey-4} Q${cx} ${ey-8} ${cx+3} ${ey-4}" ${ln()}/>`;
  return s;
}
const hairBack = (cx,cy,kind,col) => kind==='beehive'
  ? `<ellipse cx="${cx}" cy="${cy-38}" rx="42" ry="40" ${o(col)}/><ellipse cx="${cx}" cy="${cy-62}" rx="22" ry="20" ${o(col)}/>`
  : kind==='bun'
  ? `<circle cx="${cx}" cy="${cy-58}" r="20" ${o(col)}/><ellipse cx="${cx}" cy="${cy-22}" rx="42" ry="34" ${o(col)}/>`
  : `<path d="M${cx-44} ${cy+34} Q${cx-52} ${cy-44} ${cx} ${cy-50} Q${cx+52} ${cy-44} ${cx+44} ${cy+34} L${cx+36} ${cy+4} L${cx-36} ${cy+4}Z" ${o(col)}/>`;
const bangs = (cx,cy,col) => `<path d="M${cx-38} ${cy-10} Q${cx-30} ${cy-42} ${cx+6} ${cy-40} Q${cx+36} ${cy-38} ${cx+38} ${cy-8} Q${cx+22} ${cy-30} ${cx-2} ${cy-24} Q${cx-24} ${cy-22} ${cx-38} ${cy-10}Z" ${o(col)}/>`;

function legsPants(cx,col,y0=300) { return `<path d="M${cx-34} ${y0} L${cx-38} 478 L${cx-6} 478 L${cx} ${y0+40} L${cx+6} 478 L${cx+38} 478 L${cx+34} ${y0}Z" ${o(col)}/>`+
  `<path d="M${cx-44} 478 h40 l2 22 h-46Z M${cx+4} 478 h40 l4 22 h-46Z" ${o(INK)}/>`; }
function legsBare(cx,y0) { return `<path d="M${cx-18} ${y0} L${cx-20} 482 h14 L${cx-3} ${y0}Z M${cx+3} ${y0} L${cx+6} 482 h14 L${cx+18} ${y0}Z" ${o(SKIN)}/>`+
  `<path d="M${cx-28} 482 h24 l3 20 h-34Z M${cx+4} 482 h24 l7 20 h-34Z" ${o(INK)}/>`; }

function fig(name, x, y, w=260) {
  const cx=130, hy=105; let s=`<g transform="translate(${x},${y})">`;
  s+=`<circle cx="${cx}" cy="260" r="150" fill="${name.bg}" opacity=".55"/>`;
  s+=name.build(cx,hy);
  s+=`</g>`; return s;
}
const arm = (x1,y1,x2,y2,col,hand=SKIN) => `<path d="M${x1} ${y1} Q${(x1+x2)/2+(x2<x1?-18:18)} ${(y1+y2)/2} ${x2} ${y2}" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/><path d="M${x1} ${y1} Q${(x1+x2)/2+(x2<x1?-18:18)} ${(y1+y2)/2} ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="22" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="11" ${o(hand)}/>`;

const OUTFITS = [
 { title:'1 · LA DAME EN COSTUME', sub:'tenue du jeu de base (tuile, cover)', bg:CREAM, build:(cx,hy)=>{
   let s=hairBack(cx,hy,'bob','#2A1B33');
   s+=legsPants(cx,'#3A2447',290);
   s+=`<path d="M${cx-30} 150 L${cx+30} 150 L${cx+34} 170 L${cx-34} 170Z" ${o(SKIN)}/>`;
   // jacket
   s+=`<path d="M${cx-48} 168 Q${cx-56} 250 ${cx-44} 318 L${cx+44} 318 Q${cx+56} 250 ${cx+48} 168 Q${cx} 150 ${cx-48} 168Z" ${o(PLUM)}/>`;
   s+=`<path d="M${cx-18} 160 L${cx} 300 L${cx+18} 160Z" ${o('#fff')}/><path d="M${cx-2} 166 l4 0 l5 60 l-7 12 l-7 -12Z" ${o(BRICK)}/>`;
   s+=`<path d="M${cx-18} 158 L${cx-30} 215 L${cx-3} 300 M${cx+18} 158 L${cx+30} 215 L${cx+3} 300" ${ln()}/>`;
   s+=`<circle cx="${cx-8}" cy="268" r="3.5" fill="${MUST}" stroke="${INK}" stroke-width="2"/>`;
   s+=`<path d="M${cx-46} 290 h92" stroke="${INK}" stroke-width="3" opacity=".6"/>`;
   s+=arm(cx-48,180,cx-70,296,PLUM)+arm(cx+48,180,cx+72,268,PLUM);
   s+=`<circle cx="${cx+84}" cy="262" r="15" ${o(MUST)}/><circle cx="${cx+84}" cy="262" r="8" ${o('#fff')}/><path d="M${cx+84} 247 v-14" ${ln('stroke-width="3"')}/>`; // compact radio w antenna
   s+=face(cx,hy)+bangs(cx,hy,'#2A1B33');
   // fedora tilted
   s+=`<g transform="rotate(-9 ${cx} ${hy-46})"><ellipse cx="${cx}" cy="${hy-44}" rx="64" ry="14" ${o(PLUM)}/><path d="M${cx-38} ${hy-48} Q${cx-34} ${hy-92} ${cx} ${hy-90} Q${cx+34} ${hy-92} ${cx+38} ${hy-48}Z" ${o(PLUM)}/><path d="M${cx-37} ${hy-54} Q${cx} ${hy-46} ${cx+37} ${hy-54} l-1 -12 Q${cx} ${hy-58} ${cx-36} ${hy-66}Z" ${o(BRICK)}/><path d="M${cx-8} ${hy-90} q8 6 16 0" ${ln('stroke-width="3"')}/></g>`;
   return s; } },
 { title:'2 · L’INSPECTRICE', sub:'mission « Poste de contrôle »', bg:'#BFD6E6', build:(cx,hy)=>{
   let s=hairBack(cx,hy,'bun','#5A2D17');
   s+=legsBare(cx,360);
   s+=`<path d="M${cx-30} 150 L${cx+30} 150 L${cx+34} 170 L${cx-34} 170Z" ${o(SKIN)}/>`;
   s+=`<path d="M${cx-40} 250 L${cx+40} 250 L${cx+34} 372 L${cx-34} 372Z" ${o(NAVY)}/>`;
   s+=`<path d="M${cx-48} 168 Q${cx-52} 220 ${cx-40} 262 L${cx+40} 262 Q${cx+52} 220 ${cx+48} 168 Q${cx} 150 ${cx-48} 168Z" ${o(NAVY)}/>`;
   s+=`<path d="M${cx-14} 160 L${cx} 195 L${cx+14} 160Z" ${o('#CFE3F0')}/><path d="M${cx-2} 175 h4 l3 56 l-5 8 l-5 -8Z" ${o('#111')}/>`;
   for (const yy of [215,238]) s+=`<circle cx="${cx-14}" cy="${yy}" r="3.6" fill="${MUST}" stroke="${INK}" stroke-width="2"/><circle cx="${cx+14}" cy="${yy}" r="3.6" fill="${MUST}" stroke="${INK}" stroke-width="2"/>`;
   s+=`<path d="M${cx+18} 188 q20 24 4 44" ${ln('stroke-width="2.5"')}/><circle cx="${cx+22}" cy="236" r="6" ${o(MUST)}/>`; // whistle chain
   s+=arm(cx-48,180,cx-66,250,NAVY)+arm(cx+48,180,cx+84,236,NAVY);
   s+=`<rect x="${cx+80}" y="212" width="12" height="40" rx="3" ${o('#555')} transform="rotate(20 ${cx+86} 232)"/><path d="M${cx+92} 206 l32 -22 l-8 38Z" fill="${MUST}" opacity=".6" stroke="none"/>`; // flashlight beam
   s+=face(cx,hy)+bangs(cx,hy,'#5A2D17');
   s+=`<g transform="rotate(7 ${cx} ${hy-48})"><path d="M${cx-40} ${hy-44} L${cx-34} ${hy-82} Q${cx} ${hy-96} ${cx+34} ${hy-82} L${cx+40} ${hy-44} Q${cx} ${hy-36} ${cx-40} ${hy-44}Z" ${o(NAVY)}/><path d="M${cx-40} ${hy-44} Q${cx} ${hy-36} ${cx+40} ${hy-44}" stroke="${MUST}" stroke-width="5" fill="none"/><path d="M${cx} ${hy-66} l5 8 h-10Z M${cx} ${hy-76} l-6 10 h12Z" ${o(MUST)}/></g>`;
   return s; } },
 { title:'3 · SOIRÉE AU CASINO', sub:'mission « Table 13 »', bg:'#EBC0B8', build:(cx,hy)=>{
   let s=hairBack(cx,hy,'beehive','#3B1F10');
   s+=`<path d="M${cx-30} 150 L${cx+30} 150 L${cx+34} 172 L${cx-34} 172Z" ${o(SKIN)}/>`;
   s+=`<path d="M${cx-48} 168 Q${cx-52} 230 ${cx-40} 262 Q${cx-44} 400 ${cx-84} 498 L${cx+84} 498 Q${cx+44} 400 ${cx+40} 262 Q${cx+52} 230 ${cx+48} 168 Q${cx} 150 ${cx-48} 168Z" ${o(BRICK)}/>`;
   s+=`<path d="M${cx-40} 262 Q${cx} 276 ${cx+40} 262" ${ln()}/><path d="M${cx-34} 330 Q${cx-30} 420 ${cx-60} 490 M${cx+34} 330 Q${cx+30} 420 ${cx+60} 490" ${ln('stroke-width="2.5" opacity=".6"')}/>`;
   s+=`<path d="M${cx-30} 160 Q${cx} 186 ${cx+30} 160" fill="none" stroke="${MUST}" stroke-width="5"/>`;
   s+=arm(cx-48,180,cx-72,282,CREAM,CREAM)+arm(cx+48,180,cx+80,224,CREAM,CREAM);
   s+=`<path d="M${cx+80} 224 l22 -34 q10 -8 20 2 l-6 40 q-16 12 -36 -8Z" ${o(MUST)} transform="rotate(-8 ${cx+96} 214)"/><path d="M${cx+90} 210 l16 -22 M${cx+100} 214 l16 -14" ${ln('stroke-width="2.5"')}/>`; // fan
   s+=face(cx,hy,{mask:true})+bangs(cx,hy,'#3B1F10');
   s+=`<path d="M${cx+30} ${hy-72} l6 -22 l8 14 l12 -8 l-4 22Z" ${o(MUST)}/>`;
   return s; } },
 { title:'4 · LE LABORATOIRE', sub:'mission « Éprouvette X »', bg:'#BFE0D5', build:(cx,hy)=>{
   let s=hairBack(cx,hy,'bun','#C9772E');
   s+=legsBare(cx,376);
   s+=`<path d="M${cx-30} 150 L${cx+30} 150 L${cx+34} 172 L${cx-34} 172Z" ${o(SKIN)}/>`;
   s+=`<path d="M${cx-40} 250 L${cx+40} 250 L${cx+36} 384 L${cx-36} 384Z" ${o(TURQ)}/>`;
   s+=`<path d="M${cx-52} 166 Q${cx-62} 300 ${cx-50} 400 L${cx+50} 400 Q${cx+62} 300 ${cx+52} 166 Q${cx} 148 ${cx-52} 166Z" ${o(CREAM)}/>`;
   s+=`<path d="M${cx-3} 168 V400" ${ln('stroke-width="3"')}/><path d="M${cx-18} 158 L${cx-26} 210 L${cx-3} 250 M${cx+18} 158 L${cx+26} 210 L${cx+3} 250" ${ln()}/>`;
   s+=`<rect x="${cx+18}" y="262" width="22" height="24" rx="3" ${o('#fff')}/><path d="M${cx+22} 262 v-10 M${cx+30} 262 v-14" ${ln('stroke-width="3"')}/>`;
   s+=arm(cx-52,182,cx-70,290,CREAM)+arm(cx+52,182,cx+76,226,CREAM);
   s+=`<path d="M${cx+72} 188 h12 l2 38 q-8 10 -16 0Z" ${o('#CFF1E4')}/><rect x="${cx+70}" y="182" width="18" height="8" rx="2" ${o(INK)}/><circle cx="${cx+80}" cy="170" r="6" fill="#9ED9B8" opacity=".8" stroke="${INK}" stroke-width="2"/><circle cx="${cx+88}" cy="156" r="4" fill="#9ED9B8" opacity=".7" stroke="${INK}" stroke-width="2"/>`;
   s+=face(cx,hy,{glasses:'butterfly'})+bangs(cx,hy,'#C9772E');
   return s; } },
 { title:'5 · LE COFFRE-FORT', sub:'mission « Combinaison jaune »', bg:'#F2DB9A', build:(cx,hy)=>{
   let s=hairBack(cx,hy,'bob','#1B1B2A');
   s+=legsPants(cx,MUST,296);
   s+=`<path d="M${cx-30} 150 L${cx+30} 150 L${cx+34} 172 L${cx-34} 172Z" ${o(SKIN)}/>`;
   s+=`<path d="M${cx-46} 168 Q${cx-52} 240 ${cx-38} 300 L${cx+38} 300 Q${cx+52} 240 ${cx+46} 168 Q${cx} 150 ${cx-46} 168Z" ${o(MUST)}/>`;
   s+=`<path d="M${cx-40} 252 h80 v14 h-80Z" ${o(INK)}/><rect x="${cx-9}" y="252" width="18" height="14" ${o(BRICK)}/>`;
   s+=`<path d="M${cx} 160 V250" ${ln('stroke-width="3"')}/>`;
   s+=`<path d="M${cx-40} 162 Q${cx} 188 ${cx+44} 160 L${cx+52} 188 Q${cx} 214 ${cx-46} 186Z" ${o(OLIVE)}/><path d="M${cx+30} 190 q26 20 16 56 l-14 -4 q6 -22 -10 -40Z" ${o(OLIVE)}/>`;
   s+=arm(cx-46,180,cx-66,270,MUST)+arm(cx+46,180,cx+86,214,MUST);
   s+=`<path d="M${cx+86} 214 l14 -34 M${cx+100} 180 l-10 -10 m10 10 l10 -10 m-10 10 v-14" ${ln('stroke-width="5"')}/>`; // grapple
   s+=face(cx,hy)+bangs(cx,hy,'#1B1B2A');
   s+=`<path d="M${cx-44} ${hy-8} Q${cx-48} ${hy-62} ${cx} ${hy-64} Q${cx+48} ${hy-62} ${cx+44} ${hy-8} L${cx+34} ${hy-20} Q${cx} ${hy-40} ${cx-34} ${hy-20}Z" ${o('#7B5A3A')}/>`;
   s+=`<rect x="${cx-30}" y="${hy-58}" width="60" height="22" rx="11" ${o('#CFE3F0')} opacity=".95"/><circle cx="${cx-16}" cy="${hy-47}" r="8" ${o('#fff')}/><circle cx="${cx+16}" cy="${hy-47}" r="8" ${o('#fff')}/>`;
   return s; } },
];
const SIDE = [
 { title:'LE COLONEL BOBINE', sub:'chef de l’agence · présente les missions', bg:'#D9D2F0', draw:(cx)=>
   `<rect x="${cx-90}" y="250" width="180" height="70" rx="6" ${o('#7B5A3A')}/><path d="M${cx-60} 250 Q${cx-70} 180 ${cx} 176 Q${cx+70} 180 ${cx+60} 250Z" ${o(NAVY)}/><path d="M${cx-12} 180 L${cx} 220 L${cx+12} 180Z" ${o('#fff')}/><path d="M${cx-2} 196 h4 l2 40 l-4 6 l-4 -6Z" ${o(BRICK)}/>`+
   `<ellipse cx="${cx}" cy="140" rx="46" ry="48" ${o(SKIN2)}/><path d="M${cx-40} 112 Q${cx} 84 ${cx+40} 112 Q${cx} 100 ${cx-40} 112Z" ${o('#9a9a9a')}/>`+
   `<circle cx="${cx-16}" cy="136" r="8" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="${cx+16}" cy="136" r="8" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="${cx-14}" cy="137" r="3" fill="${INK}"/><circle cx="${cx+18}" cy="137" r="3" fill="${INK}"/><path d="M${cx-26} 122 l18 5 M${cx+26} 122 l-18 5" ${ln()}/>`+
   `<ellipse cx="${cx}" cy="150" rx="9" ry="7" ${o(SKIN2)}/><path d="M${cx-34} 160 Q${cx-18} 148 ${cx} 160 Q${cx+18} 148 ${cx+34} 160 Q${cx+18} 176 ${cx} 164 Q${cx-18} 176 ${cx-34} 160Z" ${o('#9a9a9a')}/>`+
   `<rect x="${cx-80}" y="226" width="34" height="24" rx="4" ${o(BRICK)}/><circle cx="${cx-63}" cy="236" r="6" fill="${CREAM}" stroke="${INK}" stroke-width="2"/><rect x="${cx+46}" y="226" width="34" height="24" rx="4" ${o(MUST)}/><circle cx="${cx+63}" cy="236" r="6" fill="${CREAM}" stroke="${INK}" stroke-width="2"/>` },
 { title:'TIC-TAC', sub:'intendant des gadgets · présente les bonus', bg:'#BFE0D5', draw:(cx)=>
   `<path d="M${cx-48} 330 Q${cx-52} 240 ${cx} 232 Q${cx+52} 240 ${cx+48} 330Z" ${o(CREAM)}/><path d="M${cx-16} 236 L${cx} 262 L${cx+16} 236" ${ln()}/><rect x="${cx-34}" y="268" width="68" height="26" rx="5" ${o('#D5D5D5')}/><circle cx="${cx-14}" cy="281" r="7" ${o(BRICK)}/><circle cx="${cx+8}" cy="281" r="7" ${o(TURQ)}/><path d="M${cx+20} 276 h10" ${ln('stroke-width="3"')}/>`+
   `<ellipse cx="${cx}" cy="186" rx="40" ry="44" ${o(SKIN)}/><path d="M${cx-38} 170 Q${cx-30} 138 ${cx} 140 Q${cx+30} 138 ${cx+38} 170 Q${cx+10} 150 ${cx-38} 170Z" ${o('#5A5A66')}/>`+
   `<circle cx="${cx-15}" cy="184" r="15" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="${cx+15}" cy="184" r="12" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="${cx-13}" cy="186" r="6" fill="${INK}"/><circle cx="${cx+15}" cy="186" r="5" fill="${INK}"/><path d="M${cx-4} 182 h8" ${ln('stroke-width="3"')}/>`+
   `<path d="M${cx-14} 214 Q${cx} 224 ${cx+14} 212" ${ln()}/><path d="M${cx-22} 150 q-6 -34 8 -40" ${ln('stroke-width="3"')}/><circle cx="${cx-14}" cy="108" r="9" ${o(MUST)}/><path d="M${cx+38} 184 l20 -10 M${cx+58} 174 v-34" ${ln('stroke-width="5"')}/><circle cx="${cx+58}" cy="132" r="12" ${o(ORG)}/>` },
 { title:'LE BARON VOILÉ', sub:'méchant masqué · mission finale et gain max', bg:'#C9B6D9', draw:(cx)=>
   `<path d="M${cx-70} 340 Q${cx-62} 214 ${cx-20} 196 L${cx+20} 196 Q${cx+62} 214 ${cx+70} 340Z" ${o(PLUM)}/><path d="M${cx-18} 196 L${cx} 270 L${cx+18} 196Z" ${o('#222')}/><path d="M${cx-42} 206 Q${cx} 236 ${cx+42} 206" ${ln('stroke="'+MUST+'"')}/>`+
   `<path d="M${cx-34} 150 Q${cx-38} 100 ${cx} 96 Q${cx+38} 100 ${cx+34} 150 Q${cx+30} 196 ${cx} 200 Q${cx-30} 196 ${cx-34} 150Z" ${o('#2B2B40')}/><path d="M${cx-52} 100 L${cx-24} 72 L${cx+24} 72 L${cx+52} 100 L${cx+30} 108 Q${cx} 98 ${cx-30} 108Z" ${o('#111')}/>`+
   `<path d="M${cx-26} 140 q10 -9 20 0 M${cx+6} 140 q10 -9 20 0" ${ln('stroke="'+MUST+'" stroke-width="5"')}/><circle cx="${cx+16}" cy="143" r="14" fill="#fff" fill-opacity=".35" stroke="${MUST}" stroke-width="4"/><path d="M${cx+28} 150 q16 26 8 44" ${ln('stroke="'+MUST+'" stroke-width="2.5"')}/><path d="M${cx-10} 172 q10 8 20 0" ${ln('stroke="'+BRICK+'"')}/>` },
];
const W=1760,H=1180;
let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Futura,'Century Gothic','Arial Black',sans-serif">
<defs><pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="1.6" fill="${CREAM}" opacity=".12"/></pattern></defs>
<rect width="${W}" height="${H}" fill="${NIGHT}"/><rect width="${W}" height="${H}" fill="url(#dots)"/>
<text x="60" y="84" font-size="52" font-weight="900" fill="${MUST}" stroke="${INK}" stroke-width="8" paint-order="stroke" letter-spacing="3">AGENT MAMBO · PLANCHE DE PERSONNAGES</text>
<text x="60" y="124" font-size="22" font-weight="700" fill="${CREAM}" letter-spacing="2">Proposition v2 : une héroïne, cinq tenues de mission, trois personnages secondaires (tous adultes) · cartoon rétro années 60</text>`;
OUTFITS.forEach((f,i)=>{
  const x=40+i*340, y=150;
  svg+=`<rect x="${x}" y="${y}" width="320" height="640" rx="18" fill="${f.bg}" stroke="${INK}" stroke-width="5"/>`;
  svg+=`<g transform="translate(${x+30},${y+30}) scale(.84)">${fig({bg:f.bg,build:f.build},0,0)}</g>`;
  svg+=`<rect x="${x}" y="${y+560}" width="320" height="80" rx="0" fill="${INK}" opacity=".9"/><text x="${x+16}" y="${y+596}" font-size="21" font-weight="900" fill="${MUST}">${f.title}</text><text x="${x+16}" y="${y+624}" font-size="16" font-weight="700" fill="${CREAM}">${f.sub}</text>`;
});
SIDE.forEach((f,i)=>{
  const x=40+i*570, y=820;
  svg+=`<rect x="${x}" y="${y}" width="540" height="330" rx="18" fill="${f.bg}" stroke="${INK}" stroke-width="5"/>`;
  svg+=`<g transform="translate(${x+170},${y-6}) scale(.68)">${f.draw(150)}</g>`;
  svg+=`<rect x="${x}" y="${y+250}" width="540" height="80" fill="${INK}" opacity=".9"/><text x="${x+16}" y="${y+286}" font-size="21" font-weight="900" fill="${MUST}">${f.title}</text><text x="${x+16}" y="${y+314}" font-size="16" font-weight="700" fill="${CREAM}">${f.sub}</text>`;
});
svg+=`</svg>`;
fs.writeFileSync('board.svg',svg); console.log('svg',svg.length);
