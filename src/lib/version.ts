// Versão injetada em build time pelo Vite (vite.config.ts → define)
declare const __APP_VERSION__: string
export const APP_VERSION: string = __APP_VERSION__

/**
 * Formata o ISO timestamp do build para DD/MM/YYYY
 * Exemplo: "2026-05-04T12:30:00.000Z" → "04/05/2026"
 */
export function formatBuildDate(iso: string): string {
  try {
    const date = iso.slice(0, 10) // "YYYY-MM-DD"
    const [y, m, d] = date.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return iso
  }
}
