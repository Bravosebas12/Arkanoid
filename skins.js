// Skin definitions for spec 04. Every skin exposes the same contract:
// five colour constants plus drawBlock / drawPaddle / drawBall / drawExplosion.
// game.js never branches on the skin id, it only delegates to the active object.
const SKIN_STORAGE_KEY = 'arkanoid.skin';

// The spritesheet's colour names do not match what they look like on screen:
// the 'cyan' sprite reads green, 'green' reads light blue, 'magenta' reads purple
// and 'hotpink' reads orange. The procedural palettes below follow the RENDERED
// hue, not the name, so a row keeps its identity when the skin changes.
const NEON_BLOCKS = {
  red: '#ff2d55',
  yellow: '#ffe93d',
  cyan: '#2dff9e',
  magenta: '#9b5cff',
  hotpink: '#ff8a2d',
  green: '#2dc4ff',
  gray: '#c9d1d9',
};

const PASTEL_BLOCKS = {
  red: '#f2a0a8',
  yellow: '#f0dda2',
  cyan: '#a8e0c4',
  magenta: '#c3b2ea',
  hotpink: '#f2c9a0',
  green: '#a8cbe8',
  gray: '#cdd2d8',
};

const PASTEL_BORDERS = {
  red: '#d4737e',
  yellow: '#c9b06a',
  cyan: '#77bd9b',
  magenta: '#9887c4',
  hotpink: '#cc9b6d',
  green: '#78a3c4',
  gray: '#a2a9b2',
};

const PIXEL_BLOCKS = {
  red: '#c43d4e',
  yellow: '#d4b843',
  cyan: '#3fae79',
  magenta: '#6b4fc4',
  hotpink: '#cc7a36',
  green: '#4093c4',
  gray: '#7d838c',
};

const PIXEL_CELL = 4;
const PIXEL_PAD = 2;

// Roughly 30% lighter, used for the pixel-art texture and pastel highlights.
function lighten( hex, amount ) {
  const n = parseInt( hex.slice( 1 ), 16 );
  const mix = c => Math.round( c + ( 255 - c ) * amount );
  return `rgb(${ mix( ( n >> 16 ) & 255 ) }, ${ mix( ( n >> 8 ) & 255 ) }, ${ mix( n & 255 ) })`;
}

// ctx.roundRect is recent enough that a fallback is cheaper than a polyfill check
// scattered around the drawing code.
function roundRectPath( ctx, x, y, w, h, r ) {
  const radius = Math.min( r, w / 2, h / 2 );
  ctx.beginPath();
  if ( typeof ctx.roundRect === 'function' ) {
    ctx.roundRect( x, y, w, h, radius );
    return;
  }
  ctx.moveTo( x + radius, y );
  ctx.arcTo( x + w, y, x + w, y + h, radius );
  ctx.arcTo( x + w, y + h, x, y + h, radius );
  ctx.arcTo( x, y + h, x, y, radius );
  ctx.arcTo( x, y, x + w, y, radius );
  ctx.closePath();
}

function clearGlow( ctx ) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

const SKINS = {

  retro: {
    id: 'retro',
    label: 'Retro',
    background: '#000000',
    hudColor: '#ffffff',
    overlayFill: 'rgba(0, 0, 0, 0.7)',
    overlayColor: '#ffffff',

    drawBlock( ctx, block ) {
      drawSprite( ctx, 'block_' + block.color, block.x, block.y, block.w, block.h );
    },
    drawPaddle( ctx, paddle ) {
      drawSprite( ctx, 'paddle', paddle.x, paddle.y, paddle.w, paddle.h );
    },
    drawBall( ctx, ball ) {
      drawSprite( ctx, 'ball', ball.x, ball.y, ball.w, ball.h );
    },
    drawExplosion( ctx, exp, progress ) {
      const frames = EXPLOSION_FRAMES[ exp.color ];
      if ( !frames ) return;
      const i = Math.min( Math.floor( progress * frames.length ), frames.length - 1 );
      drawFrame( ctx, frames[ i ], exp.x, exp.y, exp.w, exp.h );
    },
  },

  neon: {
    id: 'neon',
    label: 'Neon',
    background: '#000000',
    hudColor: '#7dfcd0',
    overlayFill: 'rgba(0, 0, 0, 0.78)',
    overlayColor: '#7dfcd0',

    drawBlock( ctx, block ) {
      const color = NEON_BLOCKS[ block.color ] || '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.fillRect( block.x + 3, block.y + 3, block.w - 6, block.h - 6 );
      clearGlow( ctx );
    },
    drawPaddle( ctx, paddle ) {
      ctx.shadowColor = '#7dfcd0';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#7dfcd0';
      ctx.fillRect( paddle.x, paddle.y, paddle.w, paddle.h );
      clearGlow( ctx );
    },
    drawBall( ctx, ball ) {
      const r = ball.w / 2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc( ball.x + r, ball.y + r, r, 0, Math.PI * 2 );
      ctx.fill();
      clearGlow( ctx );
    },
    drawExplosion( ctx, exp, progress ) {
      const color = NEON_BLOCKS[ exp.color ] || '#ffffff';
      const cx = exp.x + exp.w / 2;
      const cy = exp.y + exp.h / 2;
      const radius = ( exp.w / 2 ) * ( 0.4 + progress );
      ctx.globalAlpha = 1 - progress;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc( cx, cy, radius, 0, Math.PI * 2 );
      ctx.stroke();
      clearGlow( ctx );
      ctx.globalAlpha = 1;
    },
  },

  pastel: {
    id: 'pastel',
    label: 'Pastel',
    background: '#f4efe6',
    hudColor: '#4a4a52',
    overlayFill: 'rgba(244, 239, 230, 0.88)',
    overlayColor: '#3a3a42',

    drawBlock( ctx, block ) {
      ctx.fillStyle = PASTEL_BLOCKS[ block.color ] || '#dddddd';
      ctx.strokeStyle = PASTEL_BORDERS[ block.color ] || '#bbbbbb';
      ctx.lineWidth = 2;
      roundRectPath( ctx, block.x + 2, block.y + 2, block.w - 4, block.h - 4, 8 );
      ctx.fill();
      ctx.stroke();
    },
    drawPaddle( ctx, paddle ) {
      ctx.fillStyle = '#8fb7d9';
      ctx.strokeStyle = '#6f93b2';
      ctx.lineWidth = 2;
      roundRectPath( ctx, paddle.x, paddle.y, paddle.w, paddle.h, paddle.h / 2 );
      ctx.fill();
      ctx.stroke();
    },
    drawBall( ctx, ball ) {
      const r = ball.w / 2;
      ctx.fillStyle = '#e8927c';
      ctx.beginPath();
      ctx.arc( ball.x + r, ball.y + r, r, 0, Math.PI * 2 );
      ctx.fill();
    },
    drawExplosion( ctx, exp, progress ) {
      const cx = exp.x + exp.w / 2;
      const cy = exp.y + exp.h / 2;
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = PASTEL_BLOCKS[ exp.color ] || '#dddddd';
      ctx.beginPath();
      ctx.arc( cx, cy, ( exp.w / 2 ) * ( 0.3 + progress * 0.9 ), 0, Math.PI * 2 );
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  },

  pixel: {
    id: 'pixel',
    label: 'Pixel art',
    background: '#14161a',
    hudColor: '#e8e8e8',
    overlayFill: 'rgba(20, 22, 26, 0.82)',
    overlayColor: '#e8e8e8',

    drawBlock( ctx, block ) {
      const base = PIXEL_BLOCKS[ block.color ] || '#888888';
      // Inset so neighbouring blocks of the same colour stay distinguishable
      // instead of merging into one continuous bar.
      const pad = PIXEL_PAD;
      const left = block.x + pad;
      const top = block.y + pad;
      const right = block.x + block.w - pad;
      const bottom = block.y + block.h - pad;

      ctx.fillStyle = base;
      ctx.fillRect( left, top, right - left, bottom - top );

      // Texture derived from absolute coordinates, so it never flickers between
      // frames and never shifts when a block is redrawn.
      ctx.fillStyle = lighten( base, 0.3 );
      for ( let dy = 0; dy < block.h; dy += PIXEL_CELL ) {
        for ( let dx = 0; dx < block.w; dx += PIXEL_CELL ) {
          const x = block.x + dx;
          const y = block.y + dy;
          if ( x < left || y < top || x + PIXEL_CELL > right || y + PIXEL_CELL > bottom ) continue;
          if ( ( x / PIXEL_CELL + y / PIXEL_CELL ) % 3 !== 0 ) continue;
          ctx.fillRect( x, y, PIXEL_CELL, PIXEL_CELL );
        }
      }
    },
    drawPaddle( ctx, paddle ) {
      ctx.fillStyle = '#9aa4b2';
      ctx.fillRect( paddle.x, paddle.y, paddle.w, paddle.h );
      ctx.fillStyle = '#d8dee8';
      for ( let dx = 0; dx < paddle.w; dx += PIXEL_CELL * 2 ) {
        ctx.fillRect( paddle.x + dx, paddle.y, PIXEL_CELL, PIXEL_CELL );
      }
    },
    drawBall( ctx, ball ) {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect( ball.x, ball.y, ball.w, ball.h );
      ctx.fillStyle = '#9aa4b2';
      ctx.fillRect( ball.x, ball.y + ball.h - PIXEL_CELL, PIXEL_CELL, PIXEL_CELL );
      ctx.fillRect( ball.x + ball.w - PIXEL_CELL, ball.y, PIXEL_CELL, PIXEL_CELL );
    },
    drawExplosion( ctx, exp, progress ) {
      const steps = 4;
      const step = Math.min( Math.floor( progress * steps ), steps - 1 );
      ctx.globalAlpha = 1 - step / steps;
      ctx.fillStyle = lighten( PIXEL_BLOCKS[ exp.color ] || '#888888', 0.4 );
      const spread = step + 1;
      for ( let dy = 0; dy < exp.h; dy += PIXEL_CELL ) {
        for ( let dx = 0; dx < exp.w; dx += PIXEL_CELL ) {
          const cx = ( exp.x + dx ) / PIXEL_CELL;
          const cy = ( exp.y + dy ) / PIXEL_CELL;
          if ( ( cx + cy ) % spread !== 0 ) continue;
          ctx.fillRect( exp.x + dx, exp.y + dy, PIXEL_CELL, PIXEL_CELL );
        }
      }
      ctx.globalAlpha = 1;
    },
  },

};
