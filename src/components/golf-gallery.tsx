"use client";

import { useEffect, useState } from "react";
import type { GalleryImage } from "@/content/site-content";

/**
 * A horizontally-scrolling photo strip with a click-to-enlarge lightbox.
 * Scrolling (rather than a tall grid) keeps the section compact and tidy
 * no matter how many photos get added on the admin side.
 */
export function GolfGallery({ images }: { images: GalleryImage[] }) {
  const photos = images.filter((image) => image.url);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowRight") {
        setOpenIndex((current) => (current === null ? current : (current + 1) % photos.length));
      }
      if (event.key === "ArrowLeft") {
        setOpenIndex((current) =>
          current === null ? current : (current - 1 + photos.length) % photos.length,
        );
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIndex, photos.length]);

  if (!photos.length) return null;

  const active = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className="gm-gallery__track">
        {photos.map((photo, index) => (
          <button
            className="gm-gallery__item"
            key={`${photo.url}-${index}`}
            onClick={() => setOpenIndex(index)}
            type="button"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded gallery photo */}
            <img alt={photo.caption || "Charity golf tournament merch"} src={photo.url} />
          </button>
        ))}
      </div>

      {active ? (
        <div
          aria-modal="true"
          className="gm-lightbox"
          onMouseDown={(event) => event.target === event.currentTarget && setOpenIndex(null)}
          role="dialog"
        >
          <button
            aria-label="Close"
            className="gm-lightbox__close"
            onClick={() => setOpenIndex(null)}
            type="button"
          >
            ✕
          </button>
          {photos.length > 1 ? (
            <>
              <button
                aria-label="Previous photo"
                className="gm-lightbox__nav gm-lightbox__nav--prev"
                onClick={() =>
                  setOpenIndex((current) =>
                    current === null ? current : (current - 1 + photos.length) % photos.length,
                  )
                }
                type="button"
              >
                ‹
              </button>
              <button
                aria-label="Next photo"
                className="gm-lightbox__nav gm-lightbox__nav--next"
                onClick={() =>
                  setOpenIndex((current) => (current === null ? current : (current + 1) % photos.length))
                }
                type="button"
              >
                ›
              </button>
            </>
          ) : null}
          <figure className="gm-lightbox__figure">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded gallery photo */}
            <img alt={active.caption || "Charity golf tournament merch"} src={active.url} />
            {active.caption ? <figcaption>{active.caption}</figcaption> : null}
          </figure>
        </div>
      ) : null}
    </>
  );
}
