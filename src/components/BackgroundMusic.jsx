import { useEffect, useRef, useState } from "react";

// Background music that starts on the user's FIRST interaction anywhere on
// the page (click/tap/keypress), since browsers block audio-with-sound
// autoplay until then — same restriction the monitor video texture in
// Room.jsx works around by starting muted. There's no reliable way to
// bypass this, so this listens for the first gesture instead of trying to
// call .play() on mount.
//
// Drop <BackgroundMusic /> once near the top of App.js, OUTSIDE the
// <Canvas> — it's plain HTML audio, not a 3D scene object.
const MUSIC_SRC = "/audio/background music.mp3";
const DEFAULT_VOLUME = 0.35; // background music should sit under everything else, not compete with it

export function BackgroundMusic() {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  // Start playback on the first user gesture, then remove the listeners —
  // this only needs to fire once per page load.
  useEffect(() => {
    if (started) return;

    const tryStart = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = DEFAULT_VOLUME;
      audio.play().then(() => setStarted(true)).catch(() => {
        // Still blocked for some reason — listeners stay attached and it'll
        // retry on the next gesture.
      });
    };

    window.addEventListener("click", tryStart);
    window.addEventListener("keydown", tryStart);
    window.addEventListener("touchstart", tryStart);

    return () => {
      window.removeEventListener("click", tryStart);
      window.removeEventListener("keydown", tryStart);
      window.removeEventListener("touchstart", tryStart);
    };
  }, [started]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  return (
    <>
      <audio ref={audioRef} src={MUSIC_SRC} loop preload="auto" />
      <button
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute background music" : "Mute background music"}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1000,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          background: "rgba(0,0,0,0.6)",
          color: "white",
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </>
  );
}