import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'

import { fetchAssemblyHub, fetchingAssemblies } from './fetchAssemblyHub.ts'
import type { HubSession } from './fetchAssemblyHub.ts'

function createMockSession(): {
  session: HubSession
  calls: {
    addSessionAssembly: unknown[]
    addTrackConf: unknown[]
    notifyError: unknown[]
  }
} {
  const calls = {
    addSessionAssembly: [] as unknown[],
    addTrackConf: [] as unknown[],
    notifyError: [] as unknown[],
  }
  return {
    session: {
      assemblyManager: {
        get: (_name: string) => undefined as unknown,
      },
      addSessionAssembly: (assembly: unknown) => {
        calls.addSessionAssembly.push(assembly)
      },
      addTrackConf: (track: unknown) => {
        calls.addTrackConf.push(track)
      },
      notifyError: (msg: string, e: unknown) => {
        calls.notifyError.push({ msg, e })
      },
    },
    calls,
  }
}

function mockFetch(config: unknown, ok = true, status = 200) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => ({
    ok,
    status,
    json: async () => config,
  })) as typeof fetch
  return () => {
    globalThis.fetch = originalFetch
  }
}

describe('fetchAssemblyHub', () => {
  beforeEach(() => {
    fetchingAssemblies.clear()
  })

  it('adds assemblies from fetched config', async () => {
    const { session, calls } = createMockSession()
    const mockConfig = {
      assemblies: [{ name: 'hg38', sequence: {} }],
      tracks: [],
    }
    const restore = mockFetch(mockConfig)

    fetchingAssemblies.add('hg38')
    await fetchAssemblyHub(session, 'hg38')
    restore()

    assert.strictEqual(calls.addSessionAssembly.length, 1)
    assert.deepStrictEqual(calls.addSessionAssembly[0], {
      name: 'hg38',
      sequence: {},
    })
    assert.strictEqual(fetchingAssemblies.has('hg38'), false)
  })

  it('adds tracks from fetched config', async () => {
    const { session, calls } = createMockSession()
    const mockConfig = {
      assemblies: [],
      tracks: [{ trackId: 'genes', type: 'FeatureTrack' }],
    }
    const restore = mockFetch(mockConfig)

    fetchingAssemblies.add('hg38')
    await fetchAssemblyHub(session, 'hg38')
    restore()

    assert.strictEqual(calls.addTrackConf.length, 1)
    assert.deepStrictEqual(calls.addTrackConf[0], {
      trackId: 'genes',
      type: 'FeatureTrack',
    })
  })

  it('skips assembly if already exists', async () => {
    const { session, calls } = createMockSession()
    session.assemblyManager.get = () => ({ name: 'hg38' })
    const mockConfig = {
      assemblies: [{ name: 'hg38', sequence: {} }],
      tracks: [],
    }
    const restore = mockFetch(mockConfig)

    fetchingAssemblies.add('hg38')
    await fetchAssemblyHub(session, 'hg38')
    restore()

    assert.strictEqual(calls.addSessionAssembly.length, 0)
  })

  it('handles fetch error gracefully', async () => {
    const { session, calls } = createMockSession()
    const restore = mockFetch({}, false, 404)

    fetchingAssemblies.add('nonexistent')
    await fetchAssemblyHub(session, 'nonexistent')
    restore()

    assert.strictEqual(calls.notifyError.length, 1)
    assert.strictEqual(fetchingAssemblies.has('nonexistent'), false)
  })

  it('handles network error gracefully', async () => {
    const { session, calls } = createMockSession()
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('Network error')
    }) as typeof fetch

    fetchingAssemblies.add('hg38')
    await fetchAssemblyHub(session, 'hg38')
    globalThis.fetch = originalFetch

    assert.strictEqual(calls.notifyError.length, 1)
    assert.strictEqual(fetchingAssemblies.has('hg38'), false)
  })

  it('cleans up fetchingAssemblies on success', async () => {
    const { session } = createMockSession()
    const mockConfig = { assemblies: [], tracks: [] }
    const restore = mockFetch(mockConfig)

    fetchingAssemblies.add('hg38')
    assert.strictEqual(fetchingAssemblies.has('hg38'), true)

    await fetchAssemblyHub(session, 'hg38')
    restore()

    assert.strictEqual(fetchingAssemblies.has('hg38'), false)
  })
})

describe('extension point handler', () => {
  it('fetchingAssemblies prevents duplicate requests', () => {
    fetchingAssemblies.add('hg38')
    const shouldFetch = !fetchingAssemblies.has('hg38')
    assert.strictEqual(shouldFetch, false)
  })

  it('allows fetch for new assembly', () => {
    fetchingAssemblies.clear()
    const shouldFetch = !fetchingAssemblies.has('hg38')
    assert.strictEqual(shouldFetch, true)
  })
})
