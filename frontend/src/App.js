import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

function App() {
  const [prompt, setPrompt] = useState("");
  const [queue, setQueue] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [backgroundColors, setBackgroundColors] = useState([
    "#1db954",
    "#9b59b6",
  ]);
  const playedTracks = useRef(new Set());
  const playerRef = useRef(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.search);
    const token = hash.get("access_token");
    if (token) setAccessToken(token);
  }, []);

  // ✅ 1. Helper function
  const initPlayer = useCallback(() => {
    const player = new window.Spotify.Player({
      name: "AI Radio Player",
      getOAuthToken: (cb) => cb(accessToken),
      volume: 0.5,
    });

    player.addListener("ready", ({ device_id }) => {
      setDeviceId(device_id);
    });

    player.addListener("player_state_changed", (state) => {
      if (!state) return;
      setIsPlaying(!state.paused);
      setPosition(state.position);
      setDuration(state.duration);
    });

    player.connect();
    playerRef.current = player;
  }, [accessToken]);

  // ✅ 2. useEffect to load SDK safely
  useEffect(() => {
    if (!accessToken) return;

    if (window.Spotify) {
      initPlayer();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    script.onload = () => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        initPlayer();
      };
    };

    document.body.appendChild(script);
  }, [accessToken, initPlayer]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setPosition((p) => Math.min(p + 1000, duration));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const fetchSongs = async (userPrompt) => {
    const res = await fetch("http://localhost:8888/api/generate-tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt }),
    });
    const data = await res.json();
    return data.songs.map((s) => `${s.title} ${s.artist}`);
  };

  const handlePromptSubmit = async () => {
    const songs = await fetchSongs(prompt);
    setQueue(filterNewSongs(songs));
    setLastPrompt(prompt);
    playTrack(songs[0]);
  };

  const filterNewSongs = (songs) => {
    return songs.filter((s) => !playedTracks.current.has(s));
  };

  const playTrack = async (song) => {
    if (!song || playedTracks.current.has(song)) return;

    const search = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(song)}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const result = await search.json();
    const track = result.tracks.items[0];
    if (!track) return;

    const trackUri = track.uri;

    await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [trackUri] }),
      },
    );

    setCurrentTrack(track);
    setPosition(0);
    setDuration(track.duration_ms);
    playedTracks.current.add(song);
  };

  const handleSkip = () => {
    const next = queue.find((s) => !playedTracks.current.has(s));
    if (next) {
      setQueue((q) => q.filter((s) => s !== next));
      playTrack(next);
    }
  };

  const handlePrevious = () => {
    if (queue.length === 0) return;
    playTrack(queue[0]);
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      isPlaying ? playerRef.current.pause() : playerRef.current.resume();
    }
  };

  const handleSeek = (e) => {
    const value = parseInt(e.target.value);
    if (playerRef.current) {
      playerRef.current.seek(value);
      setPosition(value);
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (queue.length < 3 && lastPrompt) {
      (async () => {
        const more = await fetchSongs(lastPrompt);
        const newSongs = filterNewSongs(more);
        setQueue((prev) => [...prev, ...newSongs]);
      })();
    }
  }, [queue, lastPrompt]);

  return (
    <div className="app-wrapper">
      <div
        className="background-shapes"
        style={{
          background: `linear-gradient(135deg, ${backgroundColors[0]}, ${backgroundColors[1]})`,
          transition: "background 2s ease-in-out",
        }}
      ></div>
      <div className="App">
        {!accessToken ? (
          <a href="http://localhost:8888/login">
            <button className="login-btn">Login with Spotify</button>
          </a>
        ) : (
          <>
            <input
              className="search"
              type="text"
              placeholder="i want to listen..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button onClick={handlePromptSubmit}>Play</button>

            {currentTrack && (
              <div className="player">
                <h2 className="now-playing">Now playing...</h2>
                <p>
                  {currentTrack.name} — {currentTrack.artists[0].name}
                </p>

                <div className="progress-container">
                  <span>{formatTime(position)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={position}
                    onChange={handleSeek}
                  />
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="controls">
                  <button onClick={handlePrevious}>⏮</button>
                  <button onClick={togglePlayPause}>
                    {isPlaying ? "⏸" : "▶️"}
                  </button>
                  <button onClick={handleSkip}>⏭</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
