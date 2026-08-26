import { makeStandardResponse } from '../utils/responseFormatter.js'
import { shellPolicyService } from '../../../database/services/ShellPolicyService.js'

/**
 * Shell 自动审批策略管理 API（供前端设置页可视化展示/维护后端权威名单）
 */
export async function listShellRules(req, res) {
  try {
    const rules = await shellPolicyService.list()
    res.json(makeStandardResponse({ rules }))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function addShellRule(req, res) {
  try {
    const { matchType, match, cwd, deny = false, enabled = true } = req.body
    const rule = await shellPolicyService.add({ matchType, match, cwd, deny, enabled })
    res.json(makeStandardResponse(rule))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function removeShellRule(req, res) {
  try {
    const result = await shellPolicyService.remove(req.params.id)
    res.json(makeStandardResponse(result))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}