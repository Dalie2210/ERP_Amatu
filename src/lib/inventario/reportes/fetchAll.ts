// Techo duro para no colgar el route si alguien pide todo el histórico sin filtros.
const MAX_ROWS = 200_000

export interface FetchAllResult<T> {
  rows: T[]
  truncated: boolean
}

/** Pagina una query de PostgREST en bloques de `pageSize` hasta agotarla. */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<FetchAllResult<T>> {
  const rows: T[] = []
  let from = 0
  let truncated = false

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await build(from, to)
    if (error) throw error

    const page = data ?? []
    rows.push(...page)

    if (page.length < pageSize) break

    from += pageSize
    if (rows.length >= MAX_ROWS) {
      truncated = true
      break
    }
  }

  return { rows, truncated }
}
