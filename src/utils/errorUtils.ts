/**
 * Extracts a readable error message from an unknown error value.
 */
export function getErrorMessage(error: unknown, fallback = 'Erro inesperado'): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  ) {
    return (error as Record<string, unknown>).message as string
  }
  return fallback
}
