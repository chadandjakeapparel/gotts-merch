"use client";

import { useEffect, useRef, useState } from "react";

export type LightboxFile = { id: number; fileName: string; url: string; contentType: string };

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isImageFile(contentType: string) {
  return IMAGE_TYPES.has(contentType);
}

/**
 * A full-screen image viewer with arrow-key/button navigation, plus a
 * collapsible strip of thumbnails for every image in the same list. The
 * strip keeps every thumbnail in place and just highlights the current one,
 * instead of dropping it out of the grid -- otherwise selecting a thumbnail
 * makes the grid reflow as the old thumbnail reappears and the new one
 * vanishes, which reads as the image "replacing" rather than rotating.
 */
export function ImageLightbox({
  files,
  index,
  onClose,
  onNavigate,
}: {
  files: LightboxFile[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const file = files[index];
  const [thumbsOpen, setThumbsOpen] = useState(files.length > 1);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((index - 1 + files.length) % files.length);
      if (e.key === "ArrowRight") onNavigate((index + 1) % files.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, files.length, onClose, onNavigate]);

  if (!file) return null;

  return (
    <div className="portal-lightbox-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button aria-label="Close" className="portal-lightbox-close" onClick={onClose} type="button">×</button>
      {files.length > 1 ? (
        <button
          aria-label="Previous image"
          className="portal-lightbox-nav prev"
          onClick={() => onNavigate((index - 1 + files.length) % files.length)}
          type="button"
        >
          ‹
        </button>
      ) : null}
      <div className="portal-lightbox-stage">
        {/* eslint-disable-next-line @next/next/no-img-element -- a remote blob image of unknown intrinsic size */}
        <img alt={file.fileName} className="portal-lightbox-img" key={file.id} src={file.url} />
      </div>
      {files.length > 1 ? (
        <button
          aria-label="Next image"
          className="portal-lightbox-nav next"
          onClick={() => onNavigate((index + 1) % files.length)}
          type="button"
        >
          ›
        </button>
      ) : null}
      <div className="portal-lightbox-caption">
        {file.fileName}
        {files.length > 1 ? ` · ${index + 1} / ${files.length}` : ""}
      </div>
      {files.length > 1 ? (
        <div className="portal-lightbox-accordion" onMouseDown={(e) => e.stopPropagation()}>
          <button
            aria-expanded={thumbsOpen}
            className="portal-lightbox-accordion-toggle"
            onClick={() => setThumbsOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true">{thumbsOpen ? "▾" : "▸"}</span> Images in this folder ({files.length})
          </button>
          {thumbsOpen ? (
            <div className="portal-lightbox-thumbs">
              {files.map((f, i) => {
                const active = i === index;
                return (
                  <button
                    aria-current={active}
                    className={`portal-lightbox-thumb${active ? " active" : ""}`}
                    key={f.id}
                    onClick={() => onNavigate(i)}
                    ref={active ? activeThumbRef : undefined}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a remote blob image of unknown intrinsic size */}
                    <img alt={f.fileName} src={f.url} />
                    <span>{f.fileName}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
