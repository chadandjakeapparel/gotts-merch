"use client";

import { useEffect, useState } from "react";

export type LightboxFile = { id: number; fileName: string; url: string; contentType: string };

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isImageFile(contentType: string) {
  return IMAGE_TYPES.has(contentType);
}

/**
 * A full-screen image viewer with arrow-key/button navigation, plus a
 * collapsible strip of thumbnails for every other image in the same list
 * below the one that's open.
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
  const [othersOpen, setOthersOpen] = useState(files.length > 1);

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
        <img alt={file.fileName} className="portal-lightbox-img" src={file.url} />
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
            aria-expanded={othersOpen}
            className="portal-lightbox-accordion-toggle"
            onClick={() => setOthersOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true">{othersOpen ? "▾" : "▸"}</span> Other images in this folder ({files.length - 1})
          </button>
          {othersOpen ? (
            <div className="portal-lightbox-thumbs">
              {files.map((f, i) =>
                i === index ? null : (
                  <button className="portal-lightbox-thumb" key={f.id} onClick={() => onNavigate(i)} type="button">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a remote blob image of unknown intrinsic size */}
                    <img alt={f.fileName} src={f.url} />
                    <span>{f.fileName}</span>
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
