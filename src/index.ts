import Plugin from '@jbrowse/core/Plugin'
import PluginManager from '@jbrowse/core/PluginManager'

import { version } from '../package.json'

export default class HubsViewerPlugin extends Plugin {
  name = 'HubsViewerPlugin'
  version = version

  install(pluginManager: PluginManager) {
    pluginManager.addToExtensionPoint(
      'Core-handleUnrecognizedAssembly',
      (_defaultResult, args) => {
        const session = args.session as any
        const assemblyName = args.assemblyName as string
        const jb2asm = `jb2hub-${assemblyName}`
        if (
          assemblyName &&
          !session.connections.find(
            (f: { connectionId: string }) => f.connectionId === jb2asm,
          )
        ) {
          console.log('getUnrecognizedAssembly', { assemblyName })
          const conf = {
            type: 'JB2TrackHubConnection',
            uri: `https://jbrowse.org/ucsc/${assemblyName}/config.json`,
            name: `conn_${assemblyName}`,
            assemblyNames: [assemblyName],
            connectionId: jb2asm,
          }
          session.addConnectionConf(conf)
          session.makeConnection(conf)
        }
      },
    )
  }

  configure(pluginManager: PluginManager) {}
}
