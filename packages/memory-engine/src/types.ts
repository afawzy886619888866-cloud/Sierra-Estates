/**
 * Memory Engine Type Definitions
 */

export interface Context {
  [key: string]: any
  sessionId?: string
  projectId?: string
  agentId?: string
  timestamp?: Date
}

export interface Skill {
  id: string
  name: string
  description?: string
  applicableWhen?: (context: Context) => boolean
  execute?: (context: Context, args?: any) => Promise<any>
}

export interface Agent {
  id: string
  name: string
  description?: string
  role?: string
  skills?: string[]
  status?: 'active' | 'inactive' | 'paused'
}

export interface ExecutionLog {
  agentId: string
  action: string
  timestamp: Date
  success: boolean
  result?: any
  error?: string
  skillsUsed?: string[]
  context?: Partial<Context>
}

export interface Pattern {
  name: string
  occurrences: number
  successRate: number
  lastUsed: Date
  skills: string[]
}

export type MessageHandler = (message: any) => void
