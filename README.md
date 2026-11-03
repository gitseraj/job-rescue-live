# Job Rescue Live

**An AI-powered voice receptionist that handles incoming service calls, captures customer details, and maintains call records.**

Job Rescue Live uses Gemini Live to enable real-time voice conversations between callers and an AI receptionist. It captures useful information from conversations, saves call records to MongoDB, and provides a dashboard to review call history and transcripts.

## Features

- **Real-time voice conversations:** Speak naturally with an AI receptionist using your microphone.
- **AI-powered receptionist:** Understands customer requests and gathers relevant information.
- **Live transcription:** Displays caller and AI responses during the conversation.
- **Call management:** Saves completed call transcripts to MongoDB.
- **Call dashboard:** View previous calls and their details.
- **Search functionality:** Search calls by customer name, problem, location, timing, or urgency.
- **Transcript viewer:** Review individual conversation transcripts.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | REST API |
| Gemini Live API | Real-time AI conversations |
| WebSockets | Live communication |
| MongoDB | Call history storage |
| HTML, CSS, JavaScript | Frontend |

## Project Structure

```text
job-rescue-live/
│
├── client/
│   ├── index.html
│   └── dashboard.html
│
├── server/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/gitseraj/job-rescue-live.git
cd job-rescue-live
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `server` directory:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_gemini_live_model
MONGODB_URI=your_mongodb_connection_string
DB_NAME=job_rescue
```

Replace the placeholder values with your own credentials.

**Never commit your `.env` file or expose API keys publicly.**

### 4. Start the backend

From the `server` directory:

```bash
npm start
```

The backend runs on:

```text
http://localhost:3000
```

### 5. Start the frontend

Open another terminal from the project root:

```bash
npx serve client
```

Open the local URL printed by the command.

- `index.html` opens the AI receptionist.
- `dashboard.html` opens the call dashboard.

Make sure the backend is running before using the frontend.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check backend status |
| GET | `/api/calls` | Retrieve saved calls |
| POST | `/api/calls` | Save a completed call |
| WebSocket | `/gemini` | Gemini Live connection proxy |

## Deployment

The application is designed to use:

- **Backend:** Render Web Service
- **Database:** MongoDB Atlas
- **Frontend:** Static hosting such as Vercel

The backend requires WebSocket support for real-time Gemini communication.

Configure the production API and WebSocket URLs in the frontend before deploying it.

## Security Notes

- Keep API keys in environment variables.
- Never commit `.env` files.
- Use secure HTTPS and WSS connections in production.
- Restrict MongoDB network access appropriately.
- Configure production CORS to allow only trusted frontend origins.

## Current Status

The project has been pushed to GitHub. Cloud deployment and production configuration are in progress.

## Author

**Md Seraj Ansari**

- GitHub: [@gitseraj](https://github.com/gitseraj)
- Project: [Job Rescue Live](https://github.com/gitseraj/job-rescue-live

---

*Built to explore real-time AI voice agents, WebSockets, and practical automation for service businesses.*
