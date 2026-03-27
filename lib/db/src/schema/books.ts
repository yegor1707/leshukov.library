import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const vocabEntrySchema = z.object({
  word: z.string(),
  meaning: z.string(),
});

export const booksTable = pgTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  lang: text("lang").notNull().default("ru"),
  genre: text("genre").notNull().default(""),
  year: integer("year"),
  rating: integer("rating"),
  synopsis: text("synopsis"),
  quotes: text("quotes"),
  thoughts: text("thoughts"),
  vocab: jsonb("vocab").notNull().default([]).$type<{ word: string; meaning: string }[]>(),
  cover: text("cover"),
  coverLandscape: text("cover_landscape"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notesTable = pgTable("notes", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => booksTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const thoughtItemsTable = pgTable("thought_items", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => booksTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookSchema = createInsertSchema(booksTable).omit({ createdAt: true });
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;
export type Note = typeof notesTable.$inferSelect;
