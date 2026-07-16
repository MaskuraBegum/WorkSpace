<div align="center">

# ⚡ WorkSpace

### A real-time productivity chat platform — built from scratch



*WorkSpace is more than a chat app — every conversation has a built-in task board, collaborative notepad, link vault, and document storage. Think Slack + Notion, built as a full-stack portfolio project.*

[**Live Demo**](https://work-space-inky.vercel.app/) · [**API**](https://workspace-kaij.onrender.com) · [**Docs**](./docs/ARCHITECTURE.md) 

<div/>
<div align="left">

## ✨ Features

- **Real-time messaging** — Socket.io WebSockets, typing indicators, read receipts, reply-to, delete for everyone, file sharing via Cloudinary
- **Conversations** — 1-on-1 and group chats, message request/accept system, unread badges
- **Shared task board** — per-conversation tasks, convert any message to a task, cross-conversation dashboard with progress ring
- **Collaborative notes** — shared notepad with live auto-save and sync
- **Links & documents** — save links and upload docs per conversation, all synced in real time
- **Auth & security** — email OTP verification, JWT, bcrypt, rate limiting, Helmet
- **Profile** — avatar upload, password change, account stats, delete account

Full feature breakdown → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#features)

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS v4, Zustand, Socket.io Client, Axios, React Router v6
- **Backend:** Node.js, Express, Socket.io, MongoDB + Mongoose, Redis (Upstash), JWT, Cloudinary, Nodemailer
- **Infra:** Vercel (frontend) · Render (backend) · MongoDB Atlas · Upstash Redis · Cloudinary

Full stack details and version rationale → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#tech-stack)

<div>


### Prerequisites
- Node.js 18+, MongoDB Atlas account, Cloudinary account, Gmail App Password, Upstash account


## 🚢 Deployment

| Layer | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys on push to main |
| Backend | Render | Free tier, keep-alive ping every 14min |
| Database | MongoDB Atlas | M0 free, 512MB |
| Cache | Upstash Redis | Serverless, 10k commands/day free |
| Files | Cloudinary | 25GB free, browser direct upload |



---

<div align="center">

**Built with ☕ and a lot of debugging**

⭐ Star this repo if you found it useful!


