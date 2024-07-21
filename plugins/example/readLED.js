import { MioFunction } from '../../lib/functions.js'

export class readLED extends MioFunction {
  constructor() {
    super({
      name: 'readLED',
      description: 'A tool that help you to read the status of some LED',
      params: [],
    })
    this.func = this.readLED
  }

  async readLED(e) {

    const baseUrl = 'http://4.raspi.com:5000'

    const response = await fetch(`${baseUrl}/status`)
    const result = await response.json()

    return result
  }
}
