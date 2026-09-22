const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const PADDLE_W = 162;
const PADDLE_H = 14;
const PADDLE_Y = 560;
const PADDLE_SPEED = 400;

const BALL_SIZE = 16;
const BALL_VX = 200;
const BALL_VY = -300;

const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCK_COLORS = [ 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ];
const BLOCKS_ORIGIN_X = ( WIDTH - BLOCK_COLS * BLOCK_W ) / 2;
const BLOCKS_ORIGIN_Y = 80;

const BLOCK_SCORE = 10;
const START_LIVES = 3;
const LAST_LEVEL = LEVELS.length;

const PAUSE_BTN_W = 60;
const PAUSE_BTN_H = 60;
const PAUSE_BTN_GAP = 20;
const PAUSE_BTN_Y = 320;
const PAUSE_ROW_W = LAST_LEVEL * PAUSE_BTN_W + ( LAST_LEVEL - 1 ) * PAUSE_BTN_GAP;

const PAUSE_BUTTONS = LEVELS.map( ( _, i ) => ( {
  level: i + 1,
  x: ( WIDTH - PAUSE_ROW_W ) / 2 + i * ( PAUSE_BTN_W + PAUSE_BTN_GAP ),
  y: PAUSE_BTN_Y,
  w: PAUSE_BTN_W,
  h: PAUSE_BTN_H,
} ) );

const bounceSound = new Audio( 'assets/sounds/ball-bounce.mp3' );
const breakSound = new Audio( 'assets/sounds/break-sound.mp3' );

// cloneNode() per hit so overlapping effects never cut each other off.
function playSound( sound ) {
  const node = sound.cloneNode();
  const played = node.play();
  if ( played && played.catch ) played.catch( () => {} );
}

let gameState = 'playing';
let currentLevel = 1;
let isPaused = false;
let score = 0;
let lives = START_LIVES;

let paddle = { x: ( WIDTH - PADDLE_W ) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
let ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: BALL_VX, vy: BALL_VY };
let blocks = [];
let explosions = [];

const keys = { left: false, right: false };

function buildBlocks( level ) {
  return LEVELS[ level - 1 ].blocks.map( cell => ( {
    x: BLOCKS_ORIGIN_X + cell.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + cell.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: cell.color,
    alive: true,
  } ) );
}

function loadLevel( level ) {
  currentLevel = level;
  blocks = buildBlocks( level );
  explosions = [];
  resetBall();
}

function resetBall() {
  const speed = LEVELS[ currentLevel - 1 ].speed;
  ball.x = paddle.x + paddle.w / 2 - ball.w / 2;
  ball.y = paddle.y - ball.h;
  ball.vx = BALL_VX * speed;
  ball.vy = BALL_VY * speed;
}

function clampPaddle() {
  paddle.x = Math.max( 0, Math.min( WIDTH - paddle.w, paddle.x ) );
}

function overlaps( a, b ) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function loseLife() {
  lives--;
  if ( lives > 0 ) {
    resetBall();
  } else {
    gameState = 'gameover';
  }
}

function updatePaddle( dt ) {
  if ( keys.left ) paddle.x -= PADDLE_SPEED * dt;
  if ( keys.right ) paddle.x += PADDLE_SPEED * dt;
  clampPaddle();
}

function updateBall( dt ) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Walls: left, right, ceiling.
  if ( ball.x <= 0 ) {
    ball.x = 0;
    ball.vx = Math.abs( ball.vx );
    playSound( bounceSound );
  } else if ( ball.x + ball.w >= WIDTH ) {
    ball.x = WIDTH - ball.w;
    ball.vx = -Math.abs( ball.vx );
    playSound( bounceSound );
  }
  if ( ball.y <= 0 ) {
    ball.y = 0;
    ball.vy = Math.abs( ball.vy );
    playSound( bounceSound );
  }

  // Paddle: only bounce while descending, so the ball never sticks.
  if ( ball.vy > 0 && overlaps( ball, paddle ) ) {
    ball.y = paddle.y - ball.h;
    ball.vy = -Math.abs( ball.vy );
    playSound( bounceSound );
  }

  // Fell below the canvas.
  if ( ball.y > HEIGHT ) loseLife();
}

function updateBlocks() {
  for ( const block of blocks ) {
    if ( !block.alive ) continue;
    if ( !overlaps( ball, block ) ) continue;

    block.alive = false;
    explosions.push( { x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 } );
    score += BLOCK_SCORE;
    ball.vy = -ball.vy;
    playSound( breakSound );
    break; // One block per frame keeps the bounce unambiguous.
  }

  if ( !blocks.every( b => !b.alive ) ) return;

  if ( currentLevel < LAST_LEVEL ) {
    loadLevel( currentLevel + 1 );
  } else {
    gameState = 'win';
  }
}

function updateExplosions( dt ) {
  for ( const exp of explosions ) exp.elapsed += dt * 1000;
  explosions = explosions.filter( exp => exp.elapsed < EXPLOSION_DURATION );
}

function update( dt ) {
  if ( gameState !== 'playing' || isPaused ) return;
  updatePaddle( dt );
  updateBall( dt );
  updateBlocks();
  updateExplosions( dt );
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillText( `SCORE ${ score }`, 16, 16 );

  ctx.textAlign = 'center';
  ctx.fillText( `NIVEL ${ currentLevel }`, WIDTH / 2, 16 );

  ctx.textAlign = 'right';
  ctx.fillText( `VIDAS ${ lives }`, WIDTH - 16, 16 );
}

function drawPauseOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, WIDTH, HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 56px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( 'PAUSA', WIDTH / 2, 220 );

  ctx.font = '18px monospace';
  ctx.fillText( 'Elige un nivel', WIDTH / 2, 280 );

  for ( const btn of PAUSE_BUTTONS ) {
    ctx.strokeStyle = btn.level === currentLevel ? '#ff0' : '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect( btn.x, btn.y, btn.w, btn.h );

    ctx.fillStyle = btn.level === currentLevel ? '#ff0' : '#fff';
    ctx.font = 'bold 28px monospace';
    ctx.fillText( String( btn.level ), btn.x + btn.w / 2, btn.y + btn.h / 2 );
  }
}

function drawOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, WIDTH, HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 56px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( gameState === 'win' ? '\u00A1Completaste el juego!' : 'GAME OVER', WIDTH / 2, HEIGHT / 2 );
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, WIDTH, HEIGHT );

  for ( const block of blocks ) {
    if ( block.alive ) drawSprite( ctx, 'block_' + block.color, block.x, block.y, block.w, block.h );
  }

  for ( const exp of explosions ) {
    const frames = EXPLOSION_FRAMES[ exp.color ];
    if ( !frames ) continue;
    const i = Math.min( Math.floor( exp.elapsed / EXPLOSION_DURATION * frames.length ), frames.length - 1 );
    drawFrame( ctx, frames[ i ], exp.x, exp.y, exp.w, exp.h );
  }

  drawSprite( ctx, 'paddle', paddle.x, paddle.y, paddle.w, paddle.h );
  drawSprite( ctx, 'ball', ball.x, ball.y, ball.w, ball.h );

  if ( gameState !== 'playing' ) {
    drawOverlay();
  } else if ( isPaused ) {
    drawPauseOverlay();
  } else {
    drawHud();
  }
}

let lastTime = 0;

function loop( timestamp ) {
  const dt = lastTime ? Math.min( ( timestamp - lastTime ) / 1000, 0.05 ) : 0;
  lastTime = timestamp;

  update( dt );
  draw();
  requestAnimationFrame( loop );
}

function canvasPoint( e ) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ( e.clientX - rect.left ) * ( WIDTH / rect.width ),
    y: ( e.clientY - rect.top ) * ( HEIGHT / rect.height ),
  };
}

canvas.addEventListener( 'mousemove', e => {
  if ( isPaused ) return;
  paddle.x = canvasPoint( e ).x - paddle.w / 2;
  clampPaddle();
} );

canvas.addEventListener( 'click', e => {
  if ( !isPaused ) return;
  const { x, y } = canvasPoint( e );
  const hit = PAUSE_BUTTONS.find(
    btn => x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h,
  );
  if ( !hit ) return;
  loadLevel( hit.level );
  isPaused = false;
} );

window.addEventListener( 'keydown', e => {
  if ( e.key === 'ArrowLeft' ) keys.left = true;
  if ( e.key === 'ArrowRight' ) keys.right = true;
  if ( e.key === 'p' || e.key === 'P' || e.key === 'Escape' ) isPaused = !isPaused;
} );

window.addEventListener( 'keyup', e => {
  if ( e.key === 'ArrowLeft' ) keys.left = false;
  if ( e.key === 'ArrowRight' ) keys.right = false;
} );

loadLevel( 1 );
loadSpritesheet( () => requestAnimationFrame( loop ) );
