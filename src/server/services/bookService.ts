import { bookRepository } from "../repositories/bookRepository";
import { AuthenticatedUser } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/http/errors";

export const bookService = {
  async getBooks(user: AuthenticatedUser, filterAuthorId?: string) {
    if (user.role === "AUTHOR") {
      // Authors only ever see their own books
      return bookRepository.findMany({ authorId: user.userId });
    }

    // Admins can see all books or filter by author
    return bookRepository.findMany(filterAuthorId ? { authorId: filterAuthorId } : undefined);
  },

  async getBookById(id: string, user: AuthenticatedUser) {
    const book = await bookRepository.findById(id);

    if (!book) {
      throw new NotFoundError("Book not found");
    }

    // Defence in depth: return 404 (not 403) to prevent leaking existence
    if (user.role === "AUTHOR" && book.authorId !== user.userId) {
      throw new NotFoundError("Book not found");
    }

    return book;
  },
};
