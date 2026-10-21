# The Game Shelf

A responsive personal board-game collection with BoardGameGeek search, preview, editable import details, and duplicate protection.

## Run locally

1. Install Node.js 20.9+.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Next.js.
4. Search for a title, select a result, review/edit its details, then add it to your shelf.

Set `BGG_API_TOKEN` in `.env` to the API token issued by BoardGameGeek (see [BGG's XML API information](https://boardgamegeek.com/using_the_xml_api)); BGG currently rejects unauthenticated XML API requests. Replace the placeholder already in `.env` and restart the development server. The token is only sent by server routes and is never exposed to browser code. Collection data is stored in this browser's `localStorage` and persists across refreshes on the same browser/device.

## Included

- Authenticated BGG XML API2 search and game-detail proxy routes at `/api/bgg/search` and `/api/bgg/[id]`.
- Five-minute in-memory search cache and one-hour framework cache for detail responses.
- BGG field mapping for title, type, player count, play time, age, categories, mechanics, rating, weight, description, and images.
- Editable player counts, play time, and rating before import.
- Duplicate checks by BGG ID (plus case-insensitive title guard).
- Responsive collection dashboard, collection search/sort and grid/list views.
- Validation unit tests with `npm test`.

## Production notes

This implementation is a **single-user demo**, not a security boundary: there is no login or server-side authorization yet. The local collection uses browser `localStorage`, so it is not shared across devices. Before production, add real authentication and replace the browser store with a durable Neon Postgres repository (including a unique constraint on `bgg_id`). Keep the BGG proxy server-side to avoid browser CORS restrictions. BGG may respond with HTTP 202 while its API is processing; retry the request after a short delay if that happens.

The included `src/db/schema.ts` is the shared application data model; it is not a database migration. Add and apply migrations when connecting Postgres.
