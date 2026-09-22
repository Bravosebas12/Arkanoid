const fs=require('fs'),vm=require('vm');
const ops=[];
const stubCtx=new Proxy({},{get:(t,k)=>{
  if(k==='fillText')return(...a)=>ops.push({op:'text',a});
  if(k==='drawImage')return(...a)=>ops.push({op:'img',a});
  return ()=>{};
},set:()=>true});
const listeners={},winL={};
const canvasEl={width:800,height:600,getContext:()=>stubCtx,addEventListener:(t,f)=>{listeners[t]=f},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})};
const sandbox={console,Math,setTimeout,
  document:{getElementById:()=>canvasEl,createElement:()=>({width:0,height:0,getContext:()=>stubCtx})},
  window:{addEventListener:(t,f)=>{winL[t]=f}},
  Image:class{set src(v){this.onload&&this.onload();}},
  requestAnimationFrame:()=>{}};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../assets/spritesheet.js','utf8'),sandbox);
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

park(); g.blocks.forEach(b=>b.alive=false);
park(); Object.assign(g.ball,{x:2,y:300,vx:-200,vy:-300}); g.update(0.05);
t('rebote pared izquierda', g.ball.vx>0, g.ball.vx);
park(); Object.assign(g.ball,{x:790,y:300,vx:200});        g.update(0.05);
t('rebote pared derecha', g.ball.vx<0, g.ball.vx);
park(); Object.assign(g.ball,{x:400,y:2,vx:0,vy:-300});    g.update(0.05);
t('rebote techo', g.ball.vy>0, g.ball.vy);

park(); g.paddle.x=300; Object.assign(g.ball,{x:360,y:g.paddle.y-10,vx:0,vy:300}); g.update(0.001);
t('rebote en paddle', g.ball.vy<0, g.ball.vy);

park(); g.blocks.forEach(b=>b.alive=true);
const before=g.score, target=g.blocks[25];
Object.assign(g.ball,{x:target.x+10,y:target.y+5,vx:0,vy:-300}); g.update(0.001);
t('bloque destruido', target.alive===false);
t('score +10', g.score===before+10, g.score);
t('rebote en bloque', g.ball.vy>0, g.ball.vy);

park(); g.blocks.forEach(b=>b.alive=true);
const lv=g.lives; Object.assign(g.ball,{x:400,y:700,vx:0,vy:300}); g.update(0.001);
t('pierde una vida', g.lives===lv-1, g.lives);
t('pelota reposicionada', g.ball.y===g.paddle.y-16 && g.ball.vy===-300);

g.ball.y=700; g.update(0.001);
g.ball.y=700; g.update(0.001);
t('gameover con 0 vidas', g.gameState==='gameover'&&g.lives===0, g.gameState+'/'+g.lives);
ops.length=0; g.draw();
t('overlay GAME OVER', ops.some(o=>o.op==='text'&&o.a[0]==='GAME OVER'));

g.gameState='playing'; g.lives=3;
g.blocks.forEach(b=>b.alive=false); const last=g.blocks[0]; last.alive=true;
Object.assign(g.ball,{x:last.x+10,y:last.y+5,vx:0,vy:-300}); g.update(0.001);
t('victoria', g.gameState==='win', g.gameState);
ops.length=0; g.draw();
t('overlay GANASTE', ops.some(o=>o.op==='text'&&o.a[0]==='\u00A1GANASTE!'), JSON.stringify(ops.filter(o=>o.op==='text').map(o=>o.a[0])));

g.gameState='playing'; ops.length=0; g.draw();
const txt=ops.filter(o=>o.op==='text').map(o=>o.a[0]);
t('HUD score visible', txt.some(s=>/^SCORE /.test(s)), txt.join(' | '));
t('HUD vidas visible', txt.some(s=>/^VIDAS /.test(s)), txt.join(' | '));
t('sin HUD en overlay', (g.gameState='win', ops.length=0, g.draw(), !ops.some(o=>/^SCORE/.test(o.a&&o.a[0]))));


// --- 02: animacion de explosion ---
const expDraws = () => ops.filter(o=>o.op==='img' && o.a[1]>=256);

park(); g.blocks.forEach(b=>b.alive=true);
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
park(); g.blocks.forEach(b=>b.alive=false); g.blocks[0].alive=true; g.explosions.length=0;
Object.assign(g.ball,{x:g.blocks[0].x+10,y:g.blocks[0].y+5,vx:0,vy:-300}); g.update(0.001);
t('victoria con explosion activa', g.gameState==='win' && g.explosions.length===1, g.gameState+'/'+g.explosions.length);
console.log('\n'+pass+' pass, '+fail+' fail');
process.exit(fail?1:0);
