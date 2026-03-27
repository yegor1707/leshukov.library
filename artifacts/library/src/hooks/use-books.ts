import { useQueryClient } from "@tanstack/react-query";
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

  return {
    addNote: add.mutateAsync,
    isAddingNote: add.isPending
  };
}
