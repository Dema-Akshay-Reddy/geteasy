# Deploy the GetEasy backend (forui branch) to Render — free tier

The backend runs as a free Render web service backed by a free Tiger Cloud
Postgres database. The frontend on Cloudflare is then pointed at the Render URL.

What runs where:

| Piece    | Where                 | Notes                                                   |
|----------|-----------------------|---------------------------------------------------------|
| Frontend | Cloudflare (Sites)    | static export, already deployed                         |
| Backend  | Render (free)         | FastAPI via `render.yaml` blueprint, slim requirements  |
| Database | Tiger Cloud (free)    | Postgres, 750 MB — survives restarts                    |
| Vectors  | Render `/tmp` disk    | ephemeral: re-upload documents after a restart/redeploy |
| AI       | Groq API key          | set in the Render dashboard, never in code              |

## 1. Create the Postgres database (Tiger Cloud, free)

1. Sign up at <https://console.cloud.tigerdata.com/signup> (no credit card).
2. Create a service in a region close to you (e.g. `us-east`).
3. Copy the **connection string** — it looks like
   `postgresql://tsdbadmin:<password>@<host>.tsdb.cloud.timescale.com:<port>/tsdb`.
   Keep it secret; you will paste it into the Render dashboard only.

## 2. Push this branch to GitHub

```bash
git push origin forui
```

Render deploys straight from the repository, so these files must be on GitHub.

## 3. Create the Render service

1. Sign up at <https://dashboard.render.com> (GitHub sign-in works).
2. **New + → Blueprint**, pick `kushal7xn/GetEasy-week3-4`, branch **forui**.
   Render reads `render.yaml` and creates `geteasy-api` automatically.
3. Fill in the variables it asks for:

   | Variable          | Value                                                      |
   |-------------------|------------------------------------------------------------|
   | `DATABASE_URL`    | Tiger Cloud connection string from step 1                  |
   | `GROQ_API_KEY`    | your key from <https://console.groq.com/keys>              |
   | `FRONTEND_ORIGIN` | your Cloudflare URL, e.g. `https://site-....freebuff.page` |

4. **Apply** — the first build takes ~5 minutes (chromadb + onnxruntime).

## 4. Verify

Open `https://geteasy-api-XXXX.onrender.com/health` — it should return
`{"status":"ok",...}`. Then send the URL back so the frontend can be rebuilt
with `NEXT_PUBLIC_API_URL` pointed at it.

## Notes on the free tier

- The service sleeps after ~15 min idle; the next request cold-starts in
  ~30–60 s (the frontend shows a spinner meanwhile — just retry).
- `requirements-render.txt` is `requirements.txt` without
  `sentence-transformers` (torch does not fit in 512 MB). The vector store
  automatically uses chromadb's built-in ONNX MiniLM embeddings instead —
  same 384-dim `all-MiniLM-L6-v2` model.
- Documents/vectors live on Render's ephemeral disk: after a restart or
  redeploy, re-upload study materials. Accounts, subjects and settings are
  safe in Postgres.
