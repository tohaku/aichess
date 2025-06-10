# aichess
Play Chess vs AI made by AI

## Stockfish Support

If no API key is configured for the language model, the game will try to use the
[Stockfish](https://stockfishchess.org/) engine via a Web Worker. The worker
script is loaded from a CDN (`cdn.jsdelivr.net`).

No extra setup is required other than having an internet connection. If the
engine fails to load, the game falls back to a random move.

## Running the project
1. Clone or download this repository.
2. Open `index.html` in a modern web browser (Chrome, Firefox, etc.). The game is fully client-side and does not require a build step or server.

## OpenAI API Key
For chat and move generation to work, you must provide an OpenAI API key. Enter your key in the **API Key** field at the bottom of the page and click **Save Key**. The key is stored in your browser's local storage.

## Prerequisites
- Modern web browser with internet access.
- A valid OpenAI API key.
- No other dependencies are required.
