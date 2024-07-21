import { MioFunction, Param } from '../../../lib/functions.js'
import config from '../config/index.js'

export class getWeather extends MioFunction {
  constructor() {
    super({
      name: 'getWeather',
      description: '根据当前用户的城市编号(adcode)获取当前用户所在城市的天气信息',
      params: [
        new Param({
          name: 'adcode',
          type: 'number',
          description: '城市编号(adcode)',
          required: true,
        }),
      ],
    })
    this.func = this.getWeather
  }

  async getWeather(e) {
    const baseUrl = config.baseUrl
    const apiKey = config.apiKey
    const adcode = e.params.adcode
    const path = '/weather/weatherInfo'

    try {
      const response = await fetch(`${baseUrl}${path}?city=${adcode}&key=${apiKey}&extensions=all`)
      const data = await response.json()
      if (data.status === 0) throw new Error('获取天气失败' + data)
<<<<<<< HEAD
      return data

    } catch (error) {
=======
      logger.debug()
      return data

    } catch (error) {
      logger.error(error)
>>>>>>> dev
      e.error(error)
    }
  }
}
