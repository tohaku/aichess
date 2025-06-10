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
    addMessageToChat("API Key loaded from local storage.", "System", "system-info"); // Provide feedback
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

// --- Helper function for image alt text ---
function getPieceNameFromPath(imagePath) {
    if (!imagePath) return '';
    // Example: './images/king.png' -> 'king'
    // This is a simple parser; a more robust one might reverse lookup PIECES
    const fileName = imagePath.substring(imagePath.lastIndexOf('/') + 1);
    const pieceName = fileName.replace('.png', '').replace('1', ''); // Removes '1' for black pieces

    for (const color in PIECES) {
        for (const type in PIECES[color]) {
            if (PIECES[color][type] === imagePath) {
                return `${color} ${type}`;
            }
        }
    }
    return pieceName; // Fallback if not found in PIECES (should not happen with current setup)
}
// --- Chessboard Rendering ---
function renderChessboard() {
  chessboard.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.classList.add('square');
      square.classList.add((row + col) % 2 === 0 ? 'light-square' : 'dark-square');
      square.dataset.row = row;
      square.dataset.col = col;

      const imagePath = currentBoard[row]?.[col];
      if (imagePath) { // Only add an image if a piece exists on the square
        const pieceImage = document.createElement('img');
        pieceImage.src = imagePath;
        pieceImage.alt = getPieceNameFromPath(imagePath); // Add alt text for accessibility
        square.appendChild(pieceImage);
      }
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

// --- Coordinate and Move Notation Helpers ---
function coordsToAlgebraic(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return "??"; // Should not happen
    const file = String.fromCharCode('a'.charCodeAt(0) + col);
    const rank = (8 - row).toString();
    return file + rank;
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

        const humanMoveFromAlg = coordsToAlgebraic(fromRow, fromCol);
        const humanMoveToAlg = coordsToAlgebraic(toRow, toCol);
        const humanMoveNotation = `${humanPlayerColor} (Human) moved ${getPieceNameFromPath(pieceSymbol)} from ${humanMoveFromAlg} to ${humanMoveToAlg}.`;
        addMessageToChat(humanMoveNotation, "System", "system");

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
            currentPlayerTurn = llmPlayerColor;
            addMessageToChat(`${llmPlayerColor}'s (LLM) turn. Requesting move from LLM...`, "System", "system");
            await handleLLMTurn(humanMoveNotation); // Pass human's move notation
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

// --- LLM Chess Opponent Logic & Helpers ---

function algebraicToCoords(algebraicSquare) { // e.g., "e4"
    if (!algebraicSquare || algebraicSquare.length !== 2) return null;
    const colChar = algebraicSquare.charAt(0).toLowerCase();
    const rowChar = algebraicSquare.charAt(1);

    const col = colChar.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(rowChar);

    if (col < 0 || col > 7 || isNaN(row) || row < 0 || row > 7) return null;
    return { row, col };
}

function parseAlgebraicMove(moveString, playerColor, board) { // e.g., "e2e4" or "e7e8q"
    if (!moveString || typeof moveString !== 'string' || moveString.length < 4 || moveString.length > 5) {
        console.error("Invalid algebraic move string format:", moveString);
        addMessageToChat(`LLM returned unparseable move: ${moveString}`, "System", "system-error");
        return null;
    }

    const fromAlg = moveString.substring(0, 2);
    const toAlg = moveString.substring(2, 4);
    // TODO: Handle promotion piece if present (e.g., moveString.charAt(4) for 'q', 'r', 'b', 'n')

    const fromCoords = algebraicToCoords(fromAlg);
    const toCoords = algebraicToCoords(toAlg);

    if (!fromCoords || !toCoords) {
        console.error("Could not parse algebraic coordinates from move:", moveString);
        addMessageToChat(`LLM move ${moveString} has invalid coordinates.`, "System", "system-error");
        return null;
    }

    const pieceSymbol = board[fromCoords.row]?.[fromCoords.col];
    if (!pieceSymbol) {
        console.error(`No piece found at source square ${fromAlg} (${fromCoords.row},${fromCoords.col}) on the board for LLM move ${moveString}.`);
        addMessageToChat(`LLM tried to move from an empty square: ${fromAlg}.`, "System", "system-error");
        return null;
    }
    if (getPieceColor(pieceSymbol) !== playerColor) {
        console.error(`Piece at source square ${fromAlg} (${getPieceColor(pieceSymbol)}) is not LLM's color (${playerColor}). Move: ${moveString}`);
        addMessageToChat(`LLM tried to move opponent's piece at ${fromAlg}.`, "System", "system-error");
        return null;
    }

    // Optional: More robust validation against getAllLegalMoves if desired,
    // but the main game loop already checks isMoveValid and self-check.
    // For now, we trust the LLM to return a valid format, and basic checks are done.
    // The isMoveValid check in handleLLMTurn will be the ultimate decider.

    return {
        fromRow: fromCoords.row,
        fromCol: fromCoords.col,
        toRow: toCoords.row,
        toCol: toCoords.col,
        pieceSymbol: pieceSymbol // The actual piece on the 'from' square
    };
}

async function getLLMMove(boardState, turnColor, humanLastMove) {
  addMessageToChat("LLM is thinking...", "System", "system");

  if (!apiKey || apiKey.trim() === '') {
    addMessageToChat("API key not set. LLM will make a random move.", "System", "system-warning");
    // Fallback to random move
    const possibleMoves = getAllLegalMoves(turnColor, boardState);
    return possibleMoves.length > 0 ? possibleMoves[Math.floor(Math.random() * possibleMoves.length)] : null;
  }

  const systemMessage = `You are a chess engine playing as ${turnColor}. Your task is to select the best move. Provide your move ONLY in algebraic notation (e.g., "e7e5", "g1f3", "e1g1" for castling, "e7e8q" for pawn promotion to queen). Do not include any other text, explanations, or apologies. Just the move.`;
  const userMessageContent = `The human player (${humanPlayerColor === 'white' ? 'white' : 'black'}) just made the move: ${humanLastMove}.
  Current board state (JSON format: row indices map to column objects, which map to piece image paths. Top-left is 0,0 for black's back rank, which is white's perspective of rank 8):
  ${JSON.stringify(boardState, null, 2)}
  It is now ${turnColor}'s turn. What is your move?`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Or "gpt-4" or your preferred model
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessageContent }
        ],
        max_tokens: 15, // For a short move string like "e7e8q"
        temperature: 0.3, // Lower for more deterministic chess moves
        n: 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM API Error Response Text:", errorText);
      throw new Error(`LLM API request failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    // For OpenAI Chat Completions, the response is in choices[0].message.content
    const llmMoveString = (responseData.choices && responseData.choices[0] && responseData.choices[0].message && responseData.choices[0].message.content) ? responseData.choices[0].message.content.trim() : null;

    if (!llmMoveString) {
        addMessageToChat("LLM returned an empty move. LLM will make a random move.", "System", "system-warning");
        const possibleMoves = getAllLegalMoves(turnColor, boardState);
        return possibleMoves.length > 0 ? possibleMoves[Math.floor(Math.random() * possibleMoves.length)] : null;
    }

    addMessageToChat(`LLM suggests move: ${llmMoveString}`, "LLM", "llm-suggestion");
    return parseAlgebraicMove(llmMoveString, turnColor, boardState);

  } catch (error) {
    console.error("Error getting LLM move:", error);
    addMessageToChat(`Error with LLM: ${error.message}. LLM will make a random move.`, "System", "system-error");
    const possibleMoves = getAllLegalMoves(turnColor, boardState);
    return possibleMoves.length > 0 ? possibleMoves[Math.floor(Math.random() * possibleMoves.length)] : null;
  }
}

async function handleLLMTurn(humanLastMoveDescription) {
  if (!gameActive) return;
  const llmMoveData = await getLLMMove(currentBoard, llmPlayerColor, humanLastMoveDescription);

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
      const llmMoveFromAlg = coordsToAlgebraic(fromRow, fromCol);
      const llmMoveToAlg = coordsToAlgebraic(toRow, toCol);
      addMessageToChat(`LLM (${llmPlayerColor}) moved ${getPieceNameFromPath(pieceSymbolToMove)} from ${llmMoveFromAlg} to ${llmMoveToAlg}`, "System", "system");

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
const CHAT_LLM_URL = 'https://api.openai.com/v1/chat/completions'; // Renamed for clarity

function addMessageToChat(message, sender, type = 'normal') {
  const messageElement = document.createElement('p');
  messageElement.textContent = `${sender}: ${message}`;
  messageElement.classList.add(`chat-message-${type}`);
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
    const chatPayload = {
        model: "gpt-3.5-turbo", // Or your preferred chat model
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: message }
        ],
        max_tokens: 150,
        temperature: 0.7
    };

    const response = await fetch(CHAT_LLM_URL, {
      method: 'POST',
      body: JSON.stringify(chatPayload),
      headers: { 'Content-type': 'application/json; charset=UTF-8', 'Authorization': `Bearer ${apiKey}`},
    });

    if (!response.ok) {
      const errorText = await response.text(); // Get raw error text for better debugging
      console.error("Chat LLM API Error Response Text:", errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    const llmResponseMessage = (responseData.choices && responseData.choices[0] && responseData.choices[0].message && responseData.choices[0].message.content) ? responseData.choices[0].message.content.trim() : "LLM response format unexpected or empty.";
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
    localStorage.setItem('chessLLMApiKey', apiKey); // Save to localStorage
    addMessageToChat('API Key saved successfully.', 'System', 'system');
  } else {
    addMessageToChat('API Key cannot be empty.', 'System', 'system');
  }
});

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
  loadApiKey(); // Load API key when the DOM is ready
  renderChessboard();
  addMessageToChat(`Welcome! You are playing as ${humanPlayerColor}. ${humanPlayerColor}'s turn.`, 'System', 'system');
});
 // Added styling for system-info, system-error, system-warning in addMessageToChat
 // Added llm-suggestion type for LLM's raw output before parsing.
