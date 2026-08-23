import Plugin from '../../plugin.js'

/**
 * anyUI 插件
 * 为 Agent 提供「定义 UI 模板 → 发送可交互 UI → 管理模板」的能力，
 * 通过 extraRender iframe 将 HTML 界面直接渲染到消息流（sandbox=allow-scripts，JS 可执行但隔离主页面）。
 *
 * 场景：角色扮演（状态面板/商店/对话窗/剧情选项）、数据可视化、交互面板等。
 * 模板按用户隔离存储：templates/<userId>/<name>.json（元数据）+ templates/<userId>/html/<name>.html（正文）。
 */
export default class AnyUIPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  getInitialConfig() {
    return {}
  }
}
