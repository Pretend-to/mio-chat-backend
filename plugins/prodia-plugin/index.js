const pluginInfo = {
  name: new URL(import.meta.url).pathname.split('/').pop(),
  description: '帮AI调用Prodia的插件',
  version: '0.0.1',
  author: 'Krumio',
}

const initPlugin = async () => {
  // 必要时在这里添加代码以初始化插件
}

export  {
  pluginInfo,
  initPlugin
}

