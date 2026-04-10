# Studious 📚

A beautiful study tracker with AI coaching, session analytics, and a calendar to-do system.

## Structure

```
studious/
├── backend/
│   ├── app.py              # Flask API + Claude AI endpoint
│   └── requirements.txt
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── App.js          # Full app (tracker + calendar + todos)
│   │   ├── App.css         # All styles
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── studious.code-workspace # Open this in VS Code
└── README.md
```

## Quickstart

### 1. Open in VS Code
Double-click `studious.code-workspace` — VS Code opens with frontend and backend as separate root folders.

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-...  # Windows: set ANTHROPIC_API_KEY=sk-...
python app.py
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

## Features

- **Study Tracker** — live timer, subject tagging, session history, bar chart
- **Focus Score** — consistency metric that rewards regular sessions
- **AI Coach** — Claude gives personalized tips after every session (via `/ai_insight` backend endpoint)
- **Calendar** — monthly view, click any day to manage tasks
- **To-Do List** — per-day tasks with checkboxes, persistent in-session state; dots on calendar show days with tasks

## Get your Anthropic API key
https://console.anthropic.com
