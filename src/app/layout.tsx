import type { Metadata, Viewport } from "next";
import { Great_Vibes, Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { getAppBaseUrl } from "@/app/lib/mercadopago";

/* Firma de estancia: cursiva clásica para el logo */
const greatVibes = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/* Serif elegante para titulares */
const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

/* Sans humanista para el cuerpo */
const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  /* Base contra la que Next resuelve las URLs relativas de openGraph,
     canonical, etc. Sale de la misma funcion que las back_urls de Mercado
     Pago, asi el dominio se configura en un solo lugar (APP_BASE_URL). */
  metadataBase: new URL(getAppBaseUrl()),
  title: "Haras del Este | Campo, Cocina y Hogar",
  description:
    "Tienda online de Haras del Este: tablas de asado, cuchillería artesanal y artículos de campo. Retirás tu pedido en cualquiera de nuestras dos sucursales.",

  /* Sale como <meta name="format-detection" content="telephone=no, ...">.
     Safari en iOS detecta solo los numeros que parecen telefono y los
     convierte en un link tel: azul y subrayado, con su propia tipografia: en
     /contacto pisaba el numero de WhatsApp y abria el telefono en vez del
     chat, que es el canal real. Va en el layout raiz y no en la page porque
     el mismo numero aparece en los mails y en el panel de transferencia, y
     ademas iOS tambien marca direcciones (las sucursales del retiro).
     Las pages de abajo no lo declaran, asi que heredan este. */
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

/* viewportFit: cover deja que el contenido use el area del notch; el padding
   seguro lo ponen las clases pb-safe / pt-safe de globals.css. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1C1A19",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${sourceSans.variable} ${playfair.variable} ${greatVibes.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F5F0] text-stone-800">
        {children}
      </body>
    </html>
  );
}
