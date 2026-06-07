import prismaManager from '../../lib/database/prisma.js';

// Mock prismaManager to prevent actual DB operations during tests
prismaManager.initialize = async () => {};
prismaManager.connect = async () => {};
prismaManager.disconnect = async () => {};
prismaManager.getClient = () => {
  return {
    systemSetting: {
      findMany: async () => [],
      findUnique: async () => null,
    },
    pluginConfig: {
      findMany: async () => [],
    },
    lLMAdapter: {
      findMany: async () => [],
    },
    modelOwner: {
      findMany: async () => [],
    },
    preset: {
      findMany: async () => [],
    },
    lLMCallLog: {
      create: async () => ({ id: 1 }),
      update: async () => ({ id: 1 }),
      updateMany: async () => ({ count: 1 }),
    },
  };
};

// Mock global logger
global.logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  mark: () => {},
  json: () => {},
};

// Mock global middleware
global.middleware = {
  llm: {
    getLLMTools: (tools) => tools.map(t => ({ name: t, description: t, parameters: {} })),
    runTool: async (toolCallData) => {
      return {
        call: toolCallData,
        result: `Mock result for ${toolCallData.name}`
      };
    }
  }
};

// Mock Event class/object
export class MockEvent {
  constructor(body = {}) {
    this.body = {
      messages: [],
      settings: {
        base: { model: 'gpt-4o', stream: true },
        chatParams: { temperature: 0.7 },
        toolCallSettings: { mode: 'AUTO', tools: [] },
        extraSettings: {}
      },
      ...body
    };
    this.requestId = 'test-request-' + Math.random();
    this.aborted = false;
    this.updates = [];
    this.isCompleted = false;
    this.abortCallbacks = [];
    
    this.client = {
      pushEvent: () => {},
      popEvent: () => {},
      pushConnection: () => {},
      popConnection: () => {},
    };
  }

  update(data) {
    this.updates.push(data);
  }

  complete() {
    this.isCompleted = true;
  }

  pending() {}
  
  error(err) {
    this.errorOccurred = err;
  }

  onAbort(cb) {
    this.abortCallbacks.push(cb);
  }

  abort() {
    this.aborted = true;
    this.abortCallbacks.forEach(cb => cb());
  }
}

// Helper to create a mock stream
export async function* createMockStream(chunks) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

export const MockFactories = {
  openai: (chunks = []) => ({
    chat: {
      completions: {
        create: async () => ({
          async *[Symbol.asyncIterator]() {
            for (const chunk of chunks) yield chunk;
          }
        })
      }
    }
  }),
  gemini: (chunks = []) => ({
    chat: async function* () {
      for (const chunk of chunks) yield chunk;
    }
  }),
  responses: (chunks = []) => ({
    responses: {
      create: async () => ({
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) yield chunk;
        }
      })
    }
  })
};
