import { MioFunction } from '../../../functions.js'

export default class getWeather extends MioFunction {
  constructor() {
    super({
      name: 'getWeather',
      description: '根据当前用户的城市编号(adcode)获取当前用户所在城市的天气信息',
      params: [{
        name: 'adcode',
        type: 'number',
        description: '城市编号(adcode)',
      }],
      required: ['adcode'],
    })
    this.func = this.getWeather
  }

  async getWeather(e) {
    const { apiKey, baseUrl } = this.getPluginConfig()
    if (!apiKey) {
      return {
        error: '未配置API Key'
      } 
    }
    const adcode = e.params.adcode
    const path = '/weather/weatherInfo'

    try {
      const response = await fetch(`${baseUrl}${path}?city=${adcode}&key=${apiKey}&extensions=all`)
      const data = await response.json()
      if (data.status === 0) throw new Error('获取天气失败' + data)
      return data

    } catch (error) {
      logger.error(error)
      e.error(error)
    }
  }
}
