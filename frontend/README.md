# Infinite AI Radio 🎧

This is a personal AI-powered music radio built with OpenAI + Spotify.

## Features

- 🎶 Infinite AI-generated tracks based on your mood
- 🧠 Uses GPT to generate real songs that match a vibe
- 🔁 Auto-refills the queue as you listen
- 🎨 Dynamic background colors
- 🎧 Playback via Spotify Web SDK

## Stack

- React (Frontend)
- Go + Gin (Backend)
- Spotify API
- OpenAI API

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/timmfy/ai-radio.git
cd ai-radio
```

### 2. Set up environment variables

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### 3. Run the backend

```bash
cd backend
go run main.go
```

### 4. Run the frontend

```bash
cd frontend
npm install
npm start
```
