```markdown
# Rules for Claude Code / Vibecoding

## Development & Build Commands
- Run Server: `python app.py` or `py app.py`
- Install Dependencies: `python -m pip install Flask Pillow`

## Architecture & Responsibilities
1. `app.py`: Handle routing, image validation, PIL cropping, and memory-buffered ZIP generation. Keep backend clean and efficient.
2. `index.html`: Clean, semantic HTML structure with dark-mode slate theme.
3. `static/css/style.css`: Minimalist design, CSS Grid with dynamic columns variable (`--grid-size`), dark indigo accent.
4. `static/js/script.js`: State management for tile position tracking, shuffle algorithm (Fisher-Yates), drag-and-drop / click-swap event listeners, and victory detection.

## Code Style & UX Guidelines
- **UI Design**: Minimalist, sleek, modern dark mode. UI must be simple and easy for non-technical users to understand.
- **No Heavy Frameworks**: Keep frontend light using standard Vanilla JavaScript and CSS.
- **Error Handling**: Handle non-image file uploads, missing files, or corrupted uploads gracefully with friendly error messages.