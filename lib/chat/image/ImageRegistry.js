import OpenAIImageAdapter from './implementations/openai-image.js'
import GoogleImageAdapter from './implementations/google-image.js'
import SiliconFlowImageAdapter from './implementations/siliconflow-image.js'
import VolcEngineImageAdapter from './implementations/volcengine-image.js'
import SDWebUIAdapter from './implementations/sd-webui.js'
import TukuaiImageAdapter from './implementations/tukuai-image.js'

/**
 * ImageRegistry - 生图适配器注册中心
 */
export class ImageRegistry {
  static adapters = new Map()

  static register(type, adapterClass) {
    this.adapters.set(type, adapterClass)
  }

  static get(type) {
    return this.adapters.get(type)
  }

  static getAllMetadata() {
    const list = []
    for (const [type, cls] of this.adapters.entries()) {
      if (typeof cls.getAdapterMetadata === 'function') {
        list.push(cls.getAdapterMetadata())
      } else {
        list.push({ type, name: type })
      }
    }
    return list
  }
}

// 注册所有生图适配器
ImageRegistry.register('google-image', GoogleImageAdapter)
ImageRegistry.register('openai-image', OpenAIImageAdapter)
ImageRegistry.register('siliconflow-image', SiliconFlowImageAdapter)
ImageRegistry.register('volcengine-image', VolcEngineImageAdapter)
ImageRegistry.register('tukuai-image', TukuaiImageAdapter)
ImageRegistry.register('sd-webui', SDWebUIAdapter)
