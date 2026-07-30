# Tune Together 🎵

![Tune Together Cover](/public/og.png)

A modern, real-time social music listening platform built with Next.js. Listen to music, share queues, and chat with friends in perfectly synced playback sessions.

## 🌟 Live Demo

**[tunetogether.vercel.app](https://tunetogether.vercel.app)**

## ✨ Key Features

- **Synced Playback**: Create or join a room to listen to the exact same track at the exact same time as your friends. 
- **Real-Time Queue Management**: Anyone in the room can search for tracks and add them to the shared queue via WebSockets.
- **In-App Chat & Reactions**: Chat with room members in real-time without interrupting playback. Send quick emoji reactions that float across everyone's screens.
- **Synced Lyrics**: Follow along with perfectly timed lyrics integrated directly into the player sidebar or full-screen view.
- **Dynamic Mobile Experience**: A fully responsive mobile layout featuring a gesture-friendly bottom sheet player ("Now Playing" view).
- **Listening History**: Automatically tracks your recently played tracks and most-listened artists.

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), React, Tailwind CSS
- **Authentication**: [Clerk](https://clerk.dev/)
- **Real-Time Communication**: [Socket.io](https://socket.io/) (WebSockets)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose)
- **Audio Engine**: [React Player](https://github.com/CookPete/react-player)
- **Lyrics API**: [LRCLIB](https://lrclib.net/)
- **State Management**: Custom Event-Driven Architecture (Vanilla JS CustomEvents)
- **Deployment**: Vercel (Frontend & Serverless API), Render/Railway (Socket Server)

## 🚀 Getting Started

### Prerequisites

Ensure you have Node.js (v18+) and npm/yarn installed.

### Environment Variables

Create a `.env.local` file in the root directory and add the following:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# Socket Server URL (if hosting separately, otherwise points to self)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tune-together.git
   cd tune-together
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📱 Responsiveness

The application adopts a responsive, desktop-first architecture that seamlessly transitions into a mobile-friendly interface:
- **Desktop**: Three-column layout featuring library sidebar, main feed, and right-hand queue/chat panel.
- **Mobile**: Condensed feed with slide-out drawers for navigation and queue. Full-screen "Now Playing" bottom sheet replaces the inline footer.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📄 License

This project is open-sourced software licensed under the MIT license.
