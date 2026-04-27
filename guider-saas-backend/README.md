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
