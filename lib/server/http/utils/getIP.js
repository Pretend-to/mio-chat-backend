const getIP = (req) => {
  try {
    return req.headers['x-real-ip'] || req.connection.remoteAddress || null
  } catch (error) {
    console.error('Error getting IP:', error)
    return null
  }
}
  
export {
  getIP 
}