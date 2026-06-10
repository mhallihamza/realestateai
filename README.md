# Real Estate AI — Follow-Up Assistant

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env` and set your values:
- `OPENAI_API_KEY` — from https://platform.openai.com/api-keys
- `SMTP_*` — your email SMTP credentials (Gmail recommended)
- `NEXTAUTH_SECRET` — any random string (change in production)

### 3. Initialize the database
```bash
npm run db:push
```

### 4. Start the dev server
```bash
npm run dev
```

Open http://localhost:3000

---

## Features
- Landing page with pricing
- User auth (sign up / login)
- Lead CRM (add, edit, delete, CSV import)
- AI follow-up sequence generator (5 personalized messages)
- Hot lead detection & scoring
- Email scheduling & open tracking
- Settings (profile, writing tone, subscription)

## Stack
- Next.js 14 (App Router)
- TypeScript + Tailwind CSS
- Prisma + SQLite
- NextAuth.js
- OpenAI GPT-4o-mini
- Nodemailer
# Real Estate AI — Follow-Up Assistant

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env` and set your values:
- `OPENAI_API_KEY` — from https://platform.openai.com/api-keys
- `SMTP_*` — your email SMTP credentials (Gmail recommended)
- `NEXTAUTH_SECRET` — any random string (change in production)

### 3. Initialize the database
```bash
npm run db:push
```

### 4. Start the dev server
```bash
npm run dev
```

Open http://localhost:3000

---

## Features
- Landing page with pricing
- User auth (sign up / login)
- Lead CRM (add, edit, delete, CSV import)
- AI follow-up sequence generator (5 personalized messages)
- Hot lead detection & scoring
- Email scheduling & open tracking
- Settings (profile, writing tone, subscription)

## Stack
- Next.js 14 (App Router)
- TypeScript + Tailwind CSS
- Prisma + SQLite
- NextAuth.js
- OpenAI GPT-4o-mini
- Nodemailer
