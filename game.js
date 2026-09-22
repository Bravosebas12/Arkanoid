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

let gameState = 'playing';
let score = 0;
let lives = START_LIVES;

let paddle = { x: ( WIDTH - PADDLE_W ) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
let ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: BALL_VX, vy: BALL_VY };
let blocks = [];

const keys = { left: false, right: false };

function buildBlocks() {
  const grid = [];
  for ( let row = 0; row < BLOCK_ROWS; row++ ) {
    for ( let col = 0; col < BLOCK_COLS; col++ ) {
      grid.push( {
        x: BLOCKS_ORIGIN_X + col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: BLOCK_COLORS[ row ],
        alive: true,
      } );
    }
  }
  return grid;
}

function resetBall() {
  ball.x = paddle.x + paddle.w / 2 - ball.w / 2;
  ball.y = paddle.y - ball.h;
  ball.vx = BALL_VX;
  ball.vy = BALL_VY;
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
  } else if ( ball.x + ball.w >= WIDTH ) {
    ball.x = WIDTH - ball.w;
    ball.vx = -Math.abs( ball.vx );
  }
  if ( ball.y <= 0 ) {
    ball.y = 0;
    ball.vy = Math.abs( ball.vy );
  }

  // Paddle: only bounce while descending, so the ball never sticks.
  if ( ball.vy > 0 && overlaps( ball, paddle ) ) {
    ball.y = paddle.y - ball.h;
    ball.vy = -Math.abs( ball.vy );
  }

  // Fell below the canvas.
  if ( ball.y > HEIGHT ) loseLife();
}

function updateBlocks() {
  for ( const block of blocks ) {
    if ( !block.alive ) continue;
    if ( !overlaps( ball, block ) ) continue;

    block.alive = false;
    score += BLOCK_SCORE;
    ball.vy = -ball.vy;
    break; // One block per frame keeps the bounce unambiguous.
  }

  if ( blocks.every( b => !b.alive ) ) gameState = 'win';
}

function update( dt ) {
  if ( gameState !== 'playing' ) return;
  updatePaddle( dt );
  updateBall( dt );
  updateBlocks();
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.fillText( `SCORE ${ score }`, 16, 16 );

  ctx.textAlign = 'right';
  ctx.fillText( `VIDAS ${ lives }`, WIDTH - 16, 16 );
}

function drawOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect( 0, 0, WIDTH, HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 56px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText( gameState === 'win' ? '\u00A1GANASTE!' : 'GAME OVER', WIDTH / 2, HEIGHT / 2 );
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, WIDTH, HEIGHT );

  for ( const block of blocks ) {
    if ( block.alive ) drawSprite( ctx, 'block_' + block.color, block.x, block.y, block.w, block.h );
  }

  drawSprite( ctx, 'paddle', paddle.x, paddle.y, paddle.w, paddle.h );
  drawSprite( ctx, 'ball', ball.x, ball.y, ball.w, ball.h );

  if ( gameState === 'playing' ) {
    drawHud();
  } else {
    drawOverlay();
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

canvas.addEventListener( 'mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  paddle.x = ( e.clientX - rect.left ) * ( WIDTH / rect.width ) - paddle.w / 2;
  clampPaddle();
} );

window.addEventListener( 'keydown', e => {
  if ( e.key === 'ArrowLeft' ) keys.left = true;
  if ( e.key === 'ArrowRight' ) keys.right = true;
} );

window.addEventListener( 'keyup', e => {
  if ( e.key === 'ArrowLeft' ) keys.left = false;
  if ( e.key === 'ArrowRight' ) keys.right = false;
} );

blocks = buildBlocks();
resetBall();
loadSpritesheet( () => requestAnimationFrame( loop ) );
