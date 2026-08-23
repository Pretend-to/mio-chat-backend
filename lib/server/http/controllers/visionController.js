import { makeStandardResponse } from '../utils/responseFormatter.js'
import { visionService } from '../../../chat/vision/VisionService.js'

/**
 * 获取识图服务配置与当前系统中已启用的视觉多模态模型列表
 */
export async function getVisionConfig(req, res) {
  try {
    await visionService.initialize()
    const availableModels = await visionService.getAvailableVisionModels()
    res.json(makeStandardResponse({
      config: visionService.config,
      availableModels
    }))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

/**
 * 更新识图服务配置
 */
export async function updateVisionConfig(req, res) {
  try {
    const { mode, provider, model, defaultPrompt } = req.body
    const updated = await visionService.saveConfig({
      mode: mode || 'auto',
      provider: provider || '',
      model: model || '',
      defaultPrompt: defaultPrompt !== undefined ? defaultPrompt : visionService.config.defaultPrompt
    })
    res.json(makeStandardResponse(updated))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

/**
 * 执行即时识图测试
 */
export async function testVision(req, res) {
  try {
    const { image, prompt, provider, model } = req.body
    if (!image) {
      return res.status(400).json({ code: 1, message: '请提供测试图片链接 (URL) 或 Base64 数据' })
    }

    const result = await visionService.analyze({
      image,
      prompt: prompt || undefined,
      provider: provider || undefined,
      model: model || undefined
    })

    res.json(makeStandardResponse(result))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}
