/** sleep 延时（毫秒） */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export default sleep
