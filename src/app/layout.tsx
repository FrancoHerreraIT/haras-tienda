import type { Metadata, Viewport } from "next";
import { Great_Vibes, Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";

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
  title: "Haras del Este | Campo, Cocina y Hogar",
  description:
    "Tienda online de Haras del Este: tablas de asado, cuchillería artesanal y artículos de campo. Retirás tu pedido en cualquiera de nuestras dos sucursales.",
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
