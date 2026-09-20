/**
 * Como se contacta la tienda con el cliente y el cliente con la tienda.
 *
 * ⚠ El WhatsApp, el horario y el mail son los reales. EL INSTAGRAM SIGUE
 * SIENDO DE EJEMPLO: reemplazalo antes de publicar, hoy apunta a una cuenta
 * que puede no existir.
 *
 * Es el unico lugar donde viven: la pagina /contacto, el Footer, el panel de
 * transferencia y los mails de pedido leen de aca. Los datos bancarios van
 * aparte, en paymentConfig.ts.
 *
 * No hay secretos: se puede importar desde un Client Component.
 */

/** Numero de WhatsApp, solo digitos con pais y area (formato de wa.me). */
const WHATSAPP_NUMERO = "5493513713517";

/** Usuario de Instagram sin la arroba. */
const INSTAGRAM_USUARIO = "harasdeleste";

export const STORE_CONTACT = {
  /**
   * Casilla de atencion al cliente: consultas, comprobantes, reclamos.
   *
   * Es la misma cuenta desde la que salen los mails transaccionales
   * (SMTP_USER / MAIL_FROM en el entorno): el cliente responde al aviso que
   * le llego y la respuesta cae donde alguien la lee.
   */
  email: "harasdeleste.tienda@gmail.com",

  whatsapp: {
    numero: WHATSAPP_NUMERO,
    /** Como se escribe para que lo lea una persona. */
    display: "+54 9 351 371-3517",
    /** wa.me quiere el numero pelado, sin +, espacios ni guiones. */
    url: `https://wa.me/${WHATSAPP_NUMERO}`,
  },

  instagram: {
    usuario: INSTAGRAM_USUARIO,
    handle: `@${INSTAGRAM_USUARIO}`,
    url: `https://instagram.com/${INSTAGRAM_USUARIO}`,
  },

  /** Horario de atencion humana, para no prometer respuesta a las 3 AM. */
  horarioAtencion: "Lunes a sábados de 12 a 20 h",
} as const;
