# Gotts Merch

Landing page for Gotts Merch — promotional products for the hospitality
industry (restaurants, hotels, bars, cafés, catering, and clubs).

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Content and media

- Site copy and palette: `src/content/site-content.ts`
- Styles: `src/styles/site.css`
- Logo mark: `src/components/logo.tsx` (recreated from the brand reference —
  swap in a real exported SVG/PNG if one becomes available)

The quote-request form posts to `src/app/api/inquiry/route.ts`, which
validates the request and prepares a `mailto:` handoff. It does not store
submissions. Update `INQUIRY_EMAIL` in `src/content/site-content.ts` to a
real inbox before launch.

## Quality checks

```bash
npm run verify
```

## Deployment

Designed for Vercel. The whole site is a single static page.
