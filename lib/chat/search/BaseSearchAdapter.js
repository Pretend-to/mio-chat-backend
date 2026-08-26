/**
 * BaseSearchAdapter - 网页搜索适配器抽象基类
 */
export default class BaseSearchAdapter {
  constructor(config = {}) {
    this.config = config
    this.name = 'base-search'
  }

  /**
   * 核心方法：执行网页搜索
   * @param {Object} options
   * @param {string} options.query - 搜索关键词
   * @param {number} [options.count=5] - 返回结果数量
   * @param {string} [options.language='zh-CN'] - 语言首选项
   * @returns {Promise<Array<{ title: string, url: string, snippet: string, score?: number }>>}
   */
  async search(options) {
    throw new Error('Subclass must implement search() method')
  }

  static getAdapterMetadata() {
    return {
      type: 'base-search',
      name: 'Base Search Adapter',
      description: '抽象基类',
      configSchema: {}
    }
  }
}
