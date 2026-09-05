export type PreviewFile = { id: string; name: string; source: string }
export type PreviewCatalog = { files: PreviewFile[]; dir?: string }

export function catalogToFixtures(catalog: PreviewCatalog): Record<string, string> {
  return Object.fromEntries(catalog.files.map((file) => [file.id, file.source]))
}

export async function fetchPreviewCatalog(
  fetcher: typeof fetch = fetch,
): Promise<PreviewCatalog | null> {
  try {
    const res = await fetcher('/__titan_preview')
    if (!res.ok || res.status === 204) return null
    const data = (await res.json()) as PreviewCatalog
    if (!data?.files?.length) return null
    return data
  } catch {
    return null
  }
}
