// Track assemblies we're currently fetching to avoid duplicate requests
export const fetchingAssemblies = new Set<string>()

export interface HubSession {
  assemblyManager: { get: (name: string) => unknown }
  addSessionAssembly: (assembly: unknown) => void
  addTrackConf: (track: unknown) => void
  notifyError: (msg: string, e: unknown) => void
}

export async function fetchAssemblyHub(
  session: HubSession,
  assemblyName: string,
) {
  const url = `https://jbrowse.org/ucsc/${assemblyName}/config.json`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`)
    }
    const config = (await response.json()) as {
      assemblies?: { name: string }[]
      tracks?: unknown[]
    }

    // Add assemblies directly to session
    for (const assembly of config.assemblies ?? []) {
      if (!session.assemblyManager.get(assembly.name)) {
        session.addSessionAssembly(assembly)
      }
    }

    // Add tracks directly to session (addTrackConf handles duplicates)
    for (const track of config.tracks ?? []) {
      session.addTrackConf(track)
    }
  } catch (e) {
    console.error(e)
    session.notifyError(`Failed to load assembly ${assemblyName}: ${e}`, e)
  } finally {
    fetchingAssemblies.delete(assemblyName)
  }
}
