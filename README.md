# Haras del Este

E-commerce de **Haras del Este**: catálogo con control de stock, pagos online y facturación adaptada a AFIP.

🌐 [www.harasdeleste.com.ar](https://www.harasdeleste.com.ar)

# Stack

- Next.js
- Node.js 24.x
- PostgreSQL + Prisma
- Nodemailer
- Vercel

# Características

- **Catálogo:** productos individuales y combos, con búsqueda y categorías.
- **Stock:** cada ingreso y salida queda registrado en `StockMovement`; se descuenta o repone solo ante ventas, devoluciones y contracargos.
- **Pagos:**
  - Mercado Pago, con webhooks verificados por firma HMAC.
  - Transferencia bancaria, con email automático de datos y aprobación manual desde el panel.
- **Checkout AFIP:** pide DNI, CUIT/CUIL, nombre, domicilio y tipo de contribuyente.
- **Seguridad:** rate limiting por IP y email, validación de inputs, headers de seguridad y sesiones de admin con vencimiento.
- **Panel de administración:** gestión de productos y pedidos. Los admins se crean por terminal, sin registro público.

# Instalación

```bash
git clone https://github.com/FrancoHerreraIT/haras-tienda.git
cd haras-tienda
npm install
cp .env.example .env   # completar variables
npx prisma migrate dev
npm run dev
```

La app queda en http://localhost:3000.

# Variables de entorno

Principales (ver `.env.example` para la lista completa):

- `DATABASE_URL`: conexión a PostgreSQL
- `MP_WEBHOOK_SECRET`: firma de webhooks de Mercado Pago

# Administración

Crear un usuario admin:

```bash
npm run admin:create -- "email@dominio.com" "Contraseña" "Nombre"
```

# Migraciones y deploy

```bash
npx prisma migrate dev --name cambio   # crear y probar en local
npx prisma migrate deploy              # aplicar en producción
```

El deploy se hace en Vercel con cada push a la rama principal.