/**
 * Carga datos de muestra para ver el panel con contenido real.
 *
 *   node prisma/seed-demo.mjs          -> crea categorias, productos y pedidos
 *   node prisma/seed-demo.mjs --limpiar -> borra SOLO lo que creo este script
 *
 * Todo lo demo se marca con el dominio @demo.local en el email del cliente,
 * asi el borrado nunca toca un pedido real.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_DOMAIN = "@demo.local";

const categories = [
  { name: "Tablas de Asado", description: "Tablas de madera maciza para asado y picada." },
  { name: "Cuchilleria", description: "Cuchillos y accesorios de acero forjado." },
  { name: "Kits de Campo", description: "Sets completos para llevar al campo." },
  { name: "Mates y Bombillas", description: "Mates de algarrobo, calabaza y acero." },
];

const products = [
  { title: "Tabla de Asado Premium Nogal 40x30cm", category: "Tablas de Asado", price: "45000", stock: 12, description: "Nogal macizo con canaleta perimetral y terminacion al aceite de lino." },
  { title: "Tabla Redonda Eucalipto 35cm", category: "Tablas de Asado", price: "28500", stock: 7, description: "Ideal para picadas, con manija integrada." },
  { title: "Cuchillo Artesanal Acero al Carbono 20cm", category: "Cuchilleria", price: "62000", stock: 4, description: "Hoja forjada a mano, cabo de asta de ciervo." },
  { title: "Set de Cubiertos de Campo x6", category: "Kits de Campo", price: "35000", stock: 0, description: "Tenedor y cuchillo con estuche de cuero." },
  { title: "Mate de Algarrobo con Virola", category: "Mates y Bombillas", price: "18900", stock: 23, description: "Algarrobo curado, virola de alpaca grabada." },
  { title: "Bombilla de Alpaca Pico de Loro", category: "Mates y Bombillas", price: "9800", stock: 31, description: "Alpaca maciza, filtro desmontable." },
];

/** Pedidos de muestra: uno por cada estado posible. */
const orders = [
  {
    customerName: "Martina Sosa", phone: "+54 9 11 5544-2211", status: "pending",
    daysAgo: 1, mp: "demo-mp-pref-0001",
    items: [["Tabla de Asado Premium Nogal 40x30cm", 1], ["Bombilla de Alpaca Pico de Loro", 2]],
    logs: [["pending", "Pedido generado desde el checkout. Esperando pago."]],
  },
  {
    customerName: "Joaquin Rivas", phone: "+54 9 351 448-9021", status: "paid",
    daysAgo: 3, mp: "demo-mp-pref-0002",
    items: [["Cuchillo Artesanal Acero al Carbono 20cm", 1]],
    logs: [
      ["pending", "Pedido generado desde el checkout."],
      ["paid", "Pago acreditado por Mercado Pago."],
    ],
  },
  {
    customerName: "Lucia Fernandez", phone: "+54 9 261 733-1180", status: "ready_for_pickup",
    daysAgo: 6, mp: "demo-mp-pref-0003",
    items: [["Mate de Algarrobo con Virola", 2], ["Tabla Redonda Eucalipto 35cm", 1]],
    logs: [
      ["pending", "Pedido generado desde el checkout."],
      ["paid", "Pago acreditado por Mercado Pago."],
      ["ready_for_pickup", "Preparado en la sucursal, esperando al cliente."],
    ],
  },
  {
    customerName: "Ramiro Alcaraz", phone: "+54 9 341 620-7744", status: "delivered",
    daysAgo: 14, mp: "demo-mp-pref-0004",
    items: [["Set de Cubiertos de Campo x6", 1], ["Cuchillo Artesanal Acero al Carbono 20cm", 1]],
    logs: [
      ["pending", "Pedido generado desde el checkout."],
      ["paid", "Pago acreditado por Mercado Pago."],
      ["ready_for_pickup", "Preparado en la sucursal, esperando al cliente."],
      ["delivered", "Retirado en la sucursal por el cliente."],
    ],
  },
  {
    customerName: "Camila Duarte", phone: "+54 9 223 519-3366", status: "cancelled",
    daysAgo: 9, mp: "demo-mp-pref-0005",
    items: [["Tabla de Asado Premium Nogal 40x30cm", 2]],
    logs: [
      ["pending", "Pedido generado desde el checkout."],
      ["cancelled", "El cliente pidio la anulacion antes de pagar."],
    ],
  },
];

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function limpiar() {
  const demoOrders = await prisma.order.findMany({
    where: { customerEmail: { endsWith: DEMO_DOMAIN } },
    select: { id: true },
  });
  const ids = demoOrders.map((o) => o.id);

  if (ids.length === 0) {
    console.log("No hay pedidos demo para borrar.");
    return;
  }

  await prisma.$transaction([
    prisma.orderStatusLog.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.order.deleteMany({ where: { id: { in: ids } } }),
  ]);

  console.log(`Borrados ${ids.length} pedidos demo (productos y categorias se conservan).`);
}

async function sembrar() {
  // Categorias
  const categoryByName = new Map();
  for (const c of categories) {
    const saved = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    categoryByName.set(c.name, saved);
  }
  console.log(`Categorias listas: ${categoryByName.size}`);

  // Productos (title no es unico: se busca antes de crear)
  const productByTitle = new Map();
  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { title: p.title } });
    const saved =
      existing ??
      (await prisma.product.create({
        data: {
          title: p.title,
          description: p.description,
          price: p.price,
          stock: p.stock,
          isActive: true,
          categoryId: categoryByName.get(p.category).id,
        },
      }));
    productByTitle.set(p.title, saved);
  }
  console.log(`Productos listos: ${productByTitle.size}`);

  // Pedidos: se recrean siempre desde cero
  await limpiar();

  for (const o of orders) {
    const items = o.items.map(([title, quantity]) => {
      const product = productByTitle.get(title);
      return {
        productId: product.id,
        quantity,
        priceAtPurchase: product.price,
      };
    });

    const total = items.reduce(
      (acc, item) => acc + Number(item.priceAtPurchase) * item.quantity,
      0,
    );

    const createdAt = daysAgo(o.daysAgo);

    await prisma.order.create({
      data: {
        customerName: o.customerName,
        customerEmail: `${slug(o.customerName)}${DEMO_DOMAIN}`,
        customerPhone: o.phone,
        status: o.status,
        totalAmount: total.toFixed(2),
        mpPreferenceId: o.mp,
        createdAt,
        items: { create: items },
        statusLogs: {
          create: o.logs.map(([status, notes], index) => ({
            status,
            notes,
            /* Cada paso del historial unos minutos despues del anterior. */
            createdAt: new Date(createdAt.getTime() + index * 36e5),
          })),
        },
      },
    });
  }

  console.log(`Pedidos demo creados: ${orders.length}`);
}

if (process.argv.includes("--limpiar")) {
  await limpiar();
} else {
  await sembrar();
}

await prisma.$disconnect();
