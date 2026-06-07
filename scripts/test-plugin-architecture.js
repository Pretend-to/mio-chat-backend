import path from 'path';
import { pathToFileURL } from 'url';

// 1. 模拟全局 logger
global.logger = {
  debug: (...args) => console.log('[DEBUG]', ...args),
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

async function runTest() {
  console.log('🚀 开始插件架构集成测试...\n');

  // 2. 导入核心组件
  const { default: hookManager } = await import('../lib/hooks/index.js');
  const { HOOK_POINTS } = await import('../lib/hooks/types.js');
  const { default: TestPlugin } = await import('../plugins/test-hook/index.js');

  const plugin = new TestPlugin();

  console.log('--- 阶段 1: 插件初始化 ---');
  await plugin.initialize();
  
  const hooksList = plugin.hooks.list();
  console.log('插件私有 Hooks:', JSON.stringify(hooksList, null, 2));
  
  if (hooksList[HOOK_POINTS.TOOL_BEFORE_EXECUTE]?.some(h => h.name === 'test-logger')) {
    console.log('✅ 插件 Hook 自动加载成功');
  } else {
    throw new Error('❌ 插件 Hook 加载失败');
  }

  console.log('\n--- 阶段 2: 私有工具执行链验证 ---');
  const helloTool = Array.from(plugin.tools.values()).find(t => t.name.startsWith('hello'));
  
  const mockEvent = {
    params: { name: 'Mio' },
    user: { id: 'user_123', isAdmin: false },
    update: (data) => console.log('[Event Update]', data)
  };

  console.log('执行工具:', helloTool.name, '参数:', mockEvent.params);
  const result = await helloTool.run(mockEvent);
  
  console.log('执行结果:', result);

  if (result.text === 'Hello, Mio (Hooked)!') {
    console.log('✅ 私有 Hook 修改参数验证成功');
  } else {
    throw new Error('❌ 私有 Hook 未能按预期修改参数');
  }

  console.log('\n--- 阶段 3: 内置权限拦截验证 ---');
  helloTool.adminOnly = true;
  try {
    await helloTool.run(mockEvent);
    throw new Error('❌ 权限拦截失效：非管理员竟然执行成功了');
  } catch (e) {
    if (e.message.includes('Only administrators')) {
      console.log('✅ 内置 checkPermission Hook 拦截成功');
    } else {
      throw e;
    }
  }

  console.log('\n--- 阶段 4: 内置参数校验验证 ---');
  helloTool.adminOnly = false;
  const invalidEvent = {
    params: { age: 18 }, // 缺少必填项 name
    user: { id: 'user_123' }
  };
  
  try {
    await helloTool.run(invalidEvent);
    throw new Error('❌ 参数校验拦截失效');
  } catch (e) {
    if (e.message.includes('Invalid parameters')) {
      console.log('✅ 内置 validateParams Hook 拦截成功:', e.message);
    } else {
      throw e;
    }
  }

  console.log('\n--- 阶段 5: 插件 Hook 传播验证 ---');
  plugin._propagateHooks();
  const globalHooks = hookManager.list();
  if (globalHooks[HOOK_POINTS.TOOL_BEFORE_EXECUTE]?.some(h => h.name === 'test-logger')) {
    console.log('✅ Hook 传播到全局成功');
  } else {
    throw new Error('❌ Hook 传播失败');
  }

  console.log('\n🎉 所有测试用例通过！');
  process.exit(0);
}

runTest().catch(err => {
  console.error('\n❌ 测试失败:');
  console.error(err);
  process.exit(1);
});
