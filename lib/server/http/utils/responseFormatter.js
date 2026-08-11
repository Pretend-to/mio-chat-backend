export function makeStandardResponse(data) {
  // Logger.debug(`创建标准响应. 数据: ${JSON.stringify(data)}`)
  return data
    ? {
      code: 0,
      data,
      message: 'success',
    }
    : {
      code: 1,
      data: null,
      message: 'failed',
    }
}
