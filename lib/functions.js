class MioFunction {
  constructor(config) {
    this.name = config.name,
    this.func = config.func,
    this.description = config.description,
    this.params = config.params
  }

  async run(e) {
    return await this.func(e)
  }

  json() {
    const json = {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
      },
    }
    if(this.params.length > 0){
      json.function.parameters = {
        type: 'object',
        properties: {},
        required: []
      }
      this.params.forEach((param) => {
        json.function.parameters.properties[param.name] = {
          type: param.type,
          description: param.description,
          ...(param.enum && { enum: param.enum })
        }
        if (param.items) {
          json.function.parameters.properties[param.name].items = param.items
        }
        if (param.required) {
          json.function.parameters.required.push(param.name)
        }
      })}
    // return JSON.stringify(json)
    return json
  }
}

class Param {
  constructor(config) {
    this.name = config.name
    this.type = config.type
    this.required = config.required
    this.enum = config?.enumeration || null
    this.description = config?.description || null
    this.items = config?.items || null
  }

}

export { MioFunction, Param }
