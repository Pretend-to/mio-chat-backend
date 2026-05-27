# MioChat API References

## MioFunction Base Class (lib/function.js)
```javascript
class MioFunction {
  constructor({
    name,
    description,
    parameters,
    timeout,
    adminOnly = false,
  }) {
    this.name = name; // Will be suffixed with hash internally
    this.description = description;
    this.parameters = parameters; // JSON Schema
    this.timeout = timeout || 300;
    this.adminOnly = adminOnly;
  }
  
  async run(e) {
    // e.user: { id, ip, isAdmin, origin }
    // e.params: The parsed parameters from the LLM
    // return any object as the result
  }

  // Get a readable display name for this tool based on its arguments
  getDisplayName(params) {
    return null;
  }

  // Show a selection overlay in the frontend and pause/block until the user chooses an option (timeout 60s)
  // options: { prompt: string, options: Array<{ label: string, value: any }> } or Array<{ label, value }>
  async showSelectOverlay(e, options) {
    // Returns user choice payload: { selectResult: any }
  }

  // Prompt the user in the frontend for manual confirmation/approval before executing a high-risk operation (timeout 60s)
  // meta: optional metadata like { command: string } to check for auto-approval list and high-risk executables
  async requestUserApproval(e, prompt, meta = {}) {
    // Returns approval result payload: { approved: boolean, reason: string | null }
  }
}
```

## Plugin Base Class (lib/plugin.js)
```javascript
class Plugin {
  constructor(info, settings = {}) {
    // ...
  }
  // Required methods for sub-classes:
  getFilePath() { /* return __dirname */ }
  getInitialConfig() { /* return {} */ }
}
```
