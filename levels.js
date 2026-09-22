// Level definitions for spec 03. Each level lists only the occupied cells of the
// 10x6 grid, plus the multiplier applied to the base ball speed.
const LEVEL_COLS = 10;
const LEVEL_ROWS = 6;

// Fixed gap columns for level 4. Hand-authored instead of randomised so the
// layout is reproducible across reloads and testable.
const LEVEL4_GAPS = [
  [ 1, 4, 7 ],
  [ 0, 3, 6, 9 ],
  [ 2, 5, 8 ],
  [ 1, 2, 7, 8 ],
  [ 0, 4, 9 ],
  [ 3, 4, 5, 6 ],
];

function buildLevel( palette, isFilled, colorFor ) {
  const cells = [];
  for ( let row = 0; row < LEVEL_ROWS; row++ ) {
    for ( let col = 0; col < LEVEL_COLS; col++ ) {
      if ( !isFilled( col, row ) ) continue;
      cells.push( { col, row, color: colorFor( col, row, palette ) } );
    }
  }
  return cells;
}

const byRow = ( col, row, palette ) => palette[ row % palette.length ];

// 1 — full grid, one colour per row (same as the MVP).
const LEVEL_1 = buildLevel(
  [ 'red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green' ],
  () => true,
  byRow,
);

// 2 — centred pyramid: each row is two cells wider than the one above it.
const LEVEL_2 = buildLevel(
  [ 'cyan', 'green', 'yellow' ],
  ( col, row ) => {
    const width = row * 2;
    const start = ( LEVEL_COLS - width ) / 2;
    return col >= start && col < start + width;
  },
  byRow,
);

// 3 — checkerboard on the even cells.
const LEVEL_3 = buildLevel(
  [ 'magenta', 'hotpink' ],
  ( col, row ) => ( col + row ) % 2 === 0,
  byRow,
);

// 4 — full rows with three or four gaps each.
const LEVEL_4 = buildLevel(
  [ 'red', 'yellow', 'gray' ],
  ( col, row ) => !LEVEL4_GAPS[ row ].includes( col ),
  byRow,
);

// 5 — outer frame plus a central cross.
const isFrame = ( col, row ) =>
  row === 0 || row === LEVEL_ROWS - 1 || col === 0 || col === LEVEL_COLS - 1;
const isCrossColumn = col => col === 4 || col === 5;
const isCrossRow = row => row === 2 || row === 3;

const LEVEL_5 = buildLevel(
  [ 'gray', 'cyan', 'red' ],
  ( col, row ) => isFrame( col, row ) || isCrossColumn( col ) || isCrossRow( row ),
  ( col, row, palette ) => {
    if ( isFrame( col, row ) ) return palette[ 0 ];
    if ( isCrossColumn( col ) ) return palette[ 1 ];
    return palette[ 2 ];
  },
);

const LEVELS = [
  { speed: 1.0, blocks: LEVEL_1 },
  { speed: 1.1, blocks: LEVEL_2 },
  { speed: 1.21, blocks: LEVEL_3 },
  { speed: 1.33, blocks: LEVEL_4 },
  { speed: 1.46, blocks: LEVEL_5 },
];
