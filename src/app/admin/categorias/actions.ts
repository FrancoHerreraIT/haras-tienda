"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";

export type ActionResult = { error?: string };

/* El layout ya protege las pantallas, pero las Server Actions son endpoints
   propios: se pueden invocar sin pasar por la UI, asi que revalidan sesion. */
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
}

function readName(formData: FormData) {
  return String(formData.get("name") ?? "").trim();
}

function readDescription(formData: FormData) {
  const value = String(formData.get("description") ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const name = readName(formData);
  if (!name) return { error: "El nombre es obligatorio." };

  const duplicate = await prisma.category.findUnique({ where: { name } });
  if (duplicate) return { error: `Ya existe una categoria llamada "${name}".` };

  await prisma.category.create({
    data: { name, description: readDescription(formData) },
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/admin");
  return {};
}

export async function updateCategory(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const name = readName(formData);
  if (!name) return { error: "El nombre es obligatorio." };

  const duplicate = await prisma.category.findUnique({ where: { name } });
  if (duplicate && duplicate.id !== id) {
    return { error: `Ya existe una categoria llamada "${name}".` };
  }

  await prisma.category.update({
    where: { id },
    data: { name, description: readDescription(formData) },
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/admin/productos");
  return {};
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin();

  /* Product.categoryId es obligatorio: si la categoria tiene productos, la
     FK de Postgres rechaza el borrado. Lo avisamos antes de intentarlo. */
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) return { error: "La categoria ya no existe." };

  if (category._count.products > 0) {
    return {
      error: `No se puede eliminar: tiene ${category._count.products} producto(s) asociado(s). Reasignalos o eliminalos primero.`,
    };
  }

  await prisma.category.delete({ where: { id } });

  revalidatePath("/admin/categorias");
  revalidatePath("/admin");
  return {};
}
