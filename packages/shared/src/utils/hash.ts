// Empreinte SHA-256 en hexadécimal (navigateur et Node 20+ : Web Crypto).

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Identifiant du document orderTracking : sha256(numéro + '|' + téléphone). */
export function trackingId(orderNumber: string, phone: string): Promise<string> {
  return sha256Hex(`${orderNumber}|${phone}`);
}
