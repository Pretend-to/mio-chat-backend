import { EventEmitter } from 'events'
export default class pluginLoader extends EventEmitter{
  constructor(){
    super()
    this.plugins = []
  }
  loadPlugins(plugins){
    plugins.forEach(plugin => {
      this.loadPlugin(plugin)
    })
  }

}