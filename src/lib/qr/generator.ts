import QRCode from "qrcode";

export function contenidoQr(qrUuid: string): string {
  return `ASIS:${qrUuid}`;
}

export async function generarQrPng(qrUuid: string, ancho = 220): Promise<Buffer> {
  return QRCode.toBuffer(contenidoQr(qrUuid), { margin: 0, width: ancho });
}
