import React, { useEffect, useCallback } from "react";
import { pageContent } from "../data/pageContent";
import "./Signpopup.css";

// `page` is one of "about" | "mywork" | "contact" | null (closed).
// Pass the exact same route ids that Room.js already emits via
// onSignNavigate — no translation layer needed.
export function SignPopup({ page, onClose }) {
  const isOpen = !!page;
  const content = page ? pageContent[page] : null;

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    // Lock background scroll while a popup is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !content) return null;

  return (
    <div
      className="sign-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`sign-card accent-${content.accent}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
      >
        <span className="sign-tape sign-tape-left" />
        <span className="sign-tape sign-tape-right" />

        <button className="sign-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="sign-header">
          <span className="sign-icon">{content.icon}</span>
          <h2>{content.title}</h2>
        </div>

        <div className="sign-body">
          {page === "about" && <AboutPage content={content} />}
          {page === "mywork" && <WorkPage content={content} />}
          {page === "contact" && <ContactPage content={content} />}
        </div>
      </div>
    </div>
  );
}

function AboutPage({ content }) {
  return (
    <div className="about-layout">
      {content.photo && (
        <div className="about-photo-frame">
          <img src={content.photo} alt="Profile" />
        </div>
      )}
      <div className="about-text">
        {content.bio.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        <div className="skill-pills">
          {content.skills.map((skill) => (
            <span className="skill-pill" key={skill}>
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkPage({ content }) {
  return (
    <div className="work-grid">
      {content.projects.map((project) => (
        <div className="project-card" key={project.title}>
          {project.image && (
            <div className="project-image">
              <img src={project.image} alt={project.title} />
            </div>
          )}
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          <div className="project-tags">
            {project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="project-links">
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noreferrer">
                Live ↗
              </a>
            )}
            {project.codeUrl && (
              <a href={project.codeUrl} target="_blank" rel="noreferrer">
                Code ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactPage({ content }) {
  return (
    <div className="contact-layout">
      <p className="contact-message">{content.message}</p>

      <a className="contact-email" href={`mailto:${content.email}`}>
        ✉️ {content.email}
      </a>

      <div className="social-links">
        {content.socials.map((s) => (
          <a href={s.url} target="_blank" rel="noreferrer" key={s.label}>
            <span>{s.icon}</span> {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}