import { statusCheck } from './lib/check.js'
import { startServer } from './lib/server/http.js'
import taskScheduler from './lib/corn.js'

await statusCheck()
startServer()

const scheduler = new taskScheduler()
scheduler.init()
