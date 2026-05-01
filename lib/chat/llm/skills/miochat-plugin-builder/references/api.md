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
