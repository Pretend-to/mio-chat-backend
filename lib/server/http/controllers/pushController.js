import pushService from '../../../push/PushService.js'
import { makeStandardResponse } from '../utils/responseFormatter.js'

export async function getVapidPublicKey(req, res) {
  try {
    const publicKey = await pushService.getVapidPublicKey()
    res.json(makeStandardResponse({ publicKey }))
  } catch (err) {
    res.status(500).json(makeStandardResponse(null, -1, err.message))
  }
}

export async function subscribe(req, res) {
  try {
    const { subscription, device } = req.body || {}
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json(makeStandardResponse(null, -1, '缺少有效的 subscription 对象'))
    }
    const userAgent = req.headers['user-agent'] || ''
    await pushService.addSubscription(subscription, {
      device,
      userAgent,
      userId: req.user?.id || 'admin',
    })
    res.json(makeStandardResponse({ success: true }))
  } catch (err) {
    res.status(500).json(makeStandardResponse(null, -1, err.message))
  }
}

export async function unsubscribe(req, res) {
  try {
    const { endpoint } = req.body || {}
    if (!endpoint) {
      return res.status(400).json(makeStandardResponse(null, -1, '缺少 endpoint 参数'))
    }
    await pushService.removeSubscription(endpoint)
    res.json(makeStandardResponse({ success: true }))
  } catch (err) {
    res.status(500).json(makeStandardResponse(null, -1, err.message))
  }
}

export async function testPush(req, res) {
  try {
    const { title, body, contactorId } = req.body || {}
    const result = await pushService.sendNotification({
      body: body || '这是一条测试推送通知',
      contactorId: contactorId || null,
      title: title || 'Mio-Chat 测试推送',
    })
    res.json(makeStandardResponse(result))
  } catch (err) {
    res.status(500).json(makeStandardResponse(null, -1, err.message))
  }
}
