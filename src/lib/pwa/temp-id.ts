const TEMP_ID_PREFIX = 'tmp_'

export function newTempId(): string {
  return `${TEMP_ID_PREFIX}${crypto.randomUUID()}`
}

export function isTempId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(TEMP_ID_PREFIX)
}
