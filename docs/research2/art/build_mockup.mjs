// build_mockup.mjs - composites the vector heroine onto real screenshots of the game (frontend_mambo) at the LEFT of the grid.
//   node build_mockup.mjs <outDir> [--game http://127.0.0.1:5741] [--rgs http://127.0.0.1:5742] [--art http://127.0.0.1:5731/art]
// Needs: the game static server, the mock RGS (see frontend_mambo/serve.mjs and tools/mock-rgs/server.mjs) and a static server rooted at docs/research2.
// Output: heroine_mockup.png (1024x576 desktop), heroine_mockup_mobile.png (425x812 portrait), heroine_mockup_sheet.png (both, captioned).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const require = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/');
const { chromium } = require('playwright-core');
const a = process.argv.slice(2); const out = a[0] || '.';
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const GAME = opt('game', 'http://127.0.0.1:5741'), RGS = opt('rgs', 'http://127.0.0.1:5742'), ART = opt('art', 'http://127.0.0.1:5731/art');
fs.mkdirSync(out, { recursive: true });
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
async function game(file, w, h, mobile) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(`${GAME}/index.html?sessionID=heroine-mock&rgs_url=${RGS}&lang=en&currency=USD&device=${mobile ? 'mobile' : 'desktop'}&social=false&demo=false`);
  await p.waitForTimeout(2600);
  await p.addStyleTag({ content: '#mascot-slot{visibility:hidden!important}' });
  await p.screenshot({ path: file }); await ctx.close();
}
async function hero(file, w, h, params) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(`${ART}/hero_still.html?w=${w}&h=${h}&${params}`); await p.waitForFunction(() => window.__ready);
  await p.screenshot({ path: file, omitBackground: true }); await ctx.close();
}
const t = (n) => path.join(out, n);
await game(t('_g_desktop.png'), 1024, 576, false);
await game(t('_g_mobile.png'), 425, 812, true);
await hero(t('_h_desktop.png'), 240, 360, 'outfit=inspectrice&pose=idle&look=grid&mood=sly');
await hero(t('_h_mobile.png'), 104, 156, 'outfit=inspectrice&pose=idle&look=grid&mood=sly');
const py = `
import sys
from PIL import Image, ImageDraw, ImageFont
out=sys.argv[1]
def comp(g,h,pos,size,name):
    G=Image.open(g).convert('RGBA'); Hh=Image.open(h).convert('RGBA'); Hh=Hh.resize(size,Image.LANCZOS)
    G.alpha_composite(Hh,pos); G=G.resize((G.width//2,G.height//2),Image.LANCZOS); G.convert('RGB').save(name); return G
d=comp(out+'/_g_desktop.png',out+'/_h_desktop.png',(2*2,2*(576-362)),(480,720),out+'/heroine_mockup.png')
m=comp(out+'/_g_mobile.png',out+'/_h_mobile.png',(2*(-10),2*(812-160)),(208,312),out+'/heroine_mockup_mobile.png')
# captioned sheet
S=Image.new('RGB',(1024+425+60,812+80),(20,33,58)); S.paste(d.convert('RGB'),(20,60)); S.paste(m.convert('RGB'),(1024+40,60))
dr=ImageDraw.Draw(S)
try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20)
except Exception: f=None
dr.text((20,18),'desktop 1024x576: heroine in the left gutter, facing the grid',fill=(232,169,43),font=f)
dr.text((1024+40,18),'mobile portrait 425x812',fill=(232,169,43),font=f)
S.save(out+'/heroine_mockup_sheet.png')
`;
const r = spawnSync('python3', ['-I', '-c', py, out], { encoding: 'utf8' });
if (r.status !== 0) console.log('PIL failed', r.stderr.slice(0, 400));
for (const f of ['_g_desktop.png', '_g_mobile.png', '_h_desktop.png', '_h_mobile.png']) fs.rmSync(t(f), { force: true });
await b.close();
console.log('mockups written to', out);
