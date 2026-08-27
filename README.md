# ALPINIA® Call Intelligence

Outil interne d'analyse IA de sessions de cold call — Alpinia Web Craft, Valais.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Vercel Blob · OpenAI (Whisper + GPT-4o-mini structured output).

## Setup

```bash
npm install
cp .env.example .env.local
```

Renseigner dans `.env.local` :

- `OPENAI_API_KEY` — obligatoire, jamais exposée côté client.
- `BLOB_READ_WRITE_TOKEN` — injectée automatiquement par Vercel si un store Blob est connecté au projet.
- `APP_PASSWORD` — optionnel, active un mot de passe d'accès simple (cookie httpOnly).

```bash
npm run dev
```

## Déploiement

Connecter le repo à Vercel, activer un store Vercel Blob sur le projet, ajouter `OPENAI_API_KEY` dans les variables d'environnement, puis déployer.
