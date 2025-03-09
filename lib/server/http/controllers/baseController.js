/* eslint-disable camelcase */
import config from '../../../config.js'
import { makeStandardResponse } from '../utils/responseFormatter.js'
import shareService from '../services/shareService.js'

// 基本网关路由
export function getGateway(req, res) {
  logger.info('GET /api/gateway')
  const data = {
    name: 'mio-chat-backend',
    version: '1.0.0',
    description: 'mio-chat-backend is a backend service for mio-chat.',
  }
  const response = makeStandardResponse(data)
  res.json(response)
}

// 基本信息路由
export function getBaseInfo(req, res) {
  logger.info('GET /api/base_info')
  res.status(200).json({
    code: 0,
    message: 'success',
    data: {
      full_screen: config.web.full_screen,
      beian: config.web.beian,
      admin_qq: config.onebot.admin_qq || 10000,
      bot_qq: config.onebot.bot_qq,
      title: config.web.title,
    },
  })
}

// Onebot插件路由
export function getOnebotPlugins(req, res) {
  logger.info('GET /api/onebot/plugins')
  res.status(200).json({
    code: 0,
    message: 'success',
    data: {
      options: config.onebot.plugins.options,
    },
  })
}

export async function getShare(req, res) {
  logger.info('GET /api/share')

  const id = req.query.id
  let shareDate

  try {
    shareDate = await shareService.getShare(id)
    res.json(makeStandardResponse(shareDate))
  } catch (error) {
    res.status(400).json({
      code: 1,
      message: error.message,
      data: null,
    }) 
  }
}

export async function setShare(req, res) {
  logger.info('POST /api/share')

  const { contactor } = req.body

  const shareDate = await shareService.createShare(contactor.id,contactor)

  res.json(makeStandardResponse(shareDate))
}