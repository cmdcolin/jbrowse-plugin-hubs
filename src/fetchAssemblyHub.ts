// Track assemblies we're currently fetching to avoid duplicate requests
export const fetchingAssemblies = new Set<string>()

export interface HubSession {
  assemblyManager: { get: (name: string) => unknown }
  addSessionAssembly: (assembly: unknown) => void
  addTrackConf: (track: unknown) => void
  notifyError: (msg: string, e: unknown) => void
}

function getGenArkConfigUrl(accession: string) {
  const [base, rest] = accession.split('_')
  if (!rest) {
    return undefined
  }
  const match = rest.match(/.{1,3}/g)
  if (!match || match.length < 3) {
    return undefined
  }
  const [b1, b2, b3] = match
  return `https://jbrowse.org/hubs/genark/${base}/${b1}/${b2}/${b3}/${accession}/config.json`
}

function getConfigUrl(assemblyName: string) {
  // GenArk assemblies (GCA_* or GCF_*)
  if (assemblyName.startsWith('GCA_') || assemblyName.startsWith('GCF_')) {
    return getGenArkConfigUrl(assemblyName)
  } else {
    // UCSC assemblies (hg38, mm10, etc.)
    return `https://jbrowse.org/ucsc/${assemblyName}/config.json`
  }
}

export async function fetchAssemblyHub(
  session: HubSession,
  assemblyName: string,
) {
  const url = getConfigUrl(assemblyName)
  if (!url) {
    return
  }
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
