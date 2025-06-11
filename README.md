# AI Chess

Play chess against an AI powered by OpenAI's language models. The game runs entirely in the browser with HTML, CSS and JavaScript.

## Features

- Interactive chessboard rendered on the page
- AI opponent uses the OpenAI API to choose moves
- Simple chat window to talk with the AI
- API key stored in your browser's local storage

## Getting Started

1. Run a small HTTP server in this directory (optional but recommended):

   ```bash
   python3 -m http.server
   ```

   Then open `http://localhost:8000` in your browser. You can also open `index.html` directly.

2. In the page settings area, enter your OpenAI API key and save it.
3. Play as white. Make your move and the AI will respond.

Internet access is required for API calls. The OpenAI API key is never sent anywhere except to the OpenAI service.

## License

This project is released under the MIT License.

# aichess
Play Chess vs AI made by AI

## Stockfish Support

If no API key is configured for the language model, the game tries to use the
[Stockfish](https://stockfishchess.org/) engine via a Web Worker. The worker
loads `stockfish.js` locally. Due to the file size, `stockfish.wasm` is not
included in the repository. Download the WebAssembly file from
`https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16.wasm` and place it next to the
worker script so it can be loaded at runtime. Once added, the game works
offline. If the engine fails to load, the game falls back to a random move.

## Running the project
1. Clone or download this repository.
2. Open `index.html` in a modern web browser (Chrome, Firefox, etc.). The game is fully client-side and does not require a build step or server.

## OpenAI API Key
For chat and move generation to work, you must provide an OpenAI API key. Enter your key in the **API Key** field at the bottom of the page and click **Save Key**. The key is stored in your browser's local storage.

## Prerequisites
- Modern web browser with internet access.
- A valid OpenAI API key.
- No other dependencies are required.
