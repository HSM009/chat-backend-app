import bcrypt from "bcrypt";

import { prisma } from "../../config/prisma.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";
import { FastifyInstance } from "fastify";

export async function registerUser(data: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      phone: data.phone,
    },
  });

  if (existingUser) {
    throw new Error("Phone number already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      phone: data.phone,
      password: hashedPassword,
    },
  });

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}

export async function loginUser(app: FastifyInstance, data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      phone: data.phone,
    },
  });

  if (!user) {
    throw new Error("Invalid phone or password.");
  }

  const validPassword = await bcrypt.compare(data.password, user.password);

  if (!validPassword) {
    throw new Error("Invalid phone or password.");
  }

  const token = await app.jwt.sign({
    sub: user.id,
    phone: user.phone,
  });

  return {
    accessToken: token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
    },
  };
}
