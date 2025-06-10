// Utility functions and data structures for testing

const PIECES = {
  white: {
    king: './images/king.png',
    queen: './images/queen.png',
    rook: './images/rook.png',
    bishop: './images/bishop.png',
    knight: './images/knight.png',
    pawn: './images/pawn.png'
  },
  black: {
    king: './images/king1.png',
    queen: './images/queen1.png',
    rook: './images/rook1.png',
    bishop: './images/bishop1.png',
    knight: './images/knight1.png',
    pawn: './images/pawn1.png'
  }
};

const initialBoardSetup = {
  0: { 0: PIECES.black.rook, 1: PIECES.black.knight, 2: PIECES.black.bishop, 3: PIECES.black.queen, 4: PIECES.black.king, 5: PIECES.black.bishop, 6: PIECES.black.knight, 7: PIECES.black.rook },
  1: { 0: PIECES.black.pawn, 1: PIECES.black.pawn, 2: PIECES.black.pawn, 3: PIECES.black.pawn, 4: PIECES.black.pawn, 5: PIECES.black.pawn, 6: PIECES.black.pawn, 7: PIECES.black.pawn },
  6: { 0: PIECES.white.pawn, 1: PIECES.white.pawn, 2: PIECES.white.pawn, 3: PIECES.white.pawn, 4: PIECES.white.pawn, 5: PIECES.white.pawn, 6: PIECES.white.pawn, 7: PIECES.white.pawn },
  7: { 0: PIECES.white.rook, 1: PIECES.white.knight, 2: PIECES.white.bishop, 3: PIECES.white.queen, 4: PIECES.white.king, 5: PIECES.white.bishop, 6: PIECES.white.knight, 7: PIECES.white.rook }
};

function getPieceColor(pieceSymbol) {
  if (!pieceSymbol) return null;
  for (const color in PIECES) {
    for (const type in PIECES[color]) {
      if (PIECES[color][type] === pieceSymbol) {
        return color;
      }
    }
  }
  return null;
}

const FEN_PIECE_MAP = {
  [PIECES.white.king]: 'K',
  [PIECES.white.queen]: 'Q',
  [PIECES.white.rook]: 'R',
  [PIECES.white.bishop]: 'B',
  [PIECES.white.knight]: 'N',
  [PIECES.white.pawn]: 'P',
  [PIECES.black.king]: 'k',
  [PIECES.black.queen]: 'q',
  [PIECES.black.rook]: 'r',
  [PIECES.black.bishop]: 'b',
  [PIECES.black.knight]: 'n',
  [PIECES.black.pawn]: 'p'
};

function boardToFEN(boardState, turnColor) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    let rowStr = '';
    for (let c = 0; c < 8; c++) {
      const piece = boardState[r]?.[c];
      if (piece) {
        if (empty) { rowStr += empty; empty = 0; }
        rowStr += FEN_PIECE_MAP[piece] || '';
      } else {
        empty++;
      }
    }
    if (empty) rowStr += empty;
    rows.push(rowStr);
  }
  const boardPart = rows.join('/');
  return `${boardPart} ${turnColor === 'white' ? 'w' : 'b'} - - 0 1`;
}

function algebraicToCoords(algebraicSquare) {
  if (!algebraicSquare || algebraicSquare.length !== 2) return null;
  const colChar = algebraicSquare.charAt(0).toLowerCase();
  const rowChar = algebraicSquare.charAt(1);

  const col = colChar.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(rowChar);

  if (col < 0 || col > 7 || isNaN(row) || row < 0 || row > 7) return null;
  return { row, col };
}

function parseAlgebraicMove(moveString, playerColor, board) {
  if (!moveString || typeof moveString !== 'string' || moveString.length < 4 || moveString.length > 5) {
    return null;
  }

  const fromAlg = moveString.substring(0, 2);
  const toAlg = moveString.substring(2, 4);
  let promotion = null;
  if (moveString.length === 5) {
    const promoChar = moveString.charAt(4).toLowerCase();
    const map = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
    if (map[promoChar]) promotion = PIECES[playerColor][map[promoChar]];
  }

  const fromCoords = algebraicToCoords(fromAlg);
  const toCoords = algebraicToCoords(toAlg);

  if (!fromCoords || !toCoords) return null;

  const pieceSymbol = board[fromCoords.row]?.[fromCoords.col];
  if (!pieceSymbol || getPieceColor(pieceSymbol) !== playerColor) return null;

  return {
    fromRow: fromCoords.row,
    fromCol: fromCoords.col,
    toRow: toCoords.row,
    toCol: toCoords.col,
    pieceSymbol,
    promotion
  };
}

module.exports = {
  PIECES,
  initialBoardSetup,
  boardToFEN,
  parseAlgebraicMove
};
