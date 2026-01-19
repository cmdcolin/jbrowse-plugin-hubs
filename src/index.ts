import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'

import { fetchAssemblyHub, fetchingAssemblies } from './fetchAssemblyHub.ts'
import { version } from '../package.json'

import type { HubSession } from './fetchAssemblyHub.ts'

export default class HubsViewerPlugin extends Plugin {
  name = 'HubsViewerPlugin'
  version = version

  install(pluginManager: PluginManager) {
    pluginManager.addToExtensionPoint(
      'Core-handleUnrecognizedAssembly',
      (_defaultResult, args) => {
        const session = args.session as HubSession | undefined
        const assemblyName = args.assemblyName as string | undefined

        // Skip if missing required args
        if (!session || !assemblyName) {
          return
        }

        // Skip if already fetching (must check this first to prevent recursion)
        if (fetchingAssemblies.has(assemblyName)) {
          return
        }

        // Mark as fetching before any other checks that might re-trigger this
        fetchingAssemblies.add(assemblyName)

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        fetchAssemblyHub(session, assemblyName)
      },
    )
  }

  configure(_pluginManager: PluginManager) {}
}

export {
  type HubSession,
  fetchAssemblyHub,
  fetchingAssemblies,
} from './fetchAssemblyHub.ts'
