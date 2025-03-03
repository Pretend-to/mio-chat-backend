import { MioFunction, Param } from '../../../functions.js'

export default class getPosition extends MioFunction {
  constructor() {
    super({
      name: 'getPosition',
      description: '根据当前用户的IP地址获取当前用户的位置',
      params: [
        new Param({
          name: 'ip',
          type: 'string',
          description: '当前用户的IP地址',
          required: true,
        }),
      ],
    })
    this.func = this.getPosition
  }

  async getPosition(e) {
    const { baseUrl, apiKey } = this.getPluginConfig()
    const ip = e.params.ip
    const path = '/ip'

    try {
      const response = await fetch(`${baseUrl}${path}?ip=${ip}&key=${apiKey}`)
      logger.debug('请求地址：' + `${baseUrl}${path}?ip=${ip}&key=${apiKey}`)
      logger.debug('请求结果：')

      const data = await response.json()
      if (data.status === 0) throw new Error('获取位置失败' + data)
      return data

    } catch (error) {
      e.error(error)
    }
  }
}
