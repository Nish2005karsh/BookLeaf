import { prisma } from "@/lib/prisma";
import { Book } from "@prisma/client";

export const bookRepository = {
  async findById(id: string): Promise<Book | null> {
    return prisma.book.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  async findByExternalId(externalId: string): Promise<Book | null> {
    return prisma.book.findUnique({
      where: { externalId },
    });
  },

  async findMany(filter?: { authorId?: string }): Promise<Book[]> {
    return prisma.book.findMany({
      where: filter?.authorId ? { authorId: filter.authorId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },
};
