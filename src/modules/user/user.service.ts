import { prisma } from "../../config/prisma.js";

export async function getUsers(currentUserId: string) {
  return prisma.user.findMany({
    where: {
      id: {
        not: currentUserId,
      },
    },

    select: {
      id: true,
      name: true,
      phone: true,
      isOnline: true,
    },

    orderBy: {
      name: "asc",
    },
  });
}
