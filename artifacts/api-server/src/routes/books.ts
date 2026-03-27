import { Router, type IRouter } from "express";
import { db, booksTable, notesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

function gid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

const vocabEntrySchema = z.object({ word: z.string(), meaning: z.string() });

const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  lang: z.string().default("ru"),
  genre: z.string().default(""),
  year: z.number().int().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  synopsis: z.string().nullable().optional(),
  quotes: z.string().nullable().optional(),
  thoughts: z.string().nullable().optional(),
  vocab: z.array(vocabEntrySchema).default([]),
  cover: z.string().nullable().optional(),
  coverLandscape: z.string().nullable().optional(),
});

function formatBook(b: any) {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    lang: b.lang,
    genre: b.genre,
    year: b.year ?? null,
    rating: b.rating ?? null,
    synopsis: b.synopsis ?? null,
    quotes: b.quotes ?? null,
    thoughts: b.thoughts ?? null,
    vocab: b.vocab ?? [],
    cover: b.cover ?? null,
    coverLandscape: b.coverLandscape ?? null,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const { lang, search } = req.query as { lang?: string; search?: string };
    let books = await db.select().from(booksTable).orderBy(booksTable.createdAt);
    if (lang && lang !== "all") {
      books = books.filter((b) => b.lang === lang);
    }
    if (search) {
      const q = search.toLowerCase();
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author || "").toLowerCase().includes(q)
      );
    }
    res.json(books.map(formatBook));
  } catch (err) {
    req.log.error({ err }, "Failed to list books");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = createBookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error });
      return;
    }
    const data = parsed.data;
    const id = gid();
    const [book] = await db
      .insert(booksTable)
      .values({
        id,
        title: data.title,
        author: data.author,
        lang: data.lang,
        genre: data.genre,
        year: data.year ?? null,
        rating: data.rating ?? null,
        synopsis: data.synopsis ?? null,
        quotes: data.quotes ?? null,
        thoughts: data.thoughts ?? null,
        vocab: data.vocab,
        cover: data.cover ?? null,
        coverLandscape: data.coverLandscape ?? null,
      })
      .returning();
    res.status(201).json(formatBook(book));
  } catch (err) {
    req.log.error({ err }, "Failed to create book");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [book] = await db
      .select()
      .from(booksTable)
      .where(eq(booksTable.id, req.params.id));
    if (!book) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatBook(book));
  } catch (err) {
    req.log.error({ err }, "Failed to get book");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const parsed = createBookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const data = parsed.data;
    const [book] = await db
      .update(booksTable)
      .set({
        title: data.title,
        author: data.author,
        lang: data.lang,
        genre: data.genre,
        year: data.year ?? null,
        rating: data.rating ?? null,
        synopsis: data.synopsis ?? null,
        quotes: data.quotes ?? null,
        thoughts: data.thoughts ?? null,
        vocab: data.vocab,
        cover: data.cover ?? null,
        coverLandscape: data.coverLandscape ?? null,
      })
      .where(eq(booksTable.id, req.params.id))
      .returning();
    if (!book) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatBook(book));
  } catch (err) {
    req.log.error({ err }, "Failed to update book");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(booksTable).where(eq(booksTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete book");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/notes", async (req, res) => {
  try {
    const notes = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.bookId, req.params.id))
      .orderBy(notesTable.createdAt);
    res.json(
      notes.map((n) => ({
        id: n.id,
        bookId: n.bookId,
        text: n.text,
        createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/notes", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text required" });
      return;
    }
    const [note] = await db
      .insert(notesTable)
      .values({
        id: gid(),
        bookId: req.params.id,
        text,
      })
      .returning();
    res.status(201).json({
      id: note.id,
      bookId: note.bookId,
      text: note.text,
      createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add note");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
