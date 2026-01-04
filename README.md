# CryptoChat (chat-go)

CryptoChat is a secure, decentralized-style real-time messaging application that uses a "wallet" metaphor for chat rooms. It features a Go backend for handling WebSocket connections and room management, and a modern React frontend with a crypto-aesthetic UI.

## 🚀 Features

*   **Real-time Messaging:** Fast and efficient communication using WebSockets.
*   **Secure Room Access:** Rooms function like "Smart Contracts" or "Wallets" with unique 0x addresses and UUID access keys.
*   **No Central Message Storage:** Messages are relayed through the server but stored locally on the client (browser localStorage), enhancing privacy.
*   **QR Code Sharing:** Easily share room access via generated QR codes (`walletchat://` protocol).
*   **Modern UI:** Dark-themed, crypto-inspired interface built with Tailwind CSS.
*   **Multi-Room Support:** Manage and switch between multiple secure chat rooms.

## 🛠 Tech Stack

### Backend (`chat-go-wallet`)
*   **Language:** Go (Golang)
*   **Framework:** Gin (HTTP Web Framework)
*   **WebSocket:** Melody
*   **Persistence:** JSON file (`rooms.json`) for room metadata.

### Frontend (`frontend`)
*   **Framework:** React (via Vite)
*   **Styling:** Tailwind CSS
*   **QR Codes:** `qrcode.react`
*   **State Management:** React Hooks + LocalStorage

## 📋 Prerequisites

*   [Go](https://go.dev/dl/) (version 1.18 or higher)
*   [Node.js](https://nodejs.org/) (version 16 or higher)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)

## ⚙️ Installation & Setup

### 1. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd chat-go-wallet
go mod tidy
```

Start the backend server:

```bash
go run main.go
```

The backend will start on port `3000` (default). You should see:
```
🔐 WalletChat Backend Rodando
📡 Porta: 3000
```

### 2. Frontend Setup

Open a new terminal, navigate to the frontend directory, and install dependencies:

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will typically run on `http://localhost:5173`.

## 🖥 Usage

1.  **Open the Application:** Access the frontend URL (e.g., `http://localhost:5173`) in your browser.
2.  **Create a Room:**
    *   Click the **"Criar Sala"** (Create Room) button.
    *   Enter a name for your room.
    *   The system will generate a **Room Address** (e.g., `0x123...`) and an **Access Key**.
    *   **Save these credentials!** They are required to enter the room on other devices.
3.  **Invite Others:**
    *   Share the Room Address and Access Key.
    *   Or, click the "Eye" icon to show the QR Code and let others scan it.
4.  **Join a Room:**
    *   Click **"Entrar"** (Join) or the **+** icon in the sidebar.
    *   Enter the Name, Address, and Access Key provided to you.

## 📂 Project Structure

```
chat-go/
├── chat-go-wallet/       # Backend (Go)
│   ├── main.go           # Main server entry point
│   ├── rooms.json        # Persisted room data (created at runtime)
│   └── ...
├── frontend/             # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx       # Main UI Logic
│   │   └── ...
│   └── ...
└── README.md             # This file
```

## 🔒 Security Note

*   **Message Privacy:** Messages are **not** stored in a database on the server. They are broadcasted to connected clients and saved in your browser's Local Storage. If you clear your browser cache, your message history for that device is lost.
*   **Room Metadata:** Room existence and keys are stored in `chat-go-wallet/rooms.json`.

## 🤝 Contributing

Feel free to submit issues or pull requests to improve the project.

## 📄 License

This project is open-source.