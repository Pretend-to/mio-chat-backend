import { MioFunction,Param } from '../../../lib/functions.js'

export class manageLED extends MioFunction {
  constructor() {
    super({
      name: 'manageLED',
      description: 'A tool that help you to manage some LED',
      params: [
        new Param({
          name: 'color',
          type:'string',
          description: 'the color of the LED that you wanna manage',
          required: true,
          enumeration:['red','green']
        }),
        new Param({
          name:'action',
          type:'string',
          description: 'the status that you wanna the LED to be',
          required: true,
          enumeration:['on','off']
        }),
      ],
    })
    this.func = this.manageLED
  }

  async manageLED(e) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`LED ${e.params.color} ${e.params.action}`)
      }, 1000)
    })
  }

  // async manageLED(e) {

  //   const baseUrl = 'http://192.168.27.173/led'
  //   const action = e.params.action
  //   const url = `${baseUrl}?state=${action}`
  //   const response = await fetch(url)

  //   logger.debug('请求地址：' + `${url}`)

  //   const result = await response.text()

  //   return result
  // }
}
