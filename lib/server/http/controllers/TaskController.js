import { makeStandardResponse } from '../utils/responseFormatter.js'
import logger from '../../../../utils/logger.js'
import TaskService from '../../../database/services/TaskService.js'
import taskScheduler from '../../../cron.js'

/**
 * 获取所有任务列表
 */
export async function getTasks(req, res) {
  try {
    const tasks = await TaskService.findAll()
    res.json(makeStandardResponse(tasks))
  } catch (error) {
    logger.error('获取任务列表失败:', error)
    res.status(500).json({
      code: 1,
      message: '获取任务列表失败: ' + error.message,
    })
  }
}

/**
 * 创建或更新任务
 */
export async function upsertTask(req, res) {
  try {
    const taskData = req.body
    
    // 如果没有 ID，生成一个
    if (!taskData.id) {
      taskData.id = 'task_' + Date.now()
    }
    
    const task = await taskScheduler.addAgentTask(taskData)
    res.json(makeStandardResponse(task))
  } catch (error) {
    logger.error('保存任务失败:', error)
    res.status(500).json({
      code: 1,
      message: '保存任务失败: ' + error.message,
    })
  }
}

/**
 * 删除任务
 */
export async function deleteTask(req, res) {
  try {
    const { id } = req.params
    const success = await taskScheduler.removeTask(id)
    
    if (success) {
      res.json(makeStandardResponse({ id }))
    } else {
      res.status(404).json({
        code: 1,
        message: '任务不存在或删除失败',
      })
    }
  } catch (error) {
    logger.error('删除任务失败:', error)
    res.status(500).json({
      code: 1,
      message: '删除任务失败: ' + error.message,
    })
  }
}

/**
 * 切换任务状态（启用/禁用）
 */
export async function toggleTask(req, res) {
  try {
    const { id } = req.params
    const { enable } = req.body
    
    if (enable) {
      const task = await TaskService.findById(id)
      if (!task) throw new Error('任务不存在')
      await taskScheduler.addAgentTask({ ...task, status: 'active' })
    } else {
      await taskScheduler.disableTask(id)
    }
    
    const updatedTask = await TaskService.findById(id)
    res.json(makeStandardResponse(updatedTask))
  } catch (error) {
    logger.error('切换任务状态失败:', error)
    res.status(500).json({
      code: 1,
      message: '切换任务状态失败: ' + error.message,
    })
  }
}
