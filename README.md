# aichess
Play Chess vs AI made by AI

## Stockfish Support

If no API key is configured for the language model, the game will try to use the
[Stockfish](https://stockfishchess.org/) engine via a Web Worker. The worker
script is loaded from a CDN (`cdn.jsdelivr.net`).

No extra setup is required other than having an internet connection. If the
engine fails to load, the game falls back to a random move.
