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
    const ip = e.user.IP
    return ip
  }
}
