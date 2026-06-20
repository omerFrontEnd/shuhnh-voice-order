# shuhnh-voice-order — Backend

FastAPI backend that bridges the React component with Gemini Live API over WebSocket.

## Requirements

- Python 3.10+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

## Setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create a .env file
echo GEMINI_API_KEY=your_key_here > .env

# 4. Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will be available at `http://localhost:8000`.

## WebSocket endpoint

```
ws://localhost:8000/ws/call/{session_id}
```

The frontend connects here automatically when you pass `wsUrl="ws://localhost:8000"` to the `VoiceOrderButton` component.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |

## Production notes

- Replace `allow_origins=["*"]` in `main.py` with your actual frontend domain.
- Use a process manager such as `gunicorn` with `uvicorn` workers for production.
- Consider persisting session state in Redis instead of the in-memory `call_orders` dict.
