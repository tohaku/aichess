const assert = require('assert');
const { PIECES, initialBoardSetup, boardToFEN, parseAlgebraicMove } = require('../chess');

function cloneBoard(board) {
  return JSON.parse(JSON.stringify(board));
}

const initialFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
assert.strictEqual(boardToFEN(initialBoardSetup, 'white'), initialFEN, 'Initial FEN should match standard chess opening');

const board = cloneBoard(initialBoardSetup);
const move = parseAlgebraicMove('e2e4', 'white', board);
assert.deepStrictEqual(move, {
  fromRow: 6,
  fromCol: 4,
  toRow: 4,
  toCol: 4,
  pieceSymbol: PIECES.white.pawn,
  promotion: null
}, 'e2e4 should parse correctly');

assert.strictEqual(parseAlgebraicMove('e9e4', 'white', board), null, 'Invalid coordinates should return null');

console.log('All tests passed.');
