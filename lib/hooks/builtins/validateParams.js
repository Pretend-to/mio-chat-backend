import BaseHook from '../BaseHook.js';
import { HOOK_POINTS } from '../types.js';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

/**
 * 参数校验 Hook
 * 基于工具定义的 parameters (JSON Schema) 进行自动校验
 */
export default class ValidateParamsHook extends BaseHook {
  constructor() {
    super({
      name: 'validate-params',
      description: '基于 JSON Schema 的工具参数自动校验',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      priority: 100, // 最高优先级，最先执行
      namespace: '__builtin__'
    });
    this.validators = new Map();
  }

  async execute(ctx) {
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
        logger.error(`[ValidateParamsHook] Failed to compile schema for tool "${tool.name}":`, e);
        return true; // 编译失败则跳过校验，不影响执行
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
