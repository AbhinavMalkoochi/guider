# Guider SaaS Backend

Convex backend for Guider route planning, audio transcription, and install statistics.

## Requirements

- Node.js 18+
- A configured Convex project
- `OPENAI_API_KEY` configured in Convex environment variables
- Optional: `GUIDER_MODEL` to override the default planning model

## Scripts

- `npm run dev` runs `convex dev`
- `npm run codegen` regenerates Convex types
- `npm run deploy` deploys the backend with Convex

## Notes

- Planning and transcription endpoints are exposed through `convex/http.ts`
- The backend expects the frontend to host `/guider.map.json`
- Set CORS deliberately before production if you need to restrict origins
- This folder is only active after you link it to a Convex deployment with `npx convex dev`
- In this repo, `test-app/.env.local` currently points the widget at a Convex site URL directly, so setting `OPENAI_API_KEY` on some other deployment will not affect the widget
