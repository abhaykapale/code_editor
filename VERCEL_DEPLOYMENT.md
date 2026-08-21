# Deploy CODE_EDITOR to Vercel

## 1. Push the project to GitHub

Create a new repository and push this project. Do not commit `.env`; it is already ignored.

## 2. Import it in Vercel

1. In Vercel, select **Add New → Project**.
2. Import the GitHub repository.
3. Keep **Framework Preset: Next.js**, **Root Directory: `./`**, and **Build Command: `npm run build`**.
4. Use Node.js 20 or newer.

## 3. Add environment variables

In **Project Settings → Environment Variables**, add these for Production:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `OLLAMA_BASE_URL` (optional until AI chat is needed)
- `OLLAMA_MODEL` (optional; defaults to `gpt-oss:20b`)

Do not set `AUTH_URL` for a normal Auth.js v5 deployment on Vercel; Auth.js infers the host. Do not use `localhost` in any Production environment variable.

## 4. Prepare MongoDB Atlas

Use a MongoDB Atlas database for `DATABASE_URL`. In Atlas **Network Access**, allow connections from Vercel. For a first deployment, `0.0.0.0/0` is the practical serverless setting; protect the database with a strong database user/password and least-privilege access.

Run this once against the production database from your computer:

```bash
npx prisma db push
```

## 5. Deploy once, then connect the domain

Deploy and confirm the generated `*.vercel.app` URL opens. Then go to **Project Settings → Domains** and add:

- `abhaykapale.in`
- `www.abhaykapale.in`

Choose one as the primary domain and redirect the other to it.

If DNS remains at your current registrar, use the exact records Vercel shows. A common setup is:

- Apex `@`: `A` record to `76.76.21.21`
- `www`: `CNAME` record to `cname.vercel-dns.com`

Remove conflicting `A`, `AAAA`, or `CNAME` records for the same host. Do not change MX/TXT records used for email. Vercel will issue HTTPS automatically after DNS verification.

## 6. Update OAuth callbacks

Google Cloud Console:

- Authorized JavaScript origin: `https://abhaykapale.in`
- Authorized redirect URI: `https://abhaykapale.in/api/auth/callback/google`

GitHub OAuth App:

- Homepage URL: `https://abhaykapale.in`
- Authorization callback URL: `https://abhaykapale.in/api/auth/callback/github`

OAuth on changing Preview URLs is not enabled by default. Test production sign-in on the custom domain.

## 7. AI chat requirement

Vercel cannot call Ollama running on your laptop through `localhost`. Set `OLLAMA_BASE_URL` to a publicly reachable HTTPS Ollama-compatible server, or deploy without it and the API will return a clear `503` response until configured.

## Final checks

- Sign in with Google and GitHub.
- Create a playground for every template type.
- Run the WebContainer preview in Chrome/Edge over HTTPS.
- Save and reload a project to verify MongoDB persistence.
- Test AI chat only after setting a reachable `OLLAMA_BASE_URL`.
