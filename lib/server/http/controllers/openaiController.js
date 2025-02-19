import config from '../../../config.js'
import { makeStandardResponse } from '../utils/responseFormatter.js'

// OpenAI预设和工具路由
export function getOpenAIResources(req, res) {
  const presetsType = req.query.type
  const type = req.params.type
  logger.info(`GET /api/openai/${type}?type=${presetsType}`)
  
  if (type == 'presets') {
    const presets = config.openai.presets
    const recommended = config.openai.recommendedPresets
    const hidden = config.openai.hiddenPresets
    const nums = req.query.nums ? parseInt(req.query.nums) : 9
    const start = req.query.start ? parseInt(req.query.start) : 0
    const search = req.query.keyword || ''
    
    if (!search) {
      const list = presetsType == 'system' ? presets : recommended
      res.status(200).json(makeStandardResponse(list.slice(start, start + nums)))
    } else {
      const result = [...presets, ...recommended, ...hidden].filter((item) =>
        item.name.includes(search)
      )
      res.status(200).json(makeStandardResponse(result))
    }
  } else if (type == 'tools') {
    // 这里假设 middleware.apps 存在
    res.status(200).json(makeStandardResponse({ tools: middleware.apps }))
  }
}