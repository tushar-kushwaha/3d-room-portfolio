import React, { useEffect, useId, useState } from "react";
import "./InfoPanel.css";

// Edit this list to match what your room can do. "action" is shown as a small
// tag and also drives its color (see InfoPanel.css).
const INTERACTIONS = [
  { icon: "🖱️", action: "Drag", title: "Look around", text: "Drag to rotate the room." },
  {
    icon: "🖼️",
    action: "Double-click",
    title: "Photo frames",
    text: "Hover to enlarge. Double-click to zoom in, and again to zoom out.",
  },
  { icon: "🪧", action: "Click", title: "Signboards", text: "Open My Work, About or Contact." },
  { icon: "🪑", action: "Click", title: "Chair", text: "Give it a spin." },
  { icon: "🐟", action: "Hover", title: "Aquarium", text: "Hover over the tank and the fish start to swim." },
  { icon: "🖥️", action: "Hover", title: "Computer", text: "A little plushy pops out of the screen." },
  {
    icon: "☕",
    action: "Hover",
    title: "Desk props",
    text: "The mug, boba, Batman and GitHub logos grow when you point at them.",
  },
  { icon: "🎨", action: "Click", title: "Name sign", text: "Click my name to change its color." },
];

const isWideScreen = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 720px)").matches;

/**
 * Fixed top-right guide. Open by default on desktop, closed on phones.
 * Render it next to <Canvas>, inside your app root.
 */
export default function InfoPanel() {
  const [open, setOpen] = useState(isWideScreen);
  const panelId = useId();

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <aside className="info-panel" aria-label="Room guide">
      <button
        type="button"
        className="info-panel__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">✨</span>
        {open ? "Hide guide" : "What can I do here?"}
      </button>

      {open && (
        <div id={panelId} className="info-panel__card">
          <h2 className="info-panel__heading">Things to try</h2>
          <ul className="info-panel__list">
            {INTERACTIONS.map((item) => (
              <li key={item.title} className="info-panel__item">
                <span className="info-panel__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="info-panel__body">
                  <p className="info-panel__title">
                    {item.title}
                    <span className="info-panel__tag" data-action={item.action}>
                      {item.action}
                    </span>
                  </p>
                  <p className="info-panel__text">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}