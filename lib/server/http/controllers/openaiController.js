import llm from '../../../chat/llm/index.js'
import { makeStandardResponse } from '../utils/responseFormatter.js'

// OpenAI预设和工具路由
export function getOpenAIResources(req, res) {
  const presetsType = req.query.type
  const type = req.params.type

  if (type == 'presets') {
    const { common, recommended, hidden } = llm.getAllPresets()
    const limit = req.query.limit ? parseInt(req.query.limit) : 20
    const start = req.query.start ? parseInt(req.query.start) : 0
    const search = req.query.keyword || ''

    if (!search) {
      const list = presetsType == 'system' ? common : recommended
      res
        .status(200)
        .json(makeStandardResponse(list.slice(start, start + limit)))
    } else {
      const result = [...common, ...recommended, ...hidden].filter((item) =>
        item.name.includes(search),
      )
      res.status(200).json(makeStandardResponse(result))
    }
  } else if (type == 'tools') {
    // 这里假设 middleware.apps 存在
    res.status(200).json(
      makeStandardResponse({
        tools: llm.serveToolsList(),
      }),
    )
  }
}
