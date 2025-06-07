// --- Constants and State ---
const chessboard = document.getElementById('chessboard');
const messagesContainer = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyButton = document.getElementById('save-api-key-button');

let apiKey = ''; // This will be populated from localStorage

// --- Load API Key on Start ---
function loadApiKey() {
  const storedApiKey = localStorage.getItem('chessLLMApiKey');
  if (storedApiKey) {
    apiKey = storedApiKey;
    apiKeyInput.value = storedApiKey; // Populate the input field
    console.log("API Key loaded from localStorage.");
    // Optionally, provide a silent feedback or a subtle UI indication
    // addMessageToChat("API Key loaded from local storage.", "System", "system");
  }
}

let selectedPiece = null; // {element, row, col, pieceSymbol}
const humanPlayerColor = 'white';
const llmPlayerColor = 'black';
let currentPlayerTurn = humanPlayerColor; // Human (white) starts 

// Image paths for pieces
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
  },
};

const initialBoardSetup = {
  0: { 0: PIECES.black.rook, 1: PIECES.black.knight, 2: PIECES.black.bishop, 3: PIECES.black.queen, 4: PIECES.black.king, 5: PIECES.black.bishop, 6: PIECES.black.knight, 7: PIECES.black.rook },
  1: { 0: PIECES.black.pawn, 1: PIECES.black.pawn, 2: PIECES.black.pawn, 3: PIECES.black.pawn, 4: PIECES.black.pawn, 5: PIECES.black.pawn, 6: PIECES.black.pawn, 7: PIECES.black.pawn },
  6: { 0: PIECES.white.pawn, 1: PIECES.white.pawn, 2: PIECES.white.pawn, 3: PIECES.white.pawn, 4: PIECES.white.pawn, 5: PIECES.white.pawn, 6: PIECES.white.pawn, 7: PIECES.white.pawn },
  7: { 0: PIECES.white.rook, 1: PIECES.white.knight, 2: PIECES.white.bishop, 3: PIECES.white.queen, 4: PIECES.white.king, 5: PIECES.white.bishop, 6: PIECES.white.knight, 7: PIECES.white.rook },
};

let currentBoard = JSON.parse(JSON.stringify(initialBoardSetup));
let gameActive = true; // Flag to control if moves can be made

// --- Chessboard Rendering ---
function renderChessboard() {
  chessboard.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.classList.add('square');
      square.style.width = '50px';
      square.style.height = '50px';
      square.style.backgroundColor = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
      square.style.float = 'left';
      square.style.display = 'flex';
      square.style.justifyContent = 'center';
      square.style.alignItems = 'center';
      square.dataset.row = row;
      square.dataset.col = col;

      const pieceSymbol = currentBoard[row]?.[col];
      if (pieceSymbol) {
        square.textContent = pieceSymbol;
      }
      const pieceImage = document.createElement('img');
      pieceImage.src = pieceSymbol;
      pieceImage.style.width = '100%'; // Make image fill the square
      pieceImage.style.height = '100%';
      square.appendChild(pieceImage);
      chessboard.appendChild(square);
    }
  }
}

// --- Piece Logic & Movement Validation ---

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

function isOwnPiece(pieceSymbol) { // Checks if the piece belongs to the current HUMAN player
  const pieceColor = getPieceColor(pieceSymbol);
  return pieceColor === humanPlayerColor;
}


function isValidPawnMove(fromRow, fromCol, toRow, toCol, pieceColor, board) {
  const direction = pieceColor === 'white' ? -1 : 1;
  const startRow = pieceColor === 'white' ? 6 : 1;
  const opponentColor = pieceColor === 'white' ? 'black' : 'white';

  // Standard one-square move
  if (fromCol === toCol && board[toRow]?.[toCol] === undefined && toRow === fromRow + direction) {
    return true;
  }
  // Initial two-square move
  if (fromCol === toCol && board[toRow]?.[toCol] === undefined && fromRow === startRow && toRow === fromRow + 2 * direction) {
    if (board[fromRow + direction]?.[fromCol] === undefined) {
      return true;
    }
  }
  // Capture move
  if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
    const targetPiece = board[toRow]?.[toCol];
    if (targetPiece && getPieceColor(targetPiece) === opponentColor) {
      return true;
    }
  }
  // TODO: En passant
  return false;
}

function isValidRookMove(fromRow, fromCol, toRow, toCol, board) {
  if (fromRow !== toRow && fromCol !== toCol) return false;
  if (fromRow === toRow) {
    const step = fromCol < toCol ? 1 : -1;
    for (let c = fromCol + step; c !== toCol; c += step) {
      if (board[fromRow]?.[c]) return false;
    }
  } else {
    const step = fromRow < toRow ? 1 : -1;
    for (let r = fromRow + step; r !== toRow; r += step) {
      if (board[r]?.[fromCol]) return false;
    }
  }
  return true;
}

function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
  const dRow = Math.abs(toRow - fromRow);
  const dCol = Math.abs(toCol - fromCol);
  return (dRow === 2 && dCol === 1) || (dRow === 1 && dCol === 2);
}

function isValidBishopMove(fromRow, fromCol, toRow, toCol, board) {
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
    const dRow = toRow > fromRow ? 1 : -1;
    const dCol = toCol > fromCol ? 1 : -1;
    let r = fromRow + dRow;
    let c = fromCol + dCol;
    while (r !== toRow) {
        if (board[r]?.[c]) return false;
        r += dRow;
        c += dCol;
    }
    return true;
}

function isValidQueenMove(fromRow, fromCol, toRow, toCol, board) {
    return isValidRookMove(fromRow, fromCol, toRow, toCol, board) || isValidBishopMove(fromRow, fromCol, toRow, toCol, board);
}

function isValidKingMove(fromRow, fromCol, toRow, toCol) {
    const dRow = Math.abs(toRow - fromRow);
    const dCol = Math.abs(toCol - fromCol);
    return dRow <= 1 && dCol <= 1 && (dRow + dCol > 0);
    // TODO: Castling
}

function isMoveValid(pieceSymbol, fromRow, fromCol, toRow, toCol, board) {
  const pieceColor = getPieceColor(pieceSymbol);
  if (!pieceColor) return false;
  const targetPieceSymbol = board[toRow]?.[toCol];
  if (targetPieceSymbol && getPieceColor(targetPieceSymbol) === pieceColor) {
    return false; // Cannot capture own piece
  }

  // Piece-specific rules
  if (pieceSymbol === PIECES.white.pawn || pieceSymbol === PIECES.black.pawn) return isValidPawnMove(fromRow, fromCol, toRow, toCol, pieceColor, board);
  if (pieceSymbol === PIECES.white.rook || pieceSymbol === PIECES.black.rook) return isValidRookMove(fromRow, fromCol, toRow, toCol, board);
  if (pieceSymbol === PIECES.white.knight || pieceSymbol === PIECES.black.knight) return isValidKnightMove(fromRow, fromCol, toRow, toCol);
  if (pieceSymbol === PIECES.white.bishop || pieceSymbol === PIECES.black.bishop) return isValidBishopMove(fromRow, fromCol, toRow, toCol, board);
  if (pieceSymbol === PIECES.white.queen || pieceSymbol === PIECES.black.queen) return isValidQueenMove(fromRow, fromCol, toRow, toCol, board);
  if (pieceSymbol === PIECES.white.king || pieceSymbol === PIECES.black.king) return isValidKingMove(fromRow, fromCol, toRow, toCol);
  return false;
}

async function onSquareClick(event) {
  if (!gameActive || currentPlayerTurn !== humanPlayerColor) return; // Only human can click

  const clickedSquare = event.currentTarget;
  const toRow = parseInt(clickedSquare.dataset.row);
  const toCol = parseInt(clickedSquare.dataset.col);
  const pieceSymbolOnTarget = currentBoard[toRow]?.[toCol];

  if (selectedPiece) {
    const {element: selectedElement, row: fromRow, col: fromCol, pieceSymbol} = selectedPiece;

    if (fromRow === toRow && fromCol === toCol) {
      selectedElement.classList.remove('selected');
      selectedPiece = null;
      return;
    }

    if (isMoveValid(pieceSymbol, fromRow, fromCol, toRow, toCol, currentBoard)) {
      const tempBoard = JSON.parse(JSON.stringify(currentBoard));
      tempBoard[toRow] = tempBoard[toRow] || {};
      tempBoard[toRow][toCol] = pieceSymbol;
      if (tempBoard[fromRow]) {
          delete tempBoard[fromRow][fromCol];
          if (Object.keys(tempBoard[fromRow]).length === 0) delete tempBoard[fromRow];
      }

      if (isKingInCheck(humanPlayerColor, tempBoard)) {
        addMessageToChat("Invalid move: You cannot put your own king in check.", "System", "system");
        selectedElement.classList.remove('selected');
        selectedPiece = null;
      } else {
        currentBoard = tempBoard;
        selectedElement.classList.remove('selected');
        selectedPiece = null;
        renderChessboard();
        addMessageToChat(`${humanPlayerColor} moved ${pieceSymbol} from (${fromRow},${fromCol}) to (${toRow},${toCol})`, "System", "system");

        currentPlayerTurn = llmPlayerColor;

        if (isKingInCheck(llmPlayerColor, currentBoard)) {
          addMessageToChat(`${llmPlayerColor} (LLM) is in check!`, "System", "system");
          if (!canMoveOutOfCheck(llmPlayerColor, currentBoard)) {
            addMessageToChat(`Checkmate! ${humanPlayerColor} wins!`, "System", "system");
            gameActive = false; return;
          }
        } else {
           if (getAllLegalMoves(llmPlayerColor, currentBoard).length === 0) {
               addMessageToChat("Stalemate! The game is a draw.", "System", "system");
               gameActive = false; return;
           }
        }
        if (gameActive) {
            addMessageToChat(`${llmPlayerColor}'s (LLM) turn.`, "System", "system");
            await handleLLMTurn();
        }
      }
    } else { // Invalid move by basic rules
      const targetPieceColor = pieceSymbolOnTarget ? getPieceColor(pieceSymbolOnTarget) : null;
      if (targetPieceColor === humanPlayerColor) { // Clicked another of own pieces
         selectedElement.classList.remove('selected');
         clickedSquare.classList.add('selected');
         selectedPiece = { element: clickedSquare, row: toRow, col: toCol, pieceSymbol: pieceSymbolOnTarget };
      } else {
        selectedElement.classList.remove('selected');
        selectedPiece = null;
      }
    }
  } else if (pieceSymbolOnTarget && getPieceColor(pieceSymbolOnTarget) === humanPlayerColor) {
    clickedSquare.classList.add('selected');
    selectedPiece = { element: clickedSquare, row: toRow, col: toCol, pieceSymbol: pieceSymbolOnTarget };
  }
}

// --- Check/Checkmate ---
function findKing(kingColor, boardState) {
  const kingSymbol = PIECES[kingColor].king;
  for (let r = 0; r < 8; r++) {
    if (boardState[r]) {
      for (let c = 0; c < 8; c++) {
        if (boardState[r][c] === kingSymbol) return { row: r, col: c };
      }
    }
  }
  return null;
}

function isKingInCheck(kingColor, boardState) {
  const kingPosition = findKing(kingColor, boardState);
  if (!kingPosition) return false;
  const opponentColor = kingColor === 'white' ? 'black' : 'white';
  for (let r = 0; r < 8; r++) {
    if (boardState[r]) {
      for (let c = 0; c < 8; c++) {
        const pieceSymbol = boardState[r][c];
        if (pieceSymbol && getPieceColor(pieceSymbol) === opponentColor) {
          if (isMoveValid(pieceSymbol, r, c, kingPosition.row, kingPosition.col, boardState)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function getPseudoLegalMovesForPiece(pieceSymbol, fromRow, fromCol, boardState) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isMoveValid(pieceSymbol, fromRow, fromCol, r, c, boardState)) {
                moves.push({ fromRow, fromCol, toRow: r, toCol: c, pieceSymbol });
            }
        }
    }
    return moves;
}

function getAllLegalMoves(playerColor, boardState) {
  const legalMoves = [];
  for (let r = 0; r < 8; r++) {
    if (boardState[r]) {
      for (let c = 0; c < 8; c++) {
        const pieceSymbol = boardState[r][c];
        if (pieceSymbol && getPieceColor(pieceSymbol) === playerColor) {
          const pseudoLegalMoves = getPseudoLegalMovesForPiece(pieceSymbol, r, c, boardState);
          for (const move of pseudoLegalMoves) {
            const tempBoard = JSON.parse(JSON.stringify(boardState));
            tempBoard[move.toRow] = tempBoard[move.toRow] || {};
            tempBoard[move.toRow][move.toCol] = move.pieceSymbol;
            if (tempBoard[move.fromRow]) {
                delete tempBoard[move.fromRow][move.fromCol];
                if (Object.keys(tempBoard[move.fromRow]).length === 0) delete tempBoard[move.fromRow];
            }
            if (!isKingInCheck(playerColor, tempBoard)) {
              legalMoves.push(move);
            }
          }
        }
      }
    }
  }
  return legalMoves;
}

function canMoveOutOfCheck(kingColor, boardState) {
  if (!isKingInCheck(kingColor, boardState)) return true;
  return getAllLegalMoves(kingColor, boardState).length > 0;
}

// --- LLM Chess Opponent Logic ---
function formatBoardForLLM(boardState) {
  return JSON.stringify(boardState); // Simple JSON for now
}

async function getLLMMove(boardState, turnColor) {
  addMessageToChat("LLM is thinking...", "System", "system");
  return new Promise(resolve => { // Simulate API call
    setTimeout(() => {
      const possibleMoves = getAllLegalMoves(turnColor, boardState);
      if (possibleMoves.length > 0) {
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        resolve(randomMove); // Returns { fromRow, fromCol, toRow, toCol, pieceSymbol }
      } else {
        resolve(null); // No legal moves
      }
    }, 1000);
  });
}

async function handleLLMTurn() {
  if (!gameActive) return;
  const llmMoveData = await getLLMMove(currentBoard, llmPlayerColor);

  if (llmMoveData) {
    const { fromRow, fromCol, toRow, toCol } = llmMoveData;
    const pieceSymbolToMove = currentBoard[fromRow]?.[fromCol];

    if (!pieceSymbolToMove || getPieceColor(pieceSymbolToMove) !== llmPlayerColor) {
      addMessageToChat("LLM error: Tried to move an invalid piece. Human's turn.", "System", "system");
      currentPlayerTurn = humanPlayerColor; return;
    }

    if (isMoveValid(pieceSymbolToMove, fromRow, fromCol, toRow, toCol, currentBoard)) {
      const tempBoard = JSON.parse(JSON.stringify(currentBoard));
      tempBoard[toRow] = tempBoard[toRow] || {};
      tempBoard[toRow][toCol] = pieceSymbolToMove;
      if (tempBoard[fromRow]) {
        delete tempBoard[fromRow][fromCol];
        if (Object.keys(tempBoard[fromRow]).length === 0) delete tempBoard[fromRow];
      }

      if (isKingInCheck(llmPlayerColor, tempBoard)) {
        addMessageToChat("LLM error: Attempted self-check. Human's turn.", "System", "system");
        currentPlayerTurn = humanPlayerColor; return;
      }

      currentBoard = tempBoard;
      renderChessboard();
      addMessageToChat(`LLM (${llmPlayerColor}) moved ${pieceSymbolToMove} from (${fromRow},${fromCol}) to (${toRow},${toCol})`, "System", "system");

      currentPlayerTurn = humanPlayerColor;

      if (isKingInCheck(humanPlayerColor, currentBoard)) {
        addMessageToChat(`${humanPlayerColor} is in check!`, "System", "system");
        if (!canMoveOutOfCheck(humanPlayerColor, currentBoard)) {
          addMessageToChat(`Checkmate! ${llmPlayerColor} (LLM) wins!`, "System", "system");
          gameActive = false;
        }
      } else {
        if (getAllLegalMoves(humanPlayerColor, currentBoard).length === 0) {
          addMessageToChat("Stalemate! The game is a draw.", "System", "system");
          gameActive = false;
        }
      }
      if (gameActive) addMessageToChat(`${humanPlayerColor}'s turn.`, "System", "system");

    } else {
      addMessageToChat("LLM error: Made an invalid move. Human's turn.", "System", "system");
      currentPlayerTurn = humanPlayerColor;
    }
  } else {
    addMessageToChat("LLM has no legal moves or failed to move. Human's turn.", "System", "system");
    if (isKingInCheck(llmPlayerColor, currentBoard)){
         addMessageToChat(`Checkmate! ${humanPlayerColor} wins! (LLM has no moves out of check)`, "System", "system");
    } else {
         addMessageToChat("Stalemate! (LLM has no legal moves)", "System", "system");
    }
    gameActive = false;
  }
}


// --- Chat Window Functionality ---
const LLM_PLACEHOLDER_URL = 'https://jsonplaceholder.typicode.com/posts';

function addMessageToChat(message, sender, type = 'normal') {
  const messageElement = document.createElement('p');
  messageElement.textContent = `${sender}: ${message}`;
  messageElement.classList.add(`chat-message-${type}`);
  if (type === 'user') { messageElement.style.color = 'blue'; messageElement.style.textAlign = 'right';}
  else if (type === 'llm') { messageElement.style.color = 'green'; }
  else if (type === 'system') { messageElement.style.fontStyle = 'italic';}
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendChatMessageToLLM(message) {
  if (!apiKey || apiKey.trim() === '') {
    addMessageToChat("Please set your API key in settings to use the chat.", "System", "system");
    return;
  }
  addMessageToChat(message, "You", "user");
  try {
    const response = await fetch(LLM_PLACEHOLDER_URL, {
      method: 'POST',
      body: JSON.stringify({ title: 'User Chat Message', body: message, userId: 1 }),
      headers: { 'Content-type': 'application/json; charset=UTF-8', 'Authorization': `Bearer ${apiKey}`},
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API request failed: ${response.status} ${errorData ? JSON.stringify(errorData) : response.statusText}`);
    }
    const responseData = await response.json();
    const llmResponseMessage = responseData.body ? `LLM Echo: ${responseData.body}` : "LLM response format unexpected.";
    displayLLMResponse(llmResponseMessage);
  } catch (error) {
    console.error("Error sending message to LLM:", error);
    displayLLMResponse(`Sorry, error communicating with assistant: ${error.message}`);
  }
}

function displayLLMResponse(responseMessage) {
  addMessageToChat(responseMessage, "LLM", "llm");
}

function handleUserChatSubmit() {
  const message = chatInput.value;
  if (message.trim() !== '') {
    sendChatMessageToLLM(message);
    chatInput.value = '';
  }
}

sendButton.addEventListener('click', handleUserChatSubmit);
chatInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); handleUserChatSubmit(); }
});

// --- API Key Settings ---
saveApiKeyButton.addEventListener('click', () => {
  const potentialApiKey = apiKeyInput.value;
  if (potentialApiKey && potentialApiKey.trim() !== '') {
    apiKey = potentialApiKey;
    addMessageToChat('API Key saved successfully.', 'System', 'system');
  } else {
    addMessageToChat('API Key cannot be empty.', 'System', 'system');
  }
});

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
  renderChessboard();
  addMessageToChat(`Welcome! You are playing as ${humanPlayerColor}. ${humanPlayerColor}'s turn.`, 'System', 'system');
});
