"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";

export type ActionResult = { error?: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
}

type ParsedProduct = {
  title: string;
  description: string | null;
  price: string;
  stock: number;
  images: string[];
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
};

/** Valida el formulario y devuelve, o los datos limpios, o el motivo del rechazo. */
function parseProduct(
  formData: FormData,
): { data: ParsedProduct } | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "El titulo es obligatorio." };

  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) return { error: "Tenes que elegir una categoria." };

  /* El precio viaja como string y se guarda como string: convertirlo a
     float y volver a Decimal introduce errores de redondeo en centavos. */
  const rawPrice = String(formData.get("price") ?? "").replace(",", ".").trim();
  const price = Number(rawPrice);
  if (!rawPrice || Number.isNaN(price) || price < 0) {
    return { error: "El precio tiene que ser un numero mayor o igual a 0." };
  }
  if (price > 99_999_999) {
    return { error: "El precio supera el maximo permitido." };
  }

  const rawStock = String(formData.get("stock") ?? "0").trim();
  const stock = Number(rawStock);
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: "El stock tiene que ser un numero entero mayor o igual a 0." };
  }

  const description = String(formData.get("description") ?? "").trim();

  /* Las fotos viajan como un campo repetido: la primera es la portada. */
  const images = formData
    .getAll("images")
    .map((valor) => String(valor).trim())
    .filter(Boolean);

  return {
    data: {
      title,
      description: description || null,
      price: rawPrice,
      stock,
      images,
      categoryId,
      /* Un checkbox que no se tilda no viaja en el FormData: la ausencia es
         el "false". Por eso se compara contra "on" y no se lee un booleano. */
      isActive: formData.get("isActive") === "on",
      isFeatured: formData.get("isFeatured") === "on",
    },
  };
}

function revalidateProducts() {
  revalidatePath("/admin/productos");
  revalidatePath("/admin/categorias");
  revalidatePath("/admin");
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseProduct(formData);
  if ("error" in parsed) return { error: parsed.error };

  /* Regla que traia el formulario de alta: un producto nuevo entra con foto.
     No se aplica al editar porque los productos ya cargados no tienen. */
  if (parsed.data.images.length === 0) {
    return { error: "Subi al menos una foto del producto antes de guardarlo." };
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) return { error: "La categoria elegida ya no existe." };

  await prisma.product.create({
    data: {
      ...parsed.data,
      /* Nace destacado o no destacado: si lo esta, se sella ahora. */
      featuredAt: parsed.data.isFeatured ? new Date() : null,
    },
  });

  revalidateProducts();
  return {};
}

export async function updateProduct(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseProduct(formData);
  if ("error" in parsed) return { error: parsed.error };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "El producto ya no existe." };

  /* El sello solo se pone cuando el producto pasa a destacado, y se conserva
     mientras siga tildado: si se re-sellara en cada guardado, corregirle una
     falta de ortografia a un destacado viejo lo saltearia al frente de la
     grilla sin que nadie lo haya vuelto a elegir. Destildarlo lo borra. */
  const featuredAt = parsed.data.isFeatured
    ? (existing.featuredAt ?? new Date())
    : null;

  await prisma.product.update({
    where: { id },
    data: { ...parsed.data, featuredAt },
  });

  revalidateProducts();
  return {};
}

/** Alta/baja logica: es el "borrado" seguro del catalogo. */
export async function toggleProductActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "El producto ya no existe." };

  await prisma.product.update({ where: { id }, data: { isActive } });

  revalidateProducts();
  return {};
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  /* Un producto vendido vive en OrderItem: borrarlo romperia el historial
     de pedidos. En ese caso solo se permite desactivarlo. */
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });

  if (!product) return { error: "El producto ya no existe." };

  if (product._count.orderItems > 0) {
    return {
      error: `No se puede eliminar: aparece en ${product._count.orderItems} pedido(s). Desactivalo para sacarlo de la tienda sin perder el historial.`,
    };
  }

  /* Los movimientos de stock si se van con el producto. */
  await prisma.$transaction([
    prisma.stockMovement.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ]);

  revalidateProducts();
  return {};
}
