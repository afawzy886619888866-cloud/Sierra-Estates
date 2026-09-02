 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Memory Engine REST API Router
 * Exposes endpoints for agents to read/write shared memory, track repo goals, update contexts, and log execution.
 */

import { Router, } from 'express'
import { memoryEngine } from './memory-engine'
import { sharedMemory, } from './shared-memory-bus'

export const memoryApiRouter = Router()

/**
 * Helper to safely extract single string param
 */
function paramString(param) {
  if (Array.isArray(param)) return param[0] || ''
  return param || ''
}

/**
 * @route GET /api/memory/status
 * @desc Get status of MemoryEngine and SharedMemoryBus
 */
memoryApiRouter.get('/status', async (_req, res) => {
  try {
    const engineStatus = memoryEngine.getStatus()
    const busStats = await sharedMemory.stats()
    res.json({
      success: true,
      data: {
        engine: engineStatus,
        bus: busStats,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route GET /api/memory/read/:id
 * @desc Read memory entry by key/ID
 */
memoryApiRouter.get('/read/:id', async (req, res) => {
  try {
    const id = paramString(req.params.id)
    const data = await sharedMemory.read(id)
    if (data === null) {
      res.status(404).json({ success: false, error: `Memory key '${id}' not found` })
      return
    }
    res.json({ success: true, id, data })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route POST /api/memory/write
 * @desc Write a memory entry (shared memory)
 * @body { id: string, value: any, author?: AgentName, tags?: string[], ttl?: number }
 */
memoryApiRouter.post('/write', async (req, res) => {
  try {
    const { id, value, author = 'system', tags = [], ttl } = req.body
    if (!id || value === undefined) {
      res.status(400).json({ success: false, error: '`id` and `value` are required' })
      return
    }
    const entry = await sharedMemory.write(id, value, { author, tags, ttl })
    res.json({ success: true, data: entry })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route GET /api/memory/search
 * @desc Search memory by query string and tags
 * @query ?query=...&tags=tag1,tag2
 */
memoryApiRouter.get('/search', async (req, res) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query : ''
    const tagsParam = typeof req.query.tags === 'string' ? req.query.tags : undefined
    const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()) : undefined
    const results = await sharedMemory.search(query, tags)
    res.json({ success: true, count: results.length, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route POST /api/memory/search
 * @desc Search memory by query and tags body
 * @body { query?: string, tags?: string[] }
 */
memoryApiRouter.post('/search', async (req, res) => {
  try {
    const { query = '', tags } = req.body
    const results = await sharedMemory.search(query, tags)
    res.json({ success: true, count: results.length, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route GET /api/memory/context/:agentId
 * @desc Get memory context for a specific agent
 */
memoryApiRouter.get('/context/:agentId', (req, res) => {
  try {
    const agentId = paramString(req.params.agentId)
    const context = memoryEngine.getContext(agentId)
    res.json({ success: true, agentId, context: context || null })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route POST /api/memory/context/:agentId
 * @desc Update agent context
 * @body { updates: Partial<Context> }
 */
memoryApiRouter.post('/context/:agentId', (req, res) => {
  try {
    const agentId = paramString(req.params.agentId)
    const { updates } = req.body
    if (!updates) {
      res.status(400).json({ success: false, error: '`updates` object is required' })
      return
    }
    memoryEngine.updateContext(agentId, updates)
    res.json({ success: true, agentId, updatedContext: memoryEngine.getContext(agentId) })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route GET /api/memory/goals
 * @desc Get repo goals & tasks for agents to read and work towards
 */
memoryApiRouter.get('/goals', async (_req, res) => {
  try {
    const goalEntries = await sharedMemory.search('', ['repo-goal'])
    const goals = goalEntries.map((e) => {
      const payload = e.value 
      return _optionalChain([payload, 'optionalAccess', _ => _.data]) || e.value
    })
    res.json({ success: true, count: goals.length, goals })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route POST /api/memory/goals
 * @desc Create or update a repo goal for agents to work on
 * @body { goalId: string, title: string, description: string, assignedTo?: AgentName, status?: string, priority?: string }
 */
memoryApiRouter.post('/goals', async (req, res) => {
  try {
    const { goalId, title, description, assignedTo = 'system', status = 'open', priority = 'medium' } = req.body
    if (!goalId || !title) {
      res.status(400).json({ success: false, error: '`goalId` and `title` are required' })
      return
    }
    const goalData = {
      goalId,
      title,
      description: description || '',
      assignedTo,
      status,
      priority,
      updatedAt: new Date().toISOString(),
      progressLogs: []
    }
    const entry = await sharedMemory.write(`goal-${goalId}`, goalData, {
      author: assignedTo ,
      tags: ['repo-goal', `assigned-${assignedTo}`, `status-${status}`]
    })
    res.json({ success: true, goal: goalData, entry })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route POST /api/memory/goals/:goalId/progress
 * @desc Update progress and log action towards a repo goal
 * @body { author: AgentName, logMessage: string, status?: string }
 */
memoryApiRouter.post('/goals/:goalId/progress', async (req, res) => {
  try {
    const goalId = paramString(req.params.goalId)
    const { author = 'system', logMessage, status } = req.body
    if (!logMessage) {
      res.status(400).json({ success: false, error: '`logMessage` is required' })
      return
    }

    const existingGoal = (await sharedMemory.read(`goal-${goalId}`)) 
    if (!existingGoal) {
      res.status(404).json({ success: false, error: `Goal '${goalId}' not found` })
      return
    }

    const updatedGoal = {
      ...existingGoal,
      status: status || existingGoal.status,
      updatedAt: new Date().toISOString(),
      progressLogs: [
        ...(existingGoal.progressLogs || []),
        {
          author,
          message: logMessage,
          timestamp: new Date().toISOString()
        }
      ]
    }

    await sharedMemory.write(`goal-${goalId}`, updatedGoal, {
      author: author ,
      tags: ['repo-goal', `assigned-${updatedGoal.assignedTo}`, `status-${updatedGoal.status}`]
    })

    // Also log to execution memory
    memoryEngine.logExecution({
      agentId: author,
      action: `goal-progress:${goalId}`,
      timestamp: new Date(),
      success: true,
      result: { logMessage, status: updatedGoal.status }
    })

    res.json({ success: true, goal: updatedGoal })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route POST /api/memory/execution-log
 * @desc Log agent execution action
 * @body { agentId: string, action: string, success: boolean, result?: any, error?: string, skillsUsed?: string[] }
 */
memoryApiRouter.post('/execution-log', (req, res) => {
  try {
    const { agentId, action, success, result, error, skillsUsed } = req.body
    if (!agentId || !action) {
      res.status(400).json({ success: false, error: '`agentId` and `action` are required' })
      return
    }
    memoryEngine.logExecution({
      agentId,
      action,
      timestamp: new Date(),
      success: success !== false,
      result,
      error,
      skillsUsed
    })
    res.json({ success: true, message: 'Execution logged' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route GET /api/memory/patterns
 * @desc Get learned pattern insights from Memory Engine
 */
memoryApiRouter.get('/patterns', (_req, res) => {
  try {
    const patterns = memoryEngine.getPatterns()
    res.json({ success: true, count: patterns.length, patterns })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route POST /api/memory/backup
 * @desc Create a backup of the memory database
 */
import fs from 'fs';
import path from 'path';

memoryApiRouter.post('/backup', (_req, res) => {
  try {
    const storePath = path.resolve(process.cwd(), 'obsidian-store.json');
    if (fs.existsSync(storePath)) {
      const backupDir = path.resolve(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `obsidian-store-backup-${timestamp}.json`);
      fs.copyFileSync(storePath, backupPath);
      res.json({ success: true, message: 'Backup created successfully', backupPath });
    } else {
      res.status(404).json({ success: false, error: 'Database file not found to backup' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
})

export default memoryApiRouter
