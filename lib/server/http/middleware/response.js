export function makeStandardResponse(data) {
  return data
    ? { code: 0, data, message: 'success' }
    : { code: 1, data: null, message: 'failed' }
}
