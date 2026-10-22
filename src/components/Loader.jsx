import React, { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import "./Loader.css";

const MIN_VISIBLE_MS = 900; // avoid a flash when everything is cached
const FADE_MS = 700; // must match the transition in Loader.css

const MESSAGES = [
  { upTo: 30, text: "Unpacking the boxes" },
  { upTo: 60, text: "Painting the walls" },
  { upTo: 90, text: "Arranging the furniture" },
  { upTo: 101, text: "Switching on the lights" },
];

/**
 * Full-screen loading screen. Render it OUTSIDE <Canvas>, next to it:
 *
 *   <Loader />
 *   <Canvas>...</Canvas>
 */
export default function Loader() {
  const { progress, errors } = useProgress();
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState("loading"); // "loading" | "fading" | "done"
  const startedAt = useRef(performance.now());

  // Never let the bar move backwards when drei reports a new asset batch.
  useEffect(() => {
    setShown((previous) => Math.max(previous, Math.round(progress)));
  }, [progress]);

  useEffect(() => {
    if (progress < 100) return undefined;
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt.current));
    const timer = setTimeout(() => setPhase("fading"), wait);
    return () => clearTimeout(timer);
  }, [progress]);

  useEffect(() => {
    if (phase !== "fading") return undefined;
    const timer = setTimeout(() => setPhase("done"), FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "done") return null;

  const hasError = errors.length > 0;
  const message = MESSAGES.find((m) => shown < m.upTo).text;

  return (
    <div
      className={`loader${phase === "fading" ? " loader--hide" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="loader__scene" aria-hidden="true">
        <div className="loader__hop">
          <div className="loader__cube">
            <span className="loader__face loader__face--wall-a" />
            <span className="loader__face loader__face--wall-b" />
            <span className="loader__face loader__face--wall-c" />
            <span className="loader__face loader__face--wall-d" />
            <span className="loader__face loader__face--roof" />
            <span className="loader__face loader__face--floor" />
          </div>
        </div>
        <div className="loader__shadow" />
      </div>

      <h1 className="loader__title">Tushar&rsquo;s room</h1>

      {hasError ? (
        <p className="loader__message loader__message--error">
          Some files didn&rsquo;t load. Check your connection and refresh the page.
        </p>
      ) : (
        <>
          <p className="loader__message">{message}&hellip;</p>
          <div
            className="loader__bar"
            role="progressbar"
            aria-label="Loading the room"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={shown}
          >
            <span className="loader__bar-fill" style={{ width: `${shown}%` }} />
          </div>
          <span className="loader__percent">{shown}%</span>
        </>
      )}
    </div>
  );
}