const assert = require('assert');
const { PIECES, isValidPawnMove, isValidRookMove, isMoveValid } = require('../script.js');

function createBoard() {
  return {};
}

function setPiece(board, row, col, piece) {
  board[row] = board[row] || {};
  board[row][col] = piece;
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`\u2713 ${name}`);
    passed++;
  } catch (err) {
    console.error(`\u2717 ${name}`);
    console.error(err.message);
    failed++;
  }
}

// isValidPawnMove tests

test('white pawn moves forward one square', () => {
  const board = createBoard();
  setPiece(board, 6, 0, PIECES.white.pawn);
  assert.strictEqual(isValidPawnMove(6, 0, 5, 0, 'white', board), true);
});

test('white pawn cannot move into piece', () => {
  const board = createBoard();
  setPiece(board, 6, 0, PIECES.white.pawn);
  setPiece(board, 5, 0, PIECES.black.pawn);
  assert.strictEqual(isValidPawnMove(6, 0, 5, 0, 'white', board), false);
});

test('white pawn capture diagonal', () => {
  const board = createBoard();
  setPiece(board, 6, 0, PIECES.white.pawn);
  setPiece(board, 5, 1, PIECES.black.knight);
  assert.strictEqual(isValidPawnMove(6, 0, 5, 1, 'white', board), true);
});

// isValidRookMove tests

test('rook horizontal move clear path', () => {
  const board = createBoard();
  setPiece(board, 4, 0, PIECES.white.rook);
  assert.strictEqual(isValidRookMove(4, 0, 4, 5, board), true);
});

test('rook horizontal blocked by piece', () => {
  const board = createBoard();
  setPiece(board, 4, 0, PIECES.white.rook);
  setPiece(board, 4, 3, PIECES.black.pawn);
  assert.strictEqual(isValidRookMove(4, 0, 4, 5, board), false);
});

// isMoveValid tests

test('isMoveValid prevents capturing own piece', () => {
  const board = createBoard();
  setPiece(board, 4, 0, PIECES.white.rook);
  setPiece(board, 4, 5, PIECES.white.pawn);
  assert.strictEqual(isMoveValid(PIECES.white.rook, 4, 0, 4, 5, board), false);
});

test('isMoveValid allows pawn capture', () => {
  const board = createBoard();
  setPiece(board, 6, 1, PIECES.white.pawn);
  setPiece(board, 5, 2, PIECES.black.knight);
  assert.strictEqual(isMoveValid(PIECES.white.pawn, 6, 1, 5, 2, board), true);
});

process.on('exit', () => {
  console.log(`\nPassed: ${passed}, Failed: ${failed}`);
  if (failed) process.exitCode = 1;
});
