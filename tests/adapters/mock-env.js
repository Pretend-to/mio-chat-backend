import prismaManager from '../../lib/database/prisma.js';

// Mock prismaManager to prevent actual DB operations during tests
prismaManager.initialize = async () => {};
prismaManager.connect = async () => {};
prismaManager.disconnect = async () => {};
prismaManager.getClient = () => (
  {
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
  }
);

// Mock global logger
global.logger = {
  debug: () => {},
  error: () => {},
  info: () => {},
  json: () => {},
  mark: () => {},
  warn: () => {},
};

// Mock global middleware
global.middleware = {
  llm: {
    getLLMTools: (tools) => tools.map(t => ({ description: t, name: t, parameters: {} })),
    runTool: async (toolCallData) => (
      {
        call: toolCallData,
        result: `Mock result for ${toolCallData.name}`
      }
    )
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
        extraSettings: {},
        toolCallSettings: { mode: 'AUTO', tools: [] }
      },
      ...body
    };
    this.requestId = `test-request-${  Math.random()}`;
    this.aborted = false;
    this.updates = [];
    this.isCompleted = false;
    this.abortCallbacks = [];
    
    this.client = {
      popConnection: () => {},
      popEvent: () => {},
      pushConnection: () => {},
      pushEvent: () => {},
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
  gemini: (chunks = []) => ({
    chat: async function* () {
      for (const chunk of chunks) yield chunk;
    }
  }),
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
