# Deployment

The package deliberately retains two services because the astrology engine uses native Swiss Ephemeris code, while the subscriber interface is a lightweight cache-first application.

## 1. Deploy the v37.9.14 engine

Deploy `astro-engine-v37.9.14/` to Vercel as a Node.js Next.js application.

Required:

- A Vercel project
- Node.js runtime compatible with the included native Swiss Ephemeris dependency

The current endpoint is already configured as the interface default:

```text
https://fin-lumen-pure-astro.vercel.app
```

## 2. Deploy the subscriber interface

The existing Site can continue to host `subscriber-interface/`.

Set this server-side variable only when the engine URL changes:

```text
FIN_LUMEN_ENGINE_ORIGIN=https://your-engine-deployment.example.com
```

The included D1 binding and migrations preserve the company-admission queue.

## Accounts needed

No new account is needed for:

- Historical Sky Replay
- Expanded-card Research View
- Browser watchlists
- Browser reading cache
- Using the already-deployed engine

A database account or binding is needed only if the shared company-admission queue is moved away from the present hosted Site.

## GitHub

This compact distribution contains 91 files, so it can be uploaded through GitHub's browser interface without exceeding the 100-file selection limit.

Do not commit:

- `.env`
- credentials or tokens
- `node_modules/`
- `.next/`
- `dist/`
- local database files
