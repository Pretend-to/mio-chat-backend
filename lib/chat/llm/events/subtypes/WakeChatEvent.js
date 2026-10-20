import { ChatEvent } from '../ChatEvent.js'

/** Candidate wake with no stream or output side effects until independently run. */
export class WakeChatEvent extends ChatEvent {
  constructor(params) {
    super(params)
    this.workItemId = params.workItemId
  }
}
