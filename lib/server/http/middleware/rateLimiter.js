import rateLimit from 'express-rate-limit'
import config from '../../../config.js'
import { getIP } from '../utils/getIP.js'

const serverConfig = config.server
export const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: serverConfig.max_rate_pre_min,
  message: '此IP请求过多，请稍后再试',
  keyGenerator: getIP,
})