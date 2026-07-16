# WorkSpace — Architecture & Reference

Full technical reference for the WorkSpace project. See the main [README](../README.md) for a quick overview and setup instructions.

## Features

### 💬 Real-time Messaging
- Instant message delivery via Socket.io WebSockets
- Typing indicators — "Rahul is typing..."
- Online / offline presence with last seen timestamps
- Read receipts per conversation
- Reply to any message with quoted preview
- Delete messages with confirmation — removes for all users instantly
- File sharing — images, PDFs, Word docs, spreadsheets (via Cloudinary CDN)

### 🤝 Conversations
- 1-on-1 direct messages and group chats
- Message request system — users must accept before chatting
- Accept or decline incoming requests from sidebar
- Delete conversations (removes all messages)
- Real-time unread badge counts per conversation
- Sidebar auto-updates when someone starts a new chat

### ✅ Shared Task Board
- Per-conversation task panel visible to all members
- Create tasks with title, assignee, and due date
- Click status circle to cycle: Todo → In Progress → Done
- Convert any message into a task with one click
- Real-time sync — both users see updates instantly
- Workspace Dashboard — all tasks across all conversations in one view
- Filter by status, see overdue tasks highlighted in red
- Circular progress ring showing overall completion percentage

### 📝 Collaborative Notes
- Shared notepad per conversation — both users edit simultaneously
- Auto-saves every 1 second with a live "Saving..." indicator
- Real-time sync via Socket.io — no refresh needed

### 🔗 Links & Documents Panel
- Save named links per conversation (e.g. "Design Figma File")
- Automatic message sent when a link or document is saved
- Upload and store documents (PDF, DOCX, XLSX) via Cloudinary
- Download anytime — files persist on CDN
- Real-time sync to all conversation members

### 🔐 Authentication & Security
- Email OTP verification — account created only after email confirmed
- 6-digit OTP with 10-minute expiry, resend with countdown timer
- Email sent via Nodemailer + Gmail with a branded HTML template
- JWT access tokens (7-day expiry)
- bcrypt password hashing (10 salt rounds)
- Rate limiting — 1000 req/15min general, 50 req/15min on auth routes
- Helmet security headers, Gzip compression

### 👤 User Profile
- Upload and crop avatar (Cloudinary, high quality)
- Update display name
- Change password with current password verification
- Account stats — messages sent, conversations joined
- Delete account — removes all messages and conversations
- Email verified badge

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework + build tool |
| Tailwind CSS v4 | Utility-first styling |
| Zustand | Global state management |
| Socket.io Client | Real-time WebSocket connection |
| Axios | HTTP requests with interceptors |
| React Router v6 | Client-side routing |
| date-fns | Date formatting |
| lucide-react | Icon library |
| react-hot-toast | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express.js | Runtime + HTTP server |
| Socket.io | WebSocket real-time events |
| MongoDB + Mongoose | Database + ODM |
| Redis (Upstash) | Online presence + caching |
| JWT | Authentication tokens |
| bcryptjs | Password hashing |
| Nodemailer | OTP email delivery |
| Cloudinary | File and image storage |
| Helmet | HTTP security headers |
| express-rate-limit | API rate limiting |
| compression | Gzip response compression |
| morgan | HTTP request logger |
| Zod | Input validation |

### Infrastructure
| Service | What it hosts |
|---|---|
| Vercel | React frontend (CDN) |
| Render | Node.js backend |
| MongoDB Atlas | M0 free cluster |
| Upstash | Serverless Redis |
| Cloudinary | Files, images, documents |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Sidebar  │  │  Chat    │  │ Tasks &  │  │ Dashboard │  │
│  │ + Requests│  │ Window   │  │  Notes   │  │           │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│        │              │              │                       │
│   Zustand Store   Axios API    Socket.io Client             │
└───────────────────────┼─────────────────────────────────────┘
                        │  HTTPS + WSS
┌───────────────────────▼─────────────────────────────────────┐
│                   Backend (Express + Socket.io)              │
│                                                             │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Auth   │  │  Conv.   │  │ Messages │  │  Tasks &   │  │
│  │  Routes │  │  Routes  │  │  Routes  │  │  Notes     │  │
│  └─────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Socket.io Rooms                    │   │
│  │  user:online  message:send  task:update  note:update │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐   │
│  │  MongoDB     │  │  Redis Cache  │  │   Cloudinary   │   │
│  │  Atlas       │  │  (Upstash)    │  │   CDN Files    │   │
│  └──────────────┘  └───────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```
users           → name, email, password, avatarUrl, lastSeen, isVerified
conversations   → members[], status (active/pending/declined), unreadCounts, lastMessage
messages        → sender, content, file{url,name,type,size}, replyTo, isRead
tasks           → title, status (PENDING/IN_PROGRESS/DONE), dueDate, assignedTo, fromMessage
notes           → content, links[], docs[], updatedBy (1 per conversation)
otps            → email, otp, metadata (temp registration data), expiresAt
```

---

## Performance & Scalability

| Technique | Impact |
|---|---|
| MongoDB connection pooling (50 connections) | Handles concurrent DB operations |
| Redis caching for conversation lists (30s TTL) | Reduces DB reads by ~80% |
| MongoDB indexes on messages, conversations, tasks | Fast queries at scale |
| Socket.io rooms — messages only sent to members | No unnecessary broadcasts |
| Cursor-based pagination for messages (20 per page) | Never loads full history |
| Gzip compression via `compression` | ~70% smaller API responses |
| Rate limiting (1000 req/15min) | Protects against abuse |
| Temp message optimistic UI → replaced by real ID | Zero-latency feel for sender |

Designed to handle 1000–2000 concurrent users comfortably.

---

## Project Structure

```
workspace/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/           # ChatWindow, MessageBubble, NewChatModal
│   │   │   ├── layout/         # Sidebar, WorkspacePanel
│   │   │   ├── tasks/          # TaskPanel
│   │   │   ├── notes/          # NotePanel (Notes + Links + Docs tabs)
│   │   │   └── profile/        # ProfilePanel
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── VerifyOTPPage.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   └── DashboardPage.jsx
│   │   ├── store/
│   │   │   ├── authStore.js    # Zustand auth state
│   │   │   └── chatStore.js    # Zustand chat/task state
│   │   ├── services/
│   │   │   ├── api.js          # Axios instance + interceptors
│   │   │   ├── socket.js       # Socket.io connection
│   │   │   └── upload.js       # Cloudinary direct upload
│   │   └── theme.js            # Obsidian Gold design tokens
│   └── package.json
│
└── server/                     # Node.js backend
    ├── src/
    │   ├── config/
    │   │   ├── db.js           # MongoDB connection (pool 50)
    │   │   ├── redis.js        # Redis/Upstash connection
    │   │   ├── email.js        # Nodemailer + HTML OTP template
    │   │   ├── cloudinary.js   # Cloudinary config
    │   │   └── indexes.js      # MongoDB index creation
    │   ├── controllers/
    │   │   ├── authController.js
    │   │   ├── conversationController.js
    │   │   ├── messageController.js
    │   │   ├── taskController.js
    │   │   ├── noteController.js
    │   │   ├── uploadController.js
    │   │   └── profileController.js
    │   ├── models/
    │   │   ├── User.js
    │   │   ├── Conversation.js
    │   │   ├── Message.js
    │   │   ├── Task.js
    │   │   ├── Note.js
    │   │   └── Otp.js
    │   ├── routes/
    │   │   ├── authRoutes.js
    │   │   ├── conversationRoutes.js
    │   │   ├── messageRoutes.js
    │   │   ├── taskRoutes.js
    │   │   ├── noteRoutes.js
    │   │   ├── uploadRoutes.js
    │   │   └── profileRoutes.js
    │   ├── middleware/
    │   │   └── auth.js         # JWT protect middleware
    │   ├── socket/
    │   │   └── index.js        # All Socket.io event handlers
    │   └── index.js            # Express app entry point
    └── package.json
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Send OTP (no account created yet) |
| POST | `/api/auth/verify-otp` | Verify OTP → create account |
| POST | `/api/auth/resend-otp` | Resend OTP email |
| POST | `/api/auth/login` | Login (verified users only) |
| GET | `/api/auth/me` | Get current user |

### Conversations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/conversations` | Get all conversations |
| POST | `/api/conversations` | Start 1-on-1 (creates pending request) |
| POST | `/api/conversations/group` | Create group chat |
| PUT | `/api/conversations/:id/accept` | Accept message request |
| PUT | `/api/conversations/:id/decline` | Decline message request |
| DELETE | `/api/conversations/:id` | Delete conversation |
| PUT | `/api/conversations/:id/read` | Mark as read |
| GET | `/api/conversations/search` | Search users |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/:conversationId` | Get messages (paginated) |
| POST | `/api/messages/convert/:messageId` | Convert message to task |
| DELETE | `/api/messages/:messageId` | Delete message |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks/my` | All tasks across all conversations |
| GET | `/api/tasks/:conversationId` | Tasks for a conversation |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:taskId` | Update task status/details |
| DELETE | `/api/tasks/:taskId` | Delete task |

### Notes
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notes/:conversationId` | Get note + links + docs |
| PUT | `/api/notes/:conversationId` | Update note content |
| PUT | `/api/notes/:conversationId/links` | Add link |
| DELETE | `/api/notes/:conversationId/links/:linkId` | Remove link |
| PUT | `/api/notes/:conversationId/docs` | Add document |
| DELETE | `/api/notes/:conversationId/docs/:docId` | Remove document |

### Profile
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile` | Get profile + stats |
| PUT | `/api/profile/avatar` | Update avatar URL |
| PUT | `/api/profile/name` | Update display name |
| PUT | `/api/profile/password` | Change password |
| DELETE | `/api/profile` | Delete account |

---

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `user:online` | `userId` | Register as online |
| `conversation:join` | `conversationId` | Join a chat room |
| `conversation:leave` | `conversationId` | Leave a chat room |
| `message:send` | `{conversationId, content, senderId, replyToId}` | Send message |
| `message:delete` | `{messageId, conversationId}` | Delete message |
| `message:broadcast` | `{conversationId, message}` | Broadcast file message |
| `typing:start` | `{conversationId, userId, userName}` | Typing indicator on |
| `typing:stop` | `{conversationId, userId}` | Typing indicator off |
| `messages:read` | `{conversationId, userId}` | Mark messages read |
| `task:update` | `{conversationId, task, isNew}` | Task created/updated |
| `note:update` | `{conversationId, content, userId}` | Note content changed |
| `note:link_add` | `{conversationId, link}` | Link saved |
| `note:doc_add` | `{conversationId, doc}` | Document saved |

### Server → Client
| Event | Description |
|---|---|
| `message:received` | New message delivered |
| `message:deleted` | Message deleted by sender |
| `user:status` | User online/offline change |
| `users:online` | List of online user IDs |
| `typing:start/stop` | Typing indicator |
| `messages:read` | Read receipt |
| `task:updated` | Task state changed |
| `note:updated` | Note content changed |
| `conversation:new` | New or updated conversation |
| `conversation:request` | Incoming message request |
| `conversation:accepted` | Request was accepted |
| `conversation:deleted` | Conversation deleted |
| `notification:new` | New message notification |