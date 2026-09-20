/**
 * Envio de mails transaccionales con nodemailer.
 *
 * Config por entorno (ver .env.example). Si el SMTP no esta configurado, el
 * mail **no se envia y no se rompe nada**: se escribe en consola y el flujo
 * sigue. Un pedido ya guardado en la base no se puede perder porque el
 * proveedor de correo este caido o porque en local no haya credenciales.
 *
 * El logo del encabezado lo adjunta esta capa, no el que arma el mail: los
 * tres avisos usan la plantilla de emailLayout.ts, que referencia
 * `cid:logo`. Si cada llamador tuviera que acordarse de mandar el adjunto,
 * el dia que alguien lo olvide el mail sale con el encabezado roto en la
 * bandeja del cliente, y eso no se ve en el codigo.
 */
import nodemailer, { type Transporter } from "nodemailer";

import { adjuntosDeLaPlantilla } from "@/app/lib/emailLayout";

interface MailPendiente {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Config leida del entorno, o null si falta lo indispensable. */
function leerConfigSmtp() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();

  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    /* 465 es SMTPS (TLS desde el saludo); 587 arranca en claro y sube con
       STARTTLS, que nodemailer hace solo con secure en false. */
    secure: (process.env.SMTP_SECURE ?? "").trim() === "true" || port === 465,
    auth: { user, pass },
  };
}

/* El transporter se cachea: abre un pool de conexiones y crear uno por mail
   es tirar el handshake TLS a la basura en cada pedido. En dev, el hot reload
   recrea el modulo, asi que vive en globalThis igual que el cliente Prisma. */
const globalForMail = globalThis as unknown as {
  mailTransporter: Transporter | null | undefined;
};

function getTransporter(): Transporter | null {
  if (globalForMail.mailTransporter !== undefined) {
    return globalForMail.mailTransporter;
  }

  const config = leerConfigSmtp();
  const transporter = config ? nodemailer.createTransport(config) : null;

  globalForMail.mailTransporter = transporter;
  return transporter;
}

/** Remitente visible. Cae al usuario SMTP si no se configuro uno aparte. */
function remitente(): string {
  const from = process.env.MAIL_FROM?.trim();
  if (from) return from;

  const user = process.env.SMTP_USER?.trim();
  return user ? `Haras del Este <${user}>` : "Haras del Este <no-reply@localhost>";
}

/**
 * Manda el mail. Nunca lanza: devuelve si salio o no.
 *
 * El que llama decide que hacer con eso; para el checkout, nada — el pedido
 * ya esta guardado y el aviso es secundario.
 */
export async function enviarMail(mail: MailPendiente): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) {
    /* Sin SMTP configurado: se deja rastro para poder verificar el flujo en
       local sin montar un servidor de correo. */
    console.info(
      "[mail] SMTP sin configurar, no se envio nada. Contenido del aviso:\n" +
        `  Para: ${mail.to}\n  Asunto: ${mail.subject}\n\n${mail.text}`,
    );
    return false;
  }

  if (!mail.to.trim()) {
    console.warn("[mail] el pedido no tiene email de contacto, no se envia");
    return false;
  }

  try {
    await transporter.sendMail({
      from: remitente(),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      /* El logo va embebido (cid:logo) y no como URL: los clientes de correo
         bloquean las imagenes remotas de un remitente desconocido, que es
         justo el caso del primer mail que recibe un comprador nuevo. Si el
         archivo no se pudo leer, la lista viene vacia y el mail sale igual. */
      attachments: await adjuntosDeLaPlantilla(),
    });
    return true;
  } catch (e) {
    console.error("[mail] no se pudo enviar", { to: mail.to, e });
    return false;
  }
}
