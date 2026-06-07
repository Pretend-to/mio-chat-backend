import BaseHook from '../BaseHook.js';
import { HOOK_POINTS } from '../types.js';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

/**
 * 参数校验 Hook
 * 1. 在加载时校验工具名称和 Schema 合法性
 * 2. 在执行前校验传入参数
 */
export default class ValidateParamsHook extends BaseHook {
  constructor() {
    super('system:validate-params');
    this.validators = new Map();
  }

  getPriority() {
    return 100;
  }

  /**
   * 工具加载时校验：校验名称和 Schema 语法
   */
  async [HOOK_POINTS.TOOL_BEFORE_LOAD](ctx) {
    const { tool, plugin } = ctx;
    
    // 1. 校验工具名称合法性
    if(!tool.name || tool.name.length < 3) {
      console.error(`[校验] 插件 ${plugin?.name} 中的工具名称过短: ${tool.name}`);
      return false;
    }

    if (tool.name.startsWith('mio_') && plugin?.name !== 'system') {
      console.error(`[校验] 非系统插件禁止使用 mio_ 前缀: ${tool.name}`);
      return false;
    }

    // 2. 预编译 Schema
    if (tool.parameters) {
      try {
        ajv.compile(tool.parameters);
      } catch (e) {
        console.error(`[校验] 工具 ${tool.name} 的 parameters 定义无效:`, e.message);
        return false;
      }
    }

    return true;
  }

  /**
   * 工具执行前校验：校验传入参数
   */
  async [HOOK_POINTS.TOOL_BEFORE_EXECUTE](ctx) {
    const { tool, params } = ctx;

    // 如果工具没有定义参数 schema，则跳过
    if (!tool.parameters || Object.keys(tool.parameters).length === 0) {
      return true;
    }

    let validate = this.validators.get(tool.name);
    if (!validate) {
      try {
        validate = ajv.compile(tool.parameters);
        this.validators.set(tool.name, validate);
      } catch (e) {
        return true; // 编译失败则跳过校验
      }
    }

    const valid = validate(params);
    if (!valid) {
      const errorMsg = validate.errors
        .map(err => `${err.instancePath} ${err.message}`)
        .join(', ');
      
      ctx.error = `Invalid parameters: ${errorMsg}`;
      return false; // 拦截执行
    }

    return true;
  }
}
