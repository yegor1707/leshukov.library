import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { 
  useListBooks, 
  useCreateBook, 
  useUpdateBook, 
  useDeleteBook, 
  useListNotes, 
  useAddNote,
  getListBooksQueryKey,
  getListNotesQueryKey
} from "@workspace/api-client-react";

type ThoughtItem = { id: string; bookId: string; text: string; createdAt: string };

export function useThoughts(bookId: string) {
  return useQuery<ThoughtItem[]>({
    queryKey: [`/api/books/${bookId}/thoughts`],
    queryFn: async () => {
      const res = await fetch(`/api/books/${bookId}/thoughts`);
      if (!res.ok) throw new Error("Failed to fetch thoughts");
      return res.json();
    },
  });
}

export function useThoughtMutations(bookId: string) {
  const queryClient = useQueryClient();
  const key = [`/api/books/${bookId}/thoughts`];

  const add = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/books/${bookId}/thoughts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to add thought");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (thoughtId: string) => {
      const res = await fetch(`/api/books/${bookId}/thoughts/${thoughtId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete thought");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    addThought: add.mutateAsync,
    isAdding: add.isPending,
    removeThought: remove.mutateAsync,
    isRemoving: remove.isPending,
  };
}

export function useBooksData(lang?: string, search?: string) {
  return useListBooks({ 
    lang: lang === 'all' ? undefined : lang, 
    search: search || undefined 
  });
}

export function useBookMutations() {
  const queryClient = useQueryClient();

  const invalidateBooks = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/books');
      }
    });
  };

  const create = useCreateBook({
    mutation: {
      onSuccess: invalidateBooks
    }
  });

  const update = useUpdateBook({
    mutation: {
      onSuccess: invalidateBooks
    }
  });

  const remove = useDeleteBook({
    mutation: {
      onSuccess: invalidateBooks
    }
  });

  return {
    createBook: create.mutateAsync,
    isCreating: create.isPending,
    updateBook: update.mutateAsync,
    isUpdating: update.isPending,
    deleteBook: remove.mutateAsync,
    isDeleting: remove.isPending,
  };
}

export function useBookNotes(bookId: string) {
  return useListNotes(bookId);
}

export function useBookNoteMutations(bookId: string) {
  const queryClient = useQueryClient();
  
  const add = useAddNote({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(bookId) });
      }
    }
  });

  const update = useMutation({
    mutationFn: async ({ noteId, text }: { noteId: string; text: string }) => {
      const res = await fetch(`/api/books/${bookId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(bookId) }),
  });

  const remove = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/books/${bookId}/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(bookId) }),
  });

  return {
    addNote: add.mutateAsync,
    isAddingNote: add.isPending,
    updateNote: update.mutateAsync,
    isUpdatingNote: update.isPending,
    deleteNote: remove.mutateAsync,
    isDeletingNote: remove.isPending,
  };
}
