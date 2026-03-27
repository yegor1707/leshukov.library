import { Router, type IRouter } from "express";
import { supabase } from "../supabase";
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
    coverLandscape: b.cover_landscape ?? null,
    createdAt: b.created_at ?? null,
  };
}

function formatNote(n: any) {
  return {
    id: n.id,
    bookId: n.book_id,
    text: n.text,
    createdAt: n.created_at ?? null,
  };
}

function formatThought(t: any) {
  return {
    id: t.id,
    bookId: t.book_id,
    text: t.text,
    createdAt: t.created_at ?? null,
  };
}

router.get("/", async (req, res) => {
  try {
    const { lang, search } = req.query as { lang?: string; search?: string };

    let query = supabase.from("books").select("*").order("created_at");
    const { data, error } = await query;

    if (error) throw error;

    let books = (data || []).map(formatBook);
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
    res.json(books);
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
    const { data: book, error } = await supabase
      .from("books")
      .insert({
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
        cover_landscape: data.coverLandscape ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(formatBook(book));
  } catch (err) {
    req.log.error({ err }, "Failed to create book");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { data: book, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !book) {
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

    const updatePayload: any = {
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
    };
    if (data.coverLandscape !== undefined) {
      updatePayload.cover_landscape = data.coverLandscape;
    }

    const { data: book, error } = await supabase
      .from("books")
      .update(updatePayload)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error || !book) {
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
    const { error } = await supabase
      .from("books")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete book");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/notes", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("book_id", req.params.id)
      .order("created_at");
    if (error) throw error;
    res.json((data || []).map(formatNote));
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
    const { data: note, error } = await supabase
      .from("notes")
      .insert({ id: gid(), book_id: req.params.id, text })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(formatNote(note));
  } catch (err) {
    req.log.error({ err }, "Failed to add note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/notes/:noteId", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text required" });
      return;
    }
    const { data: note, error } = await supabase
      .from("notes")
      .update({ text })
      .eq("id", req.params.noteId)
      .select()
      .single();
    if (error) throw error;
    res.json(formatNote(note));
  } catch (err) {
    req.log.error({ err }, "Failed to update note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/notes/:noteId", async (req, res) => {
  try {
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", req.params.noteId);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/thoughts", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("thought_items")
      .select("*")
      .eq("book_id", req.params.id)
      .order("created_at");
    if (error) throw error;
    res.json((data || []).map(formatThought));
  } catch (err) {
    req.log.error({ err }, "Failed to list thoughts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/thoughts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text required" });
      return;
    }
    const { data: item, error } = await supabase
      .from("thought_items")
      .insert({ id: gid(), book_id: req.params.id, text })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(formatThought(item));
  } catch (err) {
    req.log.error({ err }, "Failed to add thought");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/thoughts/:thoughtId", async (req, res) => {
  try {
    const { error } = await supabase
      .from("thought_items")
      .delete()
      .eq("id", req.params.thoughtId);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete thought");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
