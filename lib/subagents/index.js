import SubAgentDispatcher from './SubAgentDispatcher.js'
import SubAgentExecutor from './SubAgentExecutor.js'
import SubAgentRunService from './SubAgentRunService.js'

let runtime = null

export function getSubAgentRuntime() {
  if (!runtime) {
    const runService = new SubAgentRunService()
    const executor = new SubAgentExecutor()
    runtime = {
      dispatcher: new SubAgentDispatcher({
        executor,
        runService,
      }),
      executor,
      runService,
    }
  }
  return runtime
}

export function setSubAgentRuntimeForTesting(value) {
  runtime = value
}

export default getSubAgentRuntime
