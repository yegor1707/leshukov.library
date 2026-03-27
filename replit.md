# Leshukov Library

## Overview

Personal family library app — "Leshukov Library" (Библиотека Лешуковых). A beautiful dark-themed book collection app where the family can add books, notes, vocabulary, quotes and thoughts. Books are stored permanently in a PostgreSQL database.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite (artifacts/library)
- **UI**: Custom CSS (dark forest green theme, Playfair Display + Crimson Text fonts)
- **Build**: esbuild (API server), Vite (frontend)

## Features

- Add books with cover image upload + crop tool
- Book fields: title, author, language (ru/en/other), genre, year, star rating, synopsis, vocabulary list, quotes, personal thoughts
- Filter books by language (Все / Русские / English / Другие)
- Search by title and author
- View book details with tabs: Содержание / Словарь / Цитаты / Мысли / Сын
- "Сын" tab: son can add time-stamped notes per book
- Edit and delete books
- Toast notifications
- All data stored in PostgreSQL (permanent, not localStorage)

## Structure

```text
artifacts/
├── api-server/         # Express API server
│   └── src/routes/books.ts  # Books + notes CRUD
└── library/            # React + Vite frontend
lib/
├── api-spec/           # OpenAPI spec + Orval codegen
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas
└── db/src/schema/books.ts  # Drizzle schema (books + notes tables)
```

## API Routes

- `GET /api/books` — list books (filter by lang, search)
- `POST /api/books` — create book
- `GET /api/books/:id` — get book
- `PUT /api/books/:id` — update book
- `DELETE /api/books/:id` — delete book
- `GET /api/books/:id/notes` — list notes
- `POST /api/books/:id/notes` — add note

## Database Schema

- `books` table: id, title, author, lang, genre, year, rating, synopsis, quotes, thoughts, vocab (jsonb), cover (text/base64), created_at
- `notes` table: id, book_id (FK), text, created_at

## Access

Deploy the app to get a permanent public URL (*.replit.app) to share with family members. The site is publicly accessible to anyone with the link — no login required.
