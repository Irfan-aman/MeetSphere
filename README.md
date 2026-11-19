<div align="center">

# MeetSphere

**Meetings that write their own minutes.**

Video meetings with live captions and AI-generated notes. Built from scratch with React, Node.js, MongoDB, Socket.IO and WebRTC.

[Live demo](https://meet-sphere-alpha.vercel.app/) · [Report a bug](https://github.com/Irfan-aman/meetsphere/issues) · [Request a feature](https://github.com/Irfan-aman/meetsphere/issues)

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socketdotio&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333333?style=flat-square&logo=webrtc&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini%20API-4285F4?style=flat-square&logo=googlegemini&logoColor=white)

</div>

<p align="center">
  <img src="screenshots/homepage.png" alt="MeetSphere home page" width="100%">
</p>

## Table of contents

- [About](#about)
- [Features](#features)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Getting your keys](#getting-your-keys)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [API reference](#api-reference)
- [Security and privacy](#security-and-privacy)
- [Project structure](#project-structure)
- [Limitations and roadmap](#limitations-and-roadmap)
- [License](#license)
- [Author](#author)

## About

MeetSphere is a Zoom-style meeting app that runs entirely in the browser. People join a room with a shareable code, talk over peer-to-peer WebRTC video, and chat. When the call ends, anyone who took part can turn the captions and chat into a short summary with **key decisions** and **action items** (owner and due date, only when someone actually said them), powered by the Google Gemini API.

It started as a college project to learn real-time communication end to end: authentication, a signaling server, WebRTC, persistence and applied AI, all wired together and deployable for free.

## Features

**Meetings**

- Create a meeting in one click and share the code or link. Guests can join with just a display name; an account is needed to host a meeting and to see your meeting history on the dashboard.
- Pre-join lobby with camera preview and mic/camera toggles.
- Peer-to-peer video and audio with WebRTC (up to 8 people per room by default).
- Screen sharing with an automatic spotlight layout.
- Real-time chat, raise hand, emoji reactions, a people panel and a meeting timer.
- Graceful fallback when the camera or microphone is blocked: audio-only, or watch and chat only.

**Live captions**

- Speech-to-text in the browser (Web Speech API), shown live to everyone who has captions on.
- Final lines are saved as the meeting transcript.
- Works in Chrome, Edge and Safari. See [Limitations](#limitations-and-roadmap) for browsers that do not support it.

**AI notes**

- One click generates a summary, key decisions and action items from the transcript and chat.
- Structured JSON output from Gemini, validated on the server. Unchanged meetings return the cached summary instead of spending quota again.
- Copy the notes as Markdown.

**Dashboard**

- Your recent meetings with their transcript, chat log and notes, plus a Rejoin button.

**Built to be safe**

- JWT sessions, bcrypt password hashing, input validation, rate limiting and a CORS allow-list.
- Notes, transcripts and chat are visible only to the host and people who joined.
- The Gemini key stays on the server and meeting text is treated as data, not instructions.

## Screenshots

<table>
  <tr>
    <td><b>Dashboard</b><br>Start or join a meeting and reopen past ones.</td>
  </tr>
  <tr>
    <td><img src="screenshots/dashboard.png" alt="Dashboard with new meeting, join meeting and a list of past meetings" width="100%"></td>
  </tr>
  <tr>
    <td><b>Live captions</b><br>Captions appear for everyone in the meeting, and final lines are saved as the transcript.</td>
  </tr>
  <tr>
    <td><img src="screenshots/liveCaption.png" alt="Meeting room with live captions on" width="100%"></td>
  </tr>
  <tr>
    <td><b>AI notes</b><br>Summary, key decisions and action items generated from the transcript and chat.</td>
  </tr>
  <tr>
    <td><img src="screenshots/summary.png" alt="AI-generated meeting summary with decisions and action items" width="100%"></td>
  </tr>
</table>

## Tech stack

| Layer              | Technology                                                                      |
| ------------------ | ------------------------------------------------------------------------------- |
| Frontend           | React 18, Vite, React Router, Axios, Socket.IO client, Lucide icons             |
| Realtime media     | WebRTC (peer-to-peer mesh), STUN, optional TURN                                 |
| Realtime signaling | Socket.IO                                                                       |
| Backend            | Node.js 18+, Express, Zod, Helmet, express-rate-limit                           |
| Database           | MongoDB with Mongoose (MongoDB Atlas)                                           |
| Auth               | JSON Web Tokens, bcryptjs                                                       |
| AI                 | Google Gemini API (structured JSON output), browser Web Speech API for captions |
| Hosting            | Vercel (frontend), Render (backend), MongoDB Atlas (database)                   |

## How it works

```mermaid
flowchart LR
    A["Browser A<br/>React + WebRTC"] <-->|"Audio and video (peer-to-peer)"| B["Browser B<br/>React + WebRTC"]
    A -->|"Socket.IO: signaling, chat, captions"| S["Node.js + Express<br/>Socket.IO server"]
    B -->|"Socket.IO"| S
    S --> D[("MongoDB Atlas<br/>users, meetings, chat, transcripts")]
    S -->|"Transcript + chat"| G["Google Gemini API<br/>summary, decisions, action items"]
```

1. **Join.** A browser connects to the Socket.IO server with its JWT and joins a room. The server checks that the meeting exists and that the room is not full.
2. **Signal.** The newcomer sends a WebRTC offer to everyone already in the room. The server only relays offers, answers and ICE candidates between sockets in the same room.
3. **Talk.** Audio and video flow directly between browsers. The server never sees the media.
4. **Caption.** Each browser transcribes its own speech. Interim text is shown live; final lines are broadcast and saved to MongoDB with the chat.
5. **Summarize.** `POST /api/summarize/:roomId` loads the transcript and chat on the server, sends a size-limited prompt to Gemini with a JSON schema, validates the reply with Zod and stores it.

## Getting started

### Prerequisites

- Node.js 18 or newer
- A MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or a local MongoDB)
- Optional: a [Gemini API key](https://aistudio.google.com/apikey) for AI notes. Everything else works without it.

### 1. Clone

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/meetsphere.git
cd meetsphere
```

### 2. Start the backend

```bash
cd backend
npm install
```

Create your env file (see [Environment variables](#environment-variables)):

```bash
cp .env.example .env          # macOS / Linux
copy .env.example .env        # Windows (cmd or PowerShell)
```

Fill in `MONGODB_URI`, `JWT_SECRET` and (for AI notes) `GEMINI_API_KEY` and `GEMINI_MODEL`, then:

```bash
npm run dev
```

You should see `MongoDB connected` and `MeetSphere API listening on :5000`. Check `http://localhost:5000/api/health`.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run dev
```

Open **http://localhost:5173**.

### 4. Try it with two people

1. Sign up, then click **Start meeting**.
2. Open the meeting link in a second browser window (or a private window) and join as a guest.
3. Allow camera and microphone, speak a few sentences with captions on (use Chrome or Edge), and send a chat message.
4. Leave, open the meeting from your dashboard and click **Generate AI notes**.

> Camera and microphone work on `http://localhost` and on any HTTPS site, but not on a plain `http://` address on your network.

## Environment variables

### Backend (`backend/.env`)

| Variable           | Required     | Description                                                                                                                                                                                                       |
| ------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`      | Yes          | MongoDB connection string, for example `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/meetsphere?retryWrites=true&w=majority`                                                                                |
| `JWT_SECRET`       | Yes          | Long random string used to sign login tokens. The server refuses to start if it is missing or still the placeholder, and requires 24+ characters in production                                                    |
| `CLIENT_URL`       | Yes          | Allowed frontend origin(s), comma-separated, no trailing slash. Default `http://localhost:5173`                                                                                                                   |
| `GEMINI_API_KEY`   | For AI notes | Gemini API key. Server-side only                                                                                                                                                                                  |
| `GEMINI_MODEL`     | For AI notes | Gemini model ID. Google retires models regularly (the code default `gemini-2.5-flash` is deprecated), so set this to a model that is currently available to your key. See [Getting your keys](#getting-your-keys) |
| `MAX_PARTICIPANTS` | No           | People per room. Default `8` (WebRTC mesh: keep this small)                                                                                                                                                       |
| `PORT`             | No           | Default `5000`. Render sets this automatically                                                                                                                                                                    |
| `NODE_ENV`         | No           | Set to `production` when deployed                                                                                                                                                                                 |
| `DNS_SERVERS`      | No           | Comma-separated DNS servers, for example `8.8.8.8,1.1.1.1`. Only needed if your network blocks MongoDB `+srv` lookups                                                                                             |

### Frontend (`frontend/.env`)

| Variable               | Required | Description                                                             |
| ---------------------- | -------- | ----------------------------------------------------------------------- |
| `VITE_API_URL`         | Yes      | Backend URL with no trailing slash, for example `http://localhost:5000` |
| `VITE_TURN_URL`        | No       | TURN server URL for users on strict firewalls or mobile networks        |
| `VITE_TURN_USERNAME`   | No       | TURN username                                                           |
| `VITE_TURN_CREDENTIAL` | No       | TURN credential                                                         |

> Vite bakes these values in at build time. If you change one on Vercel, redeploy the frontend.

## Getting your keys

**MongoDB Atlas**

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Database Access: add a database user. Avoid `@ : / ?` in the password, or URL-encode it.
3. Network Access: add `0.0.0.0/0` (Render's IP addresses change on the free plan).
4. Connect > Drivers: copy the connection string and add a database name before the `?`, for example `.../meetsphere?retryWrites=true&w=majority`.

**Gemini API key and model**

1. Create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Open the [model list](https://ai.google.dev/gemini-api/docs/models) and the [deprecations page](https://ai.google.dev/gemini-api/docs/deprecations), pick a current Flash-class model that is not scheduled for shutdown, and set its ID as `GEMINI_MODEL`.
3. Test it: start the backend, finish a short meeting with at least 25 words of chat or captions, and click **Generate AI notes**. A "model was not found" error means the ID is wrong or retired.

**JWT secret**

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Deployment

The repo is set up for **Render** (backend), **Vercel** (frontend) and **MongoDB Atlas** (database), all on free tiers.

### 1. Backend on Render

1. [render.com](https://render.com) > New > **Web Service** > connect your GitHub repo. (Or New > Blueprint, and Render reads `render.yaml`.)
2. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
3. Environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`. Leave `CLIENT_URL` for step 3.
4. Deploy, then open `https://<your-service>.onrender.com/api/health`. You should see `{"ok":true,"db":true,"ai":true}`.

Free Render services sleep when idle, so the first request can take 30 to 60 seconds. Open the health URL a minute before a demo.

### 2. Frontend on Vercel

1. [vercel.com](https://vercel.com) > Add New > Project > import the repo.
2. Root Directory: `frontend`. Framework preset: Vite (build `npm run build`, output `dist`).
3. Environment variable: `VITE_API_URL=https://<your-service>.onrender.com`
4. Deploy. `vercel.json` rewrites every route to `index.html`, so links like `/m/abc-defg-hij` work on refresh.

### 3. Connect the two

Set `CLIENT_URL` on Render to your Vercel URL (no trailing slash, for example `https://meetsphere.vercel.app`). Render redeploys automatically. If you also want to use a custom domain or Vercel preview URLs, add them to `CLIENT_URL` separated by commas.

### 4. Check it end to end

1. `/api/health` returns `ok`, `db` and `ai` all `true`.
2. Sign up, start a meeting, and join from a second device on a different network.
3. Turn on captions in Chrome or Edge, speak, then generate AI notes after leaving.

### Optional: TURN for strict networks

STUN alone fails on some corporate and mobile networks. Create a TURN account with a provider such as Metered or Twilio, add `VITE_TURN_URL`, `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL` on Vercel, and redeploy.

## Troubleshooting

| Symptom                                                | Fix                                                                                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `querySrv ECONNREFUSED` when the backend starts        | Your network or DNS blocks the `mongodb+srv` lookup. Set `DNS_SERVERS=8.8.8.8,1.1.1.1` in `backend/.env`, or use Atlas's non-SRV connection string (Connect > Drivers > Node.js, version "2.2.12 or later"). |
| Backend exits with a MongoDB error                     | Check `MONGODB_URI` (password filled in, special characters URL-encoded) and Atlas Network Access.                                                                                                           |
| Backend exits with a `JWT_SECRET` message              | Set a real secret. The placeholder from `.env.example` is rejected on purpose.                                                                                                                               |
| "Cannot reach the server"                              | The Render service is asleep, or `VITE_API_URL` is wrong. Open `/api/health`.                                                                                                                                |
| CORS or "Origin not allowed"                           | `CLIENT_URL` must exactly match your frontend origin (scheme and host, no trailing slash).                                                                                                                   |
| `'vite' is not recognized`                             | Run `npm install` inside the `frontend` folder first.                                                                                                                                                        |
| Backend keeps restarting in dev                        | If the project lives in a OneDrive-synced folder, sync touches `node_modules` and `node --watch` restarts. Move the project out of OneDrive, or use `npm start`.                                             |
| Video works on Wi-Fi but not mobile data               | Add a TURN server (see above).                                                                                                                                                                               |
| Captions button disabled                               | The browser has no Web Speech API (for example Firefox). Use Chrome, Edge or Safari.                                                                                                                         |
| "Captions need an internet connection in this browser" | The browser's speech service could not be reached. This happens in Brave, which blocks the speech service Chrome uses. Use Chrome or Edge, or check your connection.                                         |
| "AI notes are not configured"                          | `GEMINI_API_KEY` is missing on the server.                                                                                                                                                                   |
| "model was not found"                                  | Update `GEMINI_MODEL` to a current model ID.                                                                                                                                                                 |
| "AI quota is used up"                                  | Free-tier limit reached. Wait, or enable billing in Google AI Studio.                                                                                                                                        |
| "Not enough conversation to summarize"                 | The transcript plus chat needs roughly 25 words. Turn on captions or chat.                                                                                                                                   |

## API reference

| Method | Endpoint                                                 | Auth                       |
| ------ | -------------------------------------------------------- | -------------------------- |
| POST   | `/api/auth/signup`, `/api/auth/login`, `/api/auth/guest` | none                       |
| GET    | `/api/auth/me`                                           | token                      |
| POST   | `/api/meetings`                                          | account                    |
| GET    | `/api/meetings/mine`                                     | account                    |
| GET    | `/api/meetings/:roomId`                                  | none (title and host only) |
| GET    | `/api/meetings/:roomId/details`                          | host or participant        |
| POST   | `/api/summarize/:roomId`                                 | host or participant        |
| GET    | `/api/health`                                            | none                       |

**Socket.IO events:** `room:join`, `room:leave`, `room:participant-joined`, `room:participant-left`, `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`, `chat:message`, `caption:interim`, `caption:line`, `media:state`, `reaction`.

## Security and privacy

- **Identity** comes from the verified JWT, never from client-supplied names. Passwords are hashed with bcrypt.
- **Validation:** request bodies are validated with Zod and size-limited.
- **Rate limits:** global per IP, stricter on auth, limited on AI notes, and per socket for chat, captions and ICE traffic.
- **Signaling** is relayed only between sockets in the same room, with size limits on payloads.
- **Access control:** anyone with a meeting code can see its title to join. The transcript, chat and notes are only available to the host and people who joined.
- **AI:** the Gemini key never leaves the server, and meeting text is passed to the model as data with instructions not to follow anything inside it.
- **Secrets:** `.env` files are git-ignored. Never commit them, and never commit `node_modules`.

Captions, chat and notes can contain sensitive information. Tell participants that speech is transcribed by their browser's speech service and that generating notes sends the transcript and chat to Google's Gemini API. Review Google's current data-use terms before using real meetings.

## Project structure

```
meetsphere/
├── backend/
│   ├── middleware/auth.js          JWT verification and auth guards
│   ├── models/                     Mongoose models (User, Meeting)
│   ├── routes/                     REST routes (auth, meetings, summarize)
│   ├── services/geminiService.js   Gemini request, prompt and response validation
│   ├── socket/signaling.js         Socket.IO: rooms, WebRTC signaling, chat, captions
│   ├── server.js                   Express app and HTTP / Socket.IO server
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/                    Axios client
│   │   ├── components/             ControlBar, VideoTile, ChatPanel, PeoplePanel, ...
│   │   ├── context/                AuthContext
│   │   ├── hooks/                  useWebRTC, useLiveCaptions
│   │   ├── pages/                  Home, Auth, Dashboard, Lobby, Room, Meeting, Notes
│   │   └── styles.css
│   ├── vercel.json                 SPA rewrites for Vercel
│   └── .env.example
├── screenshots/                    Images used in this README
├── render.yaml                     Render blueprint
├── LICENSE
└── README.md
```

## Limitations and roadmap

**Current limitations**

- **Mesh WebRTC:** every participant sends video to every other participant, so rooms are capped at 8 by default and quality drops as the room grows.
- **Single server instance:** live room state is kept in memory. Running several instances needs the Socket.IO Redis adapter.
- **Captions** use the browser's Web Speech API, which sends audio to the browser vendor's speech service. They work in Chrome, Edge and Safari, but not in Firefox, and not in Brave (which blocks that service). Accuracy varies by accent and microphone.
- **Free-tier hosting** cold starts on Render can delay the first request.
- No recordings and no host moderation tools yet (the host is shown with a badge only).

**Ideas for next steps**

- [ ] Server-side speech-to-text so captions work in every browser
- [ ] Move to an SFU (LiveKit or mediasoup) for larger rooms
- [ ] Host controls: mute or remove participants, lock the room
- [ ] Socket.IO Redis adapter for horizontal scaling
- [ ] Automated tests and a CI workflow
- [ ] Export notes as PDF and share them by link

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

## Author

**YOUR NAME**
GitHub: [@YOUR_GITHUB_USERNAME](https://github.com/YOUR_GITHUB_USERNAME)

Built with [React](https://react.dev), [Express](https://expressjs.com), [Socket.IO](https://socket.io), [Lucide](https://lucide.dev) icons, and the Inter and Bricolage Grotesque typefaces.
