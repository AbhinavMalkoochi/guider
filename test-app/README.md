# Test App

This app is the local integration surface for the `guider` package.

## What Talks To What

- The widget reads `NEXT_PUBLIC_PROXY_URL` for planning requests.
- The widget reads `NEXT_PUBLIC_WHISPER_URL` for transcription requests.
- If those are not set, the app derives both from `NEXT_PUBLIC_CONVEX_SITE_URL`.
- The local `test-app/convex` folder is not the Guider backend. It is generated Convex scaffolding and is not imported by the app UI.

## OpenAI Key

The OpenAI key must be set on the Convex deployment behind `NEXT_PUBLIC_CONVEX_SITE_URL` or `NEXT_PUBLIC_PROXY_URL`, not in the browser and not in this app's Next.js runtime.

## Development

Run the app with:

```bash
npm run dev
```

If you update the shared package, refresh the tarball dependency before testing here:

```bash
cd ../packages/guider
npm run build
npm pack
cd ../../test-app
npm install ../packages/guider/guider-0.1.0.tgz
```
