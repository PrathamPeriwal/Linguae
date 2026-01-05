# Linguae

> Learn languages through real conversations.

A modern, full-featured language exchange platform enabling users to connect with native speakers globally for real-time language learning through messaging, video calls, and live interaction.

---

## 🌟 Overview

Linguae is a production-ready language exchange application that bridges learners and native speakers in a seamless, real-time environment. Built with a modern tech stack and designed for scalability, Linguae combines intuitive UI/UX with powerful real-time capabilities to create an engaging platform for language learners worldwide.

**Key Value Proposition:**
- Connect with real language partners matched by learning goals
- Learn naturally through authentic conversations
- Flexible communication modes (chat, voice, video)
- Curated language exchange experience with community safety

---

## ✨ Key Features

### Real-Time Communication
- 🌐 **Live Messaging** – Type indicators, read receipts, and instant message delivery
- 💬 **Message Reactions** – Emoji reactions for engaging conversations
- 🖼️ **Media Sharing** – Upload and share images in conversations

### Video & Voice
- 📹 **One-on-One Video Calls** – Crystal-clear peer-to-peer communication
- 👥 **Group Video Calls** – Connect with multiple learners simultaneously
- 🎬 **Screen Sharing** – Share your screen for collaborative learning
- 🎥 **Call Recording** – Record sessions for future reference

### Community & Discovery
- 👤 **User Profiles** – Showcase native language, learning goals, and bio
- 🔍 **Smart Matching** – Find language partners based on language preferences
- 🌐 **Online Status** – See who's available in real-time
- 🤝 **Friend Requests & Notifications** – Build your learning network

### Personalization
- 🎨 **32 Unique UI Themes** – Customize your experience with diverse visual themes
- 💾 **Persistent Theme Preference** – Your theme choice is saved locally

### Security & Reliability
- 🔐 **JWT Authentication** – Secure token-based authentication
- 🛡️ **Protected Routes** – Role-based access control
- 🚨 **Comprehensive Error Handling** – Graceful error recovery on both frontend and backend
- ⚡ **Production-Ready Architecture** – Designed for scale and reliability

---

## 🛠️ Tech Stack

### Frontend
- **React** – UI framework
- **Vite** – Lightning-fast build tool
- **Tailwind CSS** – Utility-first styling
- **Zustand** – Lightweight global state management
- **TanStack Query** – Powerful data fetching and caching
- **Lucide React** – Icon library
- **Stream Chat** – Real-time messaging SDK

### Backend
- **Node.js** – Runtime environment
- **Express.js** – Web framework
- **MongoDB** – NoSQL database
- **Stream** – Real-time messaging and video infrastructure
- **JWT** – Authentication
- **Mongoose** – MongoDB ODM

---

## 🚀 Getting Started

### Prerequisites

Ensure you have installed:
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **MongoDB** (local or Atlas cloud)
- **Stream account** (https://stream.io)

### Environment Setup

#### Backend Configuration (`/backend`)

Create a `.env` file in the `/backend` directory:

```env
# Server
PORT=5001
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/linguae

# Stream API (Real-time & Video)
STEAM_API_KEY=your_stream_api_key
STEAM_API_SECRET=your_stream_api_secret

# Authentication
JWT_SECRET_KEY=your_secure_jwt_secret_key_here
```

#### Frontend Configuration (`/frontend`)

Create a `.env` file in the `/frontend` directory:

```env
# Stream API
VITE_STREAM_API_KEY=your_stream_api_key
```

### Installation & Running

#### Backend Setup

```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:5001`

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available on `http://localhost:5173` (default Vite port)

---

## 📁 Project Structure

```
linguae/
├── backend/
│   ├── src/
│   │   ├── controllers/          # Business logic
│   │   ├── models/               # MongoDB schemas
│   │   ├── routes/               # API endpoints
│   │   ├── middleware/           # Custom middleware
│   │   ├── lib/                  # Utilities & services
│   │   └── server.js             # Entry point
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── store/                # Zustand state
│   │   ├── lib/                  # Utilities
│   │   ├── constants/            # App constants
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── .env
│   └── configuration files
│
├── package.json
└── README.md
```

### Authentication Flow
1. User signs up with email, full name, native language, and learning language
2. JWT token generated and stored securely
3. Protected routes validate token on each request
4. Automatic logout on token expiration

### Real-Time Messaging
- **Stream Chat Integration** – Leverages Stream's infrastructure for:
  - Instant message delivery with typing indicators
  - Message history and persistence
  - Unread message tracking
  - Reaction support

### Friend Discovery & Matching
- Users can browse recommended language partners
- Filter by native language
- Search by user name
- Send/accept friend requests
- View friend request notifications

### Video Call System
- Peer-to-peer connections via Stream
- Screen sharing for collaborative sessions
- Call recording for future learning review
- Real-time communication with low latency

---

## 🎨 UI/UX Highlights

- **Responsive Design** – Optimized for mobile, tablet, and desktop
- **32 Theme Options** – Complete visual customization with persistent storage
- **Accessibility** – Semantic HTML and ARIA labels
- **Loading States** – Skeleton screens and spinners for smooth UX
- **Error Feedback** – User-friendly error messages and alerts
- **Mobile Navigation** – Hamburger menu with smooth scrolling

---

## 🔐 Security Considerations

- **JWT Tokens** – Secure, stateless authentication
- **Password Hashing** – Bcrypt for password security (backend)
- **Protected Endpoints** – Middleware validates authentication
- **CORS Configuration** – Restricts cross-origin requests
- **Environment Variables** – Sensitive data never hardcoded
- **Stream Security** – Tokens validated server-side before use

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is open-source and available under the MIT License.

---

**Linguae** – Connecting language learners worldwide. 🌍✨
