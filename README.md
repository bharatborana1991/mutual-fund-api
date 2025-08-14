# Mutual Fund API (Vercel + Next.js App Router)

This is a **minimal API-only Next.js project** that exposes:
```
POST /api/find-funds
```
It calls the **OpenAI Responses API** (with the hosted **web_search** tool) to research and return **specific mutual funds** as structured JSON with **citations**.

> Keep your `OPENAI_API_KEY` on the server—never on the client.


## Quick start
1. **Install deps**
   ```bash
   npm i
   ```
2. **Run dev**
   ```bash
   npm run dev
   # Open http://localhost:5173/api/find-funds  (GET returns { ok: true } for a quick check)
   ```
3. **Test POST**
   ```bash
   curl -X POST http://localhost:5173/api/find-funds \
     -H "Content-Type: application/json" \
     -d '{"country":"IN","category":"Large-Cap Index","plan":"Direct","max_expense_ratio":0.4,"min_aum_cr":1000,"index":"Nifty 50 TRI","max_candidates":5}'
   ```

## Deploy to Vercel
1. Push this folder to a GitHub repo (e.g., `mutual-fund-api`).
2. Import the repo at **vercel.com** → **Deploy**.
3. In **Settings → Environment Variables**, add:
   - `OPENAI_API_KEY=***`
   - (optional) `ALLOW_ORIGIN=https://<your-github-username>.github.io`
4. After deploy, your endpoint will be:
   ```
   https://<your-vercel-project>.vercel.app/api/find-funds
   ```

## Troubleshooting 404
- Ensure the file path is **exactly** `app/api/find-funds/route.ts`.
- Add `GET` handler (already included) and open the URL in a browser:
  - If you see `{ ok: true, route: "find-funds" }`, the route exists.
  - If you see a **404**, the route wasn’t deployed—check build logs and repo layout.
- Make sure the project uses **Next.js** (Vercel should detect "Next.js" framework) and build logs show the **app route**.

## CORS
The route returns permissive CORS by default (`*`). Set `ALLOW_ORIGIN` to your GitHub Pages origin for stricter security.

## Security & Compliance
- This is an **educational tool**, not financial advice.
- Mutual fund investments are subject to market risks. Consult a **SEBI‑registered** advisor.
