const fs=require('fs'),vm=require('vm');
const ops=[];
const ctxState={};
const ctxMissing=new Set(); // keys a test wants to pretend the browser lacks
const snap=()=>({fillStyle:ctxState.fillStyle,strokeStyle:ctxState.strokeStyle,shadowBlur:ctxState.shadowBlur,shadowColor:ctxState.shadowColor,globalAlpha:ctxState.globalAlpha});
const stubCtx=new Proxy({},{
  get:(t,k)=>{
    if(ctxMissing.has(k)) return undefined;
    if(Object.prototype.hasOwnProperty.call(ctxState,k)) return ctxState[k];
    if(k==='fillText')return(...a)=>ops.push({op:'text',a,...snap()});
    if(k==='drawImage')return(...a)=>ops.push({op:'img',a,...snap()});
    return(...a)=>ops.push({op:String(k),a,...snap()});
  },
  set:(t,k,v)=>{ctxState[k]=v;return true;},
  has:(t,k)=>!ctxMissing.has(k),
});
const listeners={},winL={};
const canvasEl={width:800,height:600,getContext:()=>stubCtx,addEventListener:(t,f)=>{listeners[t]=f},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})};
const sandbox={console,Math,setTimeout,
  document:{getElementById:()=>canvasEl,createElement:()=>({width:0,height:0,getContext:()=>stubCtx})},
  window:{addEventListener:(t,f)=>{winL[t]=f}},
  Image:class{set src(v){this.onload&&this.onload();}},
  requestAnimationFrame:()=>{}};
const played=[];
sandbox.Audio=class{constructor(src){this.src=src;}cloneNode(){const src=this.src;return{src,play(){played.push(src);}};}play(){played.push(this.src);}};
const storage={data:{},throwOnGet:false,throwOnSet:false};
sandbox.localStorage={
  getItem(k){if(storage.throwOnGet)throw new Error('SecurityError');return k in storage.data?storage.data[k]:null;},
  setItem(k,v){if(storage.throwOnSet)throw new Error('QuotaExceededError');storage.data[k]=String(v);},
};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../assets/spritesheet.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../skins.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../levels.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../game.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/expose-bindings.js','utf8'),sandbox);
const g=sandbox.G;

const park=()=>{g.gameState='playing';g.lives=3;Object.assign(g.ball,{x:400,y:300,vx:0,vy:0});};
let pass=0,fail=0;
const t=(n,c,e='')=>{c?(pass++,console.log('PASS  '+n)):(fail++,console.log('FAIL  '+n+'  -> '+e));};

t('canvas 800x600', g.WIDTH===800&&g.HEIGHT===600);
t('60 bloques (10x6)', g.blocks.length===60, g.blocks.length);
t('fila 0 = red', g.blocks.filter(b=>b.y===80).every(b=>b.color==='red'));
t('6 colores distintos', new Set(g.blocks.map(b=>b.color)).size===6);
t('grid centrada 80..720', g.blocks[0].x===80 && g.blocks[9].x+g.blocks[9].w===720, g.blocks[0].x);
t('vidas iniciales 3', g.lives===3);
t('score inicial 0', g.score===0);
t('pelota sobre paddle', g.ball.x===g.paddle.x+g.paddle.w/2-8 && g.ball.y===g.paddle.y-16);
t('pelota con velocidad inicial', g.ball.vx===200&&g.ball.vy===-300);

park();winL.keydown({key:'ArrowLeft'});
for(let i=0;i<100;i++){ park(); g.update(0.1); }
t('teclado: clamp izquierda', g.paddle.x===0, g.paddle.x);
winL.keyup({key:'ArrowLeft'}); winL.keydown({key:'ArrowRight'});
for(let i=0;i<100;i++){ park(); g.update(0.1); }
t('teclado: clamp derecha', g.paddle.x===638, g.paddle.x);
winL.keyup({key:'ArrowRight'});

listeners.mousemove({clientX:-500}); t('mouse: clamp izquierda', g.paddle.x===0);
listeners.mousemove({clientX:5000}); t('mouse: clamp derecha', g.paddle.x===638);
listeners.mousemove({clientX:400});  t('mouse: centra paddle', g.paddle.x===319, g.paddle.x);

park(); g.loadLevel(1);
park(); Object.assign(g.ball,{x:2,y:300,vx:-200,vy:-300}); g.update(0.05);
t('rebote pared izquierda', g.ball.vx>0, g.ball.vx);
park(); Object.assign(g.ball,{x:790,y:300,vx:200});        g.update(0.05);
t('rebote pared derecha', g.ball.vx<0, g.ball.vx);
park(); Object.assign(g.ball,{x:400,y:2,vx:0,vy:-300});    g.update(0.05);
t('rebote techo', g.ball.vy>0, g.ball.vy);

park(); g.paddle.x=300; Object.assign(g.ball,{x:360,y:g.paddle.y-10,vx:0,vy:300}); g.update(0.001);
t('rebote en paddle', g.ball.vy<0, g.ball.vy);

park(); g.loadLevel(1); g.blocks.forEach(b=>b.alive=true);
const before=g.score, target=g.blocks[25];
Object.assign(g.ball,{x:target.x+10,y:target.y+5,vx:0,vy:-300}); g.update(0.001);
t('bloque destruido', target.alive===false);
t('score +10', g.score===before+10, g.score);
t('rebote en bloque', g.ball.vy>0, g.ball.vy);

park(); g.loadLevel(1); g.blocks.forEach(b=>b.alive=true);
const lv=g.lives; Object.assign(g.ball,{x:400,y:700,vx:0,vy:300}); g.update(0.001);
t('pierde una vida', g.lives===lv-1, g.lives);
t('pelota reposicionada', g.ball.y===g.paddle.y-16 && g.ball.vy===-300);

g.ball.y=700; g.update(0.001);
g.ball.y=700; g.update(0.001);
t('gameover con 0 vidas', g.gameState==='gameover'&&g.lives===0, g.gameState+'/'+g.lives);
ops.length=0; g.draw();
t('overlay GAME OVER', ops.some(o=>o.op==='text'&&o.a[0]==='GAME OVER'));

g.gameState='playing'; g.lives=3; g.loadLevel(5);
g.blocks.forEach(b=>b.alive=false); const last=g.blocks[0]; last.alive=true;
Object.assign(g.ball,{x:last.x+10,y:last.y+5,vx:0,vy:-300}); g.update(0.001);
t('victoria', g.gameState==='win', g.gameState);
ops.length=0; g.draw();
t('overlay fin de juego', ops.some(o=>o.op==='text'&&o.a[0]==='\u00A1Completaste el juego!'), JSON.stringify(ops.filter(o=>o.op==='text').map(o=>o.a[0])));

g.gameState='playing'; ops.length=0; g.draw();
const txt=ops.filter(o=>o.op==='text').map(o=>o.a[0]);
t('HUD score visible', txt.some(s=>/^SCORE /.test(s)), txt.join(' | '));
t('HUD vidas visible', txt.some(s=>/^VIDAS /.test(s)), txt.join(' | '));
t('sin HUD en overlay', (g.gameState='win', ops.length=0, g.draw(), !ops.some(o=>/^SCORE/.test(o.a&&o.a[0]))));


// --- 02: animacion de explosion ---
const expDraws = () => ops.filter(o=>o.op==='img' && o.a[1]>=256);

park(); g.loadLevel(1); g.blocks.forEach(b=>b.alive=true);
t('array explosions existe', Array.isArray(g.explosions), typeof g.explosions);
g.explosions.length=0;

const b1=g.blocks[13];
Object.assign(g.ball,{x:b1.x+10,y:b1.y+5,vx:0,vy:-300}); g.update(0.001); park();
t('explosion lanzada al romper bloque', g.explosions.length===1, g.explosions.length);
const e1=g.explosions[0];
t('explosion en posicion del bloque', e1.x===b1.x&&e1.y===b1.y, e1.x+','+e1.y);
t('explosion con tamanio del bloque', e1.w===b1.w&&e1.h===b1.h, e1.w+'x'+e1.h);
t('explosion hereda color del bloque', e1.color===b1.color, e1.color);
t('color es clave valida de EXPLOSION_FRAMES', Array.isArray(g.EXPLOSION_FRAMES[e1.color]) && g.EXPLOSION_FRAMES[e1.color].length===4);

ops.length=0; g.draw();
t('dibuja frame 0 al inicio', expDraws().length===1 && expDraws()[0].a[1]===g.EXPLOSION_FRAMES[e1.color][0].sx, JSON.stringify(expDraws().map(d=>d.a[1])));

g.update(0.05); // +50ms -> frame 1
t('elapsed avanza en ms', Math.round(e1.elapsed)===51, e1.elapsed);
ops.length=0; g.draw();
t('dibuja frame 1 a ~50ms', expDraws()[0].a[1]===g.EXPLOSION_FRAMES[e1.color][1].sx);

g.update(0.06); // ~111ms -> frame 2
ops.length=0; g.draw();
t('dibuja frame 2 a ~110ms', expDraws()[0].a[1]===g.EXPLOSION_FRAMES[e1.color][2].sx);

g.update(0.03); // ~141ms -> frame 3
ops.length=0; g.draw();
t('dibuja frame 3 antes de terminar', expDraws()[0].a[1]===g.EXPLOSION_FRAMES[e1.color][3].sx, e1.elapsed);

g.update(0.02); // >150ms
t('explosion eliminada tras EXPLOSION_DURATION', g.explosions.length===0, g.explosions.length);
ops.length=0; g.draw();
t('deja de dibujarse tras terminar', expDraws().length===0);

// Multiples explosiones simultaneas e independientes
park(); g.blocks.forEach(b=>b.alive=true); g.explosions.length=0;
const bA=g.blocks[5], bB=g.blocks[55];
t('bloques de colores distintos', bA.color!==bB.color, bA.color+'/'+bB.color);
Object.assign(g.ball,{x:bA.x+10,y:bA.y+5,vx:0,vy:-300}); g.update(0.001);
park(); g.update(0.06); // adelanta solo la primera
Object.assign(g.ball,{x:bB.x+10,y:bB.y+5,vx:0,vy:-300}); g.update(0.001); park();
t('dos explosiones en paralelo', g.explosions.length===2, g.explosions.length);
const [eA,eB]=g.explosions;
t('cada una con su propio elapsed', eA.elapsed>eB.elapsed, eA.elapsed+' vs '+eB.elapsed);
t('cada una con su propio color', eA.color===bA.color&&eB.color===bB.color, eA.color+'/'+eB.color);
ops.length=0; g.draw();
t('se dibujan las dos a la vez', expDraws().length===2, expDraws().length);
t('frames distintos por explosion', expDraws()[0].a[1]!==expDraws()[1].a[1]);

// La mas vieja expira sin afectar a la mas nueva
g.update(0.09);
t('expira solo la terminada', g.explosions.length===1 && g.explosions[0].color===bB.color, g.explosions.map(e=>e.color).join(','));

// El bloque no colisiona mientras la explosion corre
park(); g.blocks.forEach(b=>b.alive=true); g.explosions.length=0;
const b3=g.blocks[30], sc=g.score;
Object.assign(g.ball,{x:b3.x+10,y:b3.y+5,vx:0,vy:-300}); g.update(0.001);
Object.assign(g.ball,{x:b3.x+10,y:b3.y+5,vx:0,vy:-300}); g.update(0.001);
t('bloque destruido no vuelve a puntuar', g.score===sc+10, g.score-sc);

// Las explosiones no bloquean el fin de partida
park(); g.loadLevel(5); g.blocks.forEach(b=>b.alive=false); g.blocks[0].alive=true; g.explosions.length=0;
Object.assign(g.ball,{x:g.blocks[0].x+10,y:g.blocks[0].y+5,vx:0,vy:-300}); g.update(0.001);
t('victoria con explosion activa', g.gameState==='win' && g.explosions.length===1, g.gameState+'/'+g.explosions.length);

// --- 03: sonidos y niveles ---
const SPEEDS=[1.0,1.1,1.21,1.33,1.46];
const colorsOf = lv => [...new Set(lv.blocks.map(b=>b.color))].sort().join(',');

t('LEVELS tiene 5 niveles', g.LEVELS.length===5, g.LEVELS.length);
t('multiplicadores de velocidad correctos', g.LEVELS.every((l,i)=>l.speed===SPEEDS[i]), g.LEVELS.map(l=>l.speed).join(','));
t('todo bloque tiene col/row/color validos', g.LEVELS.every(l=>l.blocks.every(b=>b.col>=0&&b.col<10&&b.row>=0&&b.row<6&&typeof b.color==='string')));
t('sin celdas duplicadas en un nivel', g.LEVELS.every(l=>new Set(l.blocks.map(b=>b.col+','+b.row)).size===l.blocks.length));
t('paletas distintas entre niveles', new Set(g.LEVELS.map(colorsOf)).size===5, g.LEVELS.map(colorsOf).join(' | '));

// Patrones
t('N1 parrilla completa 10x6', g.LEVELS[0].blocks.length===60);
const l2=g.LEVELS[1], widths=[0,1,2,3,4,5].map(r=>l2.blocks.filter(b=>b.row===r).length);
t('N2 piramide: filas crecen hacia abajo', widths.every((w,i)=>i===0||w>=widths[i-1]) && widths[5]>widths[1], widths.join(','));
t('N2 piramide: filas centradas', [1,2,3,4,5].every(r=>{const c=l2.blocks.filter(b=>b.row===r).map(b=>b.col);return Math.min(...c)+Math.max(...c)===9;}), widths.join(','));
t('N3 ajedrez: solo (col+row) pares', g.LEVELS[2].blocks.every(b=>(b.col+b.row)%2===0) && g.LEVELS[2].blocks.length===30, g.LEVELS[2].blocks.length);
const gaps=[0,1,2,3,4,5].map(r=>10-g.LEVELS[3].blocks.filter(b=>b.row===r).length);
t('N4 filas con 3-4 huecos', gaps.every(x=>x>=3&&x<=4), gaps.join(','));
const inFrameOrCross=b=>b.row===0||b.row===5||b.col===0||b.col===9||b.row===2||b.row===3||b.col===4||b.col===5;
t('N5 marco + cruz', g.LEVELS[4].blocks.every(inFrameOrCross) && g.LEVELS[4].blocks.some(b=>b.col===4&&b.row===2), g.LEVELS[4].blocks.length);

// Sonidos
park(); g.loadLevel(1); played.length=0;
Object.assign(g.ball,{x:2,y:300,vx:-200,vy:0}); g.update(0.05);
t('rebote en pared suena ball-bounce', played.length===1 && /ball-bounce/.test(played[0]), JSON.stringify(played));
played.length=0;
g.paddle.x=300; Object.assign(g.ball,{x:360,y:g.paddle.y-10,vx:0,vy:300}); g.update(0.001);
t('rebote en paddle suena ball-bounce', played.length===1 && /ball-bounce/.test(played[0]), JSON.stringify(played));
played.length=0;
park(); g.loadLevel(1); const bs=g.blocks[13];
Object.assign(g.ball,{x:bs.x+10,y:bs.y+5,vx:0,vy:-300}); g.update(0.001);
t('romper bloque suena break-sound', played.length===1 && /break-sound/.test(played[0]), JSON.stringify(played));
t('romper bloque no suena ball-bounce', !played.some(s=>/ball-bounce/.test(s)), JSON.stringify(played));
played.length=0;
park(); Object.assign(g.ball,{x:2,y:300,vx:-200,vy:0}); g.update(0.05); g.update(0.0001);
Object.assign(g.ball,{x:798-16,y:300,vx:200}); g.update(0.05);
t('sonidos solapados no se cancelan', played.length===2, JSON.stringify(played));

// loadLevel y velocidad
g.loadLevel(1); const v1=Math.abs(g.ball.vy);
g.loadLevel(5); const v5=Math.abs(g.ball.vy);
t('loadLevel(5) fija nivel 5', g.currentLevel===5);
t('nivel 5 mas rapido que nivel 1', Math.round(v5/v1*100)/100===1.46, v1+' -> '+v5);
t('loadLevel reconstruye bloques del nivel', g.blocks.length===g.LEVELS[4].blocks.length, g.blocks.length);
t('loadLevel repone la pelota sobre el paddle', g.ball.y===g.paddle.y-16);
t('loadLevel deja todos los bloques vivos', g.blocks.every(b=>b.alive));

// Avance automatico y score acumulado
park(); g.loadLevel(1); g.score=0;
g.blocks.forEach(b=>b.alive=false); g.blocks[0].alive=true;
Object.assign(g.ball,{x:g.blocks[0].x+10,y:g.blocks[0].y+5,vx:0,vy:-300}); g.update(0.001);
t('avanza al nivel 2 al limpiar el 1', g.currentLevel===2 && g.gameState==='playing', g.currentLevel+'/'+g.gameState);
t('score acumula entre niveles', g.score===10, g.score);
t('nivel 2 recarga sus bloques', g.blocks.length===g.LEVELS[1].blocks.length, g.blocks.length);

park(); g.loadLevel(5); const scoreBefore=g.score;
g.blocks.forEach(b=>b.alive=false); g.blocks[0].alive=true;
Object.assign(g.ball,{x:g.blocks[0].x+10,y:g.blocks[0].y+5,vx:0,vy:-300}); g.update(0.001);
t('limpiar nivel 5 gana el juego', g.gameState==='win' && g.currentLevel===5, g.gameState+'/'+g.currentLevel);
t('score sigue acumulando en el ultimo nivel', g.score===scoreBefore+10, g.score);
ops.length=0; g.draw();
t('overlay Completaste el juego', ops.some(o=>o.op==='text'&&o.a[0]==='\u00A1Completaste el juego!'), JSON.stringify(ops.filter(o=>o.op==='text').map(o=>o.a[0])));

// Pausa
park(); g.loadLevel(1); g.isPaused=false;
winL.keydown({key:'p'}); t('tecla p pausa', g.isPaused===true);
winL.keydown({key:'p'}); t('tecla p reanuda', g.isPaused===false);
winL.keydown({key:'Escape'}); t('Escape pausa', g.isPaused===true);
winL.keydown({key:'Escape'}); t('Escape reanuda', g.isPaused===false);

winL.keydown({key:'p'});
Object.assign(g.ball,{x:400,y:300,vx:200,vy:200});
const frozen={x:g.ball.x,y:g.ball.y}, pScore=g.score;
g.update(0.1);
t('en pausa la pelota no avanza', g.ball.x===frozen.x&&g.ball.y===frozen.y, g.ball.x+','+g.ball.y);
t('en pausa el score no cambia', g.score===pScore);
ops.length=0; g.draw();
const ptxt=ops.filter(o=>o.op==='text').map(o=>o.a[0]);
t('overlay de pausa muestra PAUSA', ptxt.includes('PAUSA'), ptxt.join('|'));
t('overlay de pausa muestra 5 botones', ['1','2','3','4','5'].every(n=>ptxt.includes(n)), ptxt.join('|'));
t('PAUSE_BUTTONS define 5 rectangulos', g.PAUSE_BUTTONS.length===5 && g.PAUSE_BUTTONS.every(b=>b.w>0&&b.h>0));

const btn3=g.PAUSE_BUTTONS[2];
listeners.click({clientX:btn3.x+btn3.w/2, clientY:btn3.y+btn3.h/2});
t('clic en boton 3 carga nivel 3', g.currentLevel===3, g.currentLevel);
t('clic en boton 3 quita la pausa', g.isPaused===false);
t('nivel 3 con su velocidad', Math.round(Math.abs(g.ball.vy)/300*100)/100===1.21, g.ball.vy);

// HUD de nivel
park(); g.loadLevel(2); ops.length=0; g.draw();
const htxt=ops.filter(o=>o.op==='text').map(o=>o.a[0]);
t('HUD muestra el nivel', htxt.some(s=>/^NIVEL 2$/.test(s)), htxt.join(' | '));

// --- 04: selector de skins ---
const SKIN_IDS = ['retro','neon','pastel','pixel'];
const DRAW_FNS = ['drawBlock','drawPaddle','drawBall','drawExplosion'];
const COLOR_KEYS = ['background','hudColor','overlayFill','overlayColor'];

t('SKINS define exactamente 4 skins', Object.keys(g.SKINS).length===4, Object.keys(g.SKINS).join(','));
t('ids retro/neon/pastel/pixel', SKIN_IDS.every(id=>g.SKINS[id] && g.SKINS[id].id===id), Object.keys(g.SKINS).join(','));
t('cada skin expone sus constantes de color', SKIN_IDS.every(id=>COLOR_KEYS.every(k=>typeof g.SKINS[id][k]==='string')));
t('cada skin expone las 4 funciones de dibujo', SKIN_IDS.every(id=>DRAW_FNS.every(f=>typeof g.SKINS[id][f]==='function')));
t('cada skin tiene etiqueta', SKIN_IDS.every(id=>typeof g.SKINS[id].label==='string' && g.SKINS[id].label.length>0));
t('skin por defecto es retro', g.currentSkin==='retro', g.currentSkin);

// Persistencia
t('clave de localStorage', g.SKIN_STORAGE_KEY==='arkanoid.skin', g.SKIN_STORAGE_KEY);
g.setSkin('neon');
t('setSkin cambia la skin activa', g.currentSkin==='neon', g.currentSkin);
t('setSkin persiste en localStorage', storage.data['arkanoid.skin']==='neon', JSON.stringify(storage.data));
g.setSkin('noexiste');
t('setSkin ignora un id invalido', g.currentSkin==='neon', g.currentSkin);
storage.data['arkanoid.skin']='pastel';
t('readStoredSkin lee el valor guardado', g.readStoredSkin()==='pastel', g.readStoredSkin());
storage.data['arkanoid.skin']='basura';
t('readStoredSkin cae a retro con valor invalido', g.readStoredSkin()==='retro', g.readStoredSkin());
delete storage.data['arkanoid.skin'];
t('readStoredSkin cae a retro sin valor', g.readStoredSkin()==='retro', g.readStoredSkin());
storage.throwOnGet=true;
let leyoSinLanzar=true; let leido;
try { leido=g.readStoredSkin(); } catch(e) { leyoSinLanzar=false; }
t('readStoredSkin no propaga excepcion', leyoSinLanzar && leido==='retro', leido);
storage.throwOnGet=false;
storage.throwOnSet=true;
let escribioSinLanzar=true;
try { g.setSkin('pixel'); } catch(e) { escribioSinLanzar=false; }
t('setSkin no propaga excepcion al escribir', escribioSinLanzar && g.currentSkin==='pixel', g.currentSkin);
storage.throwOnSet=false;

// El cambio de skin no toca el estado de la partida
park(); g.loadLevel(3); g.score=777; g.lives=2; g.setSkin('retro');
const antesSkin={score:g.score,lives:g.lives,nivel:g.currentLevel,vivos:g.blocks.filter(b=>b.alive).length,x:g.ball.x,y:g.ball.y};
g.setSkin('pastel');
const despuesSkin={score:g.score,lives:g.lives,nivel:g.currentLevel,vivos:g.blocks.filter(b=>b.alive).length,x:g.ball.x,y:g.ball.y};
t('cambiar skin conserva la partida', JSON.stringify(antesSkin)===JSON.stringify(despuesSkin), JSON.stringify(despuesSkin));

// El fondo y el HUD siguen a la skin
const fondoDe = id => { g.setSkin(id); ops.length=0; g.draw(); const r=ops.find(o=>o.op==='fillRect'&&o.a[2]===800&&o.a[3]===600); return r&&r.fillStyle; };
t('fondo retro', fondoDe('retro')===g.SKINS.retro.background, fondoDe('retro'));
t('fondo pastel', fondoDe('pastel')===g.SKINS.pastel.background, fondoDe('pastel'));
t('fondos distintos entre retro y pastel', g.SKINS.retro.background!==g.SKINS.pastel.background);
g.setSkin('pastel'); ops.length=0; g.draw();
const hudPastel=ops.find(o=>o.op==='text'&&/^SCORE/.test(o.a[0]));
t('HUD usa el color de la skin', hudPastel && hudPastel.fillStyle===g.SKINS.pastel.hudColor, hudPastel && hudPastel.fillStyle);

// Cada skin delega en sus propias funciones de dibujo
const llamadasDe = id => {
  const s=g.SKINS[id]; const vistos={};
  const orig={}; DRAW_FNS.forEach(f=>{orig[f]=s[f]; s[f]=(...a)=>{vistos[f]=(vistos[f]||0)+1; return orig[f](...a);};});
  g.setSkin(id); park(); g.loadLevel(1);
  g.explosions.push({x:100,y:100,w:64,h:24,color:'red',elapsed:40});
  g.draw();
  DRAW_FNS.forEach(f=>{s[f]=orig[f];});
  g.explosions.length=0;
  return vistos;
};
SKIN_IDS.forEach(id=>{
  const v=llamadasDe(id);
  t('skin '+id+' delega bloques/paddle/pelota/explosion',
    v.drawBlock>0 && v.drawPaddle===1 && v.drawBall===1 && v.drawExplosion===1, JSON.stringify(v));
});

// Retro sigue usando el spritesheet
g.setSkin('retro'); park(); g.loadLevel(1); ops.length=0; g.draw();
t('retro dibuja con el spritesheet', ops.filter(o=>o.op==='img').length>=62, ops.filter(o=>o.op==='img').length);

// Las skins procedurales no usan drawImage
g.setSkin('neon'); ops.length=0; g.draw();
t('neon no usa el spritesheet', ops.filter(o=>o.op==='img').length===0, ops.filter(o=>o.op==='img').length);
t('neon aplica shadowBlur al dibujar', ops.some(o=>o.shadowBlur>0));
t('neon deja shadowBlur en 0 al terminar', ctxState.shadowBlur===0, ctxState.shadowBlur);
const hudNeon=ops.find(o=>o.op==='text'&&/^SCORE/.test(o.a[0]));
t('el HUD de neon no hereda glow', hudNeon && !hudNeon.shadowBlur, hudNeon && hudNeon.shadowBlur);

// Pastel: redondeo con fallback
g.setSkin('pastel'); ops.length=0; g.draw();
t('pastel usa roundRect cuando existe', ops.some(o=>o.op==='roundRect'));
ctxMissing.add('roundRect'); ops.length=0;
let pastelOk=true;
try { g.draw(); } catch(e) { pastelOk=false; }
t('pastel no lanza sin roundRect', pastelOk);
t('pastel cae a arcTo sin roundRect', ops.some(o=>o.op==='arcTo'));
ctxMissing.delete('roundRect');

// Pixel art: textura determinista
g.setSkin('pixel'); park(); g.loadLevel(1); ops.length=0; g.draw();
const trama1=ops.filter(o=>o.op==='fillRect').length;
ops.length=0; g.draw();
const trama2=ops.filter(o=>o.op==='fillRect').length;
t('pixel dibuja textura sobre los bloques', trama1>g.blocks.length, trama1);
t('textura de pixel es estable entre frames', trama1===trama2, trama1+' vs '+trama2);

// La geometria no cambia entre skins
const geoDe = id => { g.setSkin(id); park(); g.loadLevel(1); return JSON.stringify({b:[g.blocks[0].w,g.blocks[0].h],p:[g.paddle.w,g.paddle.h],ball:[g.ball.w,g.ball.h]}); };
t('geometria identica en las 4 skins', new Set(SKIN_IDS.map(geoDe)).size===1, SKIN_IDS.map(geoDe).join(' | '));
t('geometria es 64x24 / 162x14 / 16x16', geoDe('retro')===JSON.stringify({b:[64,24],p:[162,14],ball:[16,16]}), geoDe('retro'));

// Botones de skin en la pausa
t('SKIN_BUTTONS define 4 botones', g.SKIN_BUTTONS.length===4, g.SKIN_BUTTONS.length);
t('botones de skin tienen id valido', g.SKIN_BUTTONS.every(b=>SKIN_IDS.includes(b.id)));
t('botones de skin bajo los de nivel', g.SKIN_BUTTONS.every(b=>b.y>g.PAUSE_BUTTONS[0].y));
t('botones de skin centrados', g.SKIN_BUTTONS[0].x + g.SKIN_BUTTONS[3].x + g.SKIN_BUTTONS[3].w === 800, g.SKIN_BUTTONS[0].x);

park(); g.loadLevel(1); g.setSkin('retro'); g.isPaused=true; ops.length=0; g.draw();
const etiquetas=ops.filter(o=>o.op==='text').map(o=>o.a[0]);
t('la pausa muestra las 4 etiquetas de skin', SKIN_IDS.every(id=>etiquetas.includes(g.SKINS[id].label)), etiquetas.join('|'));

const btnNeon=g.SKIN_BUTTONS.find(b=>b.id==='neon');
listeners.click({clientX:btnNeon.x+btnNeon.w/2, clientY:btnNeon.y+btnNeon.h/2});
t('clic en boton de skin cambia la skin', g.currentSkin==='neon', g.currentSkin);
t('clic en boton de skin mantiene la pausa', g.isPaused===true, g.isPaused);
t('clic en skin persiste la eleccion', storage.data['arkanoid.skin']==='neon', JSON.stringify(storage.data));
t('clic en skin no cambia el nivel', g.currentLevel===1, g.currentLevel);

// Los botones de nivel siguen funcionando con el selector presente
const btnN4=g.PAUSE_BUTTONS[3];
listeners.click({clientX:btnN4.x+btnN4.w/2, clientY:btnN4.y+btnN4.h/2});
t('los botones de nivel siguen funcionando', g.currentLevel===4 && g.isPaused===false, g.currentLevel+'/'+g.isPaused);

// La explosion dura lo mismo en las 4 skins
const duracionDe = id => {
  g.setSkin(id); park(); g.loadLevel(1); g.explosions.length=0;
  const b=g.blocks[13];
  Object.assign(g.ball,{x:b.x+10,y:b.y+5,vx:0,vy:-300}); g.update(0.001); park();
  let ms=0; while(g.explosions.length>0 && ms<1000){ g.update(0.01); ms+=10; }
  return ms;
};
const duraciones=SKIN_IDS.map(duracionDe);
t('la explosion dura lo mismo en las 4 skins', duraciones.every(d=>d===duraciones[0]&&d>=150&&d<=170), duraciones.join(','));
g.setSkin('retro');

// Los bloques adyacentes no deben fundirse: toda skin deja hueco entre bloques
['neon','pastel','pixel'].forEach(id=>{
  g.setSkin(id); park(); g.loadLevel(1); ops.length=0; g.draw();
  const b=g.blocks[0];
  const rellenos=ops.filter(o=>(o.op==='fillRect'||o.op==='roundRect')&&o.a[0]>=b.x&&o.a[0]<b.x+b.w&&o.a[1]>=b.y&&o.a[1]<b.y+b.h);
  const cubreTodo=rellenos.some(o=>o.a[0]===b.x&&o.a[1]===b.y&&o.a[2]===b.w&&o.a[3]===b.h);
  t('skin '+id+' deja hueco entre bloques', !cubreTodo, JSON.stringify(rellenos.slice(0,2).map(o=>o.a.slice(0,4))));
});
g.setSkin('retro');

// El boton activo debe distinguirse por contraste real, no por un acento fijo
['retro','pastel','pixel'].forEach(id=>{
  g.setSkin(id); park(); g.loadLevel(1); g.isPaused=true; ops.length=0; g.draw();
  const skin=g.SKINS[id];
  const etq=ops.filter(o=>o.op==='text');
  const activo=etq.find(o=>o.a[0]===skin.label);
  const otro=etq.find(o=>o.a[0]===g.SKINS[id==='retro'?'neon':'retro'].label);
  t('skin '+id+': etiqueta activa invertida', activo && activo.fillStyle===skin.background, activo && activo.fillStyle);
  t('skin '+id+': activa contrasta con inactiva', activo && otro && activo.fillStyle!==otro.fillStyle, (activo&&activo.fillStyle)+' vs '+(otro&&otro.fillStyle));
});
g.setSkin('retro'); g.isPaused=false;
console.log('\n'+pass+' pass, '+fail+' fail');
process.exit(fail?1:0);
