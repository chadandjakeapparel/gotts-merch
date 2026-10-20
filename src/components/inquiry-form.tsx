"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const productOptions = [
  "Apparel (polos, aprons, chef coats, rain jackets)",
  "Menus, print & tabletop (menu jackets, coasters, napkins, matchboxes, stickers)",
  "Drinkware & to-go (cups, sleeves, stirrers, to-go bags)",
  "Pens & retail merchandise",
  "Not sure yet",
];

export function InquiryForm({ inquiryEmail }: { inquiryEmail: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [mailto, setMailto] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const products = formData
      .getAll("products")
      .filter((value): value is string => typeof value === "string")
      .join(", ");
    const payload: Record<string, string> = {
      ...(Object.fromEntries(formData.entries()) as Record<string, string>),
      products,
    };
    delete payload.attachment;

    if (payload.website) {
      setStatus("success");
      return;
    }

    const attachment = formData.get("attachment");
    if (attachment instanceof File && attachment.size > 0) {
      try {
        const uploadData = new FormData();
        uploadData.append("file", attachment);
        const uploadResponse = await fetch("/api/attachments", {
          method: "POST",
          body: uploadData,
        });
        const uploadResult = (await uploadResponse.json()) as {
          ok?: boolean;
          url?: string;
          error?: string;
        };
        if (!uploadResponse.ok || !uploadResult.ok || !uploadResult.url) {
          throw new Error(uploadResult.error || "Could not upload the attachment");
        }
        payload.attachmentUrl = uploadResult.url;
        payload.attachmentName = attachment.name;
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Could not upload the attachment",
        );
        return;
      }
    }

    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        mailto?: string;
      };
      if (!response.ok || !result.ok || !result.mailto) {
        throw new Error("Submission failed");
      }
      setMailto(result.mailto);
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div aria-live="polite" className="gm-form-success">
        <span>✓</span>
        <h3>Your request is ready to send.</h3>
        <p>
          Your email app will open with the quote request filled in. Review
          it, add anything else we should know, and hit send.
        </p>
        {mailto ? (
          <a className="gm-btn gm-btn--primary" href={mailto}>
            Open prepared email
          </a>
        ) : null}
        <button
          className="gm-form-restart"
          onClick={() => {
            setStatus("idle");
            setMailto("");
          }}
          type="button"
        >
          Start a new request
        </button>
      </div>
    );
  }

  return (
    <form className="gm-form" onSubmit={submit}>
      <div className="gm-form__row">
        <label>
          <span>Your name</span>
          <input autoComplete="name" name="name" required type="text" />
        </label>
        <label>
          <span>Venue / company</span>
          <input autoComplete="organization" name="venue" type="text" />
        </label>
      </div>
      <div className="gm-form__row">
        <label>
          <span>Email</span>
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label>
          <span>Phone (optional)</span>
          <input autoComplete="tel" name="phone" type="tel" />
        </label>
      </div>
      <div className="gm-form__row">
        <label>
          <span>Venue type</span>
          <select defaultValue="" name="venueType">
            <option disabled value="">
              Select one
            </option>
            <option>Restaurant</option>
            <option>Bar / nightlife</option>
            <option>Hotel / resort</option>
            <option>Café / coffee shop</option>
            <option>Catering</option>
            <option>Country club / private club</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          <span>Estimated quantity</span>
          <select defaultValue="" name="quantity">
            <option disabled value="">
              Select one
            </option>
            <option>Under 50</option>
            <option>50–200</option>
            <option>200–500</option>
            <option>500+</option>
          </select>
        </label>
      </div>
      <fieldset className="gm-form__fieldset">
        <legend>What are you looking for?</legend>
        {productOptions.map((option) => (
          <label className="gm-form__checkbox" key={option}>
            <input name="products" type="checkbox" value={option} />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      <label>
        <span>Tell us about the project</span>
        <textarea
          name="message"
          placeholder="Venue name, timeline, logo files you have on hand, anything else that helps us quote it right."
          required
          rows={5}
        />
      </label>
      <label>
        <span>Attach a file (optional — logo art, reference image, or PDF, max 8MB)</span>
        <input
          accept="image/jpeg,image/png,image/webp,application/pdf"
          name="attachment"
          type="file"
        />
      </label>
      <label aria-hidden="true" className="gm-honeypot">
        Website
        <input autoComplete="off" name="website" tabIndex={-1} type="text" />
      </label>
      <button
        className="gm-btn gm-btn--primary gm-form__submit"
        disabled={status === "submitting"}
        type="submit"
      >
        {status === "submitting" ? "Preparing…" : "Request a quote"}
      </button>
      {status === "error" ? (
        <p aria-live="polite" className="gm-form-error">
          {errorMessage || "We could not prepare the message."} Email{" "}
          <a href={`mailto:${inquiryEmail}`}>{inquiryEmail}</a>{" "}
          directly.
        </p>
      ) : null}
    </form>
  );
}
