import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import Sidebar from "@/components/admin/Sidebar";

export const metadata: Metadata = {
  title: "Backoffice | Haras del Este",
  robots: { index: false, follow: false },
};

/* La sesion se lee en cada request: nada de /admin se prerenderiza. */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  /* Guardia del backoffice: sin sesion ADMIN no se sirve ni el HTML. */
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Sidebar
        userName={session.user.name ?? "Administrador"}
        userEmail={session.user.email ?? ""}
      />

      <div className="md:pl-64">
        <main className="px-4 py-6 sm:px-5 sm:py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
