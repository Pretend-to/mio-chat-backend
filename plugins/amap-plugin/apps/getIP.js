import { MioFunction } from '../../../lib/functions.js'

export class getIP extends MioFunction {
  constructor() {
    super({
      name: 'getIP',
      description: '获取当前用户的IP地址',
      params: [],
    })
    this.func = this.getIP
  }

  async getIP(e) {
    let ip = e.user.ip
    if(ip == '127.0.0.1') {
      // 从外部API获取本机ip
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      ip = data.ip
    }

    return ip
  }
}
