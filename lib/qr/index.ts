import { randomBytes } from "node:crypto";
import QRCode from "qrcode";

/**
 * Ticket tokens are the ONLY thing encoded in a QR code. 192 bits of CSPRNG
 * output: unguessable, carries no personal data, maps to exactly one registration.
 */
export function generateTicketToken(prefix: string): string {
  return `${prefix.toUpperCase()}-TKT-${randomBytes(24).toString("hex")}`;
}

export function formatRegistrationNumber(prefix: string, seq: number, year: number) {
  return `${prefix.toUpperCase()}-${year}-${String(seq).padStart(5, "0")}`;
}

/** PNG data URL of the QR code for a ticket token. */
export function qrDataUrl(token: string, width = 640): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 2,
    width,
    color: { dark: "#14201a", light: "#ffffff" },
  });
}
