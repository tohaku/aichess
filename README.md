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
