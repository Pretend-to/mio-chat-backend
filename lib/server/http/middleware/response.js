export function makeStandardResponse(data) {
  return data
    ? { code: 0, message: 'success', data }
    : { code: 1, message: 'failed', data: null }
}