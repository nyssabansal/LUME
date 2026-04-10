from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
import os

app = Flask(__name__)
CORS(app)

# In-memory session store (replace with a DB for production)
sessions = []

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


@app.route("/")
def home():
    return "Study Tracker backend is running!"


@app.route("/start_session", methods=["POST"])
def start_session():
    data = request.json
    session = {
        "id": len(sessions) + 1,
        "subject": data.get("subject", "General study"),
        "start_time": data.get("start_time"),
        "end_time": None,
        "duration": 0,
    }
    sessions.append(session)
    return jsonify({"message": "Session started", "session": session})


@app.route("/end_session", methods=["POST"])
def end_session():
    data = request.json
    session_id = data.get("id")
    for session in sessions:
        if session["id"] == session_id:
            session["end_time"] = data.get("end_time")
            session["duration"] = data.get("duration")
            return jsonify({"message": "Session ended", "session": session})
    return jsonify({"error": "Session not found"}), 404


@app.route("/sessions", methods=["GET"])
def get_sessions():
    return jsonify(sessions)


@app.route("/ai_insight", methods=["POST"])
def ai_insight():
    """Proxies the AI coaching request so the API key stays on the server."""
    data = request.json
    all_sessions = data.get("sessions", [])

    summary = "\n".join(
        f"Session {i+1}: {s['subject']}, {float(s['duration']):.1f} minutes"
        for i, s in enumerate(all_sessions)
    )

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": (
                    f"You are a concise, friendly study coach. The student just completed study sessions:\n\n"
                    f"{summary}\n\n"
                    "Give a short, personalized insight (2-3 sentences max) on their pattern, "
                    "one specific encouragement, and one actionable tip for their next session. "
                    "Be warm but direct. No bullet points, just flowing text."
                ),
            }
        ],
    )

    insight = message.content[0].text
    return jsonify({"insight": insight})


if __name__ == "__main__":
    app.run(debug=True)
