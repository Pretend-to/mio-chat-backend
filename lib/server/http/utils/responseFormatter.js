export function makeStandardResponse(data) {
  // logger.debug(`创建标准响应. 数据: ${JSON.stringify(data)}`)
  return data
    ? {
      code: 0,
      message: 'success',
      data,
    }
    : {
      code: 1,
      message: 'failed',
      data: null,
    }
}
