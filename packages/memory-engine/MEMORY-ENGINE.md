# ECC Memory Engine - The Soul & Core Intelligence

## Architecture

The Memory Engine is the **central nervous system** of ECC - it connects all agents, bots, skills, and contexts into a unified intelligence platform.

### Core Components

```
Memory Engine
├── Context Layer (Agent Working Memory)
│   ├── Session Context (current execution)
│   ├── Project Context (codebase understanding)
│   └── Historical Context (learned patterns)
├── Knowledge Base (Persistent Memory)
│   ├── Skills Registry (135+ skills)
│   ├── Agent Profiles (47 agents)
│   ├── Pattern Library (learned behaviors)
│   └── Decision Logs (audit trail)
├── Integration Layer (Agent Communication)
│   ├── Agent Bus (message passing)
│   ├── Skill Loader (dynamic skill injection)
│   ├── Hook Engine (trigger-based actions)
│   └── MCP Connectors (external integrations)
└── Soul Layer (Identity & Principles)
    ├── Core Identity (SOUL.md)
    ├── Decision Framework
    ├── Security Policy
    └── Orchestration Rules
```

## How It Works

### 1. **Agent Initialization**
```yaml
When an agent starts:
  1. Load context from Memory Engine
  2. Fetch relevant skills from Knowledge Base
  3. Activate applicable rules
  4. Connect to Agent Bus
  5. Begin execution with full awareness
```

### 2. **Skill Execution**
```yaml
When a skill runs:
  1. Query Memory Engine for context
  2. Check decision framework for applicability
  3. Execute with injected context awareness
  4. Log learnings back to Knowledge Base
  5. Update agent profile with results
```

### 3. **Agent Communication**
```yaml
Agent Bus (pub/sub):
  - Agents publish state changes
  - Memory Engine listens and updates context
  - Other agents can subscribe to relevant topics
  - Enables cross-agent coordination
```

### 4. **Learning & Evolution**
```yaml
Continuous Learning:
  1. Capture execution patterns
  2. Analyze success/failure modes
  3. Generate or refine skills
  4. Update agent decision trees
  5. Improve Soul decision framework
```

## Integration Points

### With Agents
- Each agent loads its profile from Memory Engine on startup
- Agents query context before decisions
- Agents report results to update knowledge base

### With Skills
- Skills access Memory Engine for context
- Skills can read/write to knowledge base
- Skills contribute to pattern library

### With Hooks
- Hooks trigger based on Memory Engine state
- Hooks can update context and knowledge base
- Enables event-driven architecture

### With Commands
- Commands route through Memory Engine
- Context injected into command execution
- Results feed back into learning system

## Key Files

- `MEMORY-ENGINE.md` - This file (architecture)
- `src/memory-engine.ts` - Core implementation
- `src/types.ts` - Type definitions
- `contexts/` - Session and project contexts (future)
- `.agents/` - Agent profiles and configurations (future)
- `skills/` - Skill definitions and implementations (future)

## Implementation

### Step 1: Context Registry
Create a unified context API:
```typescript
interface MemoryEngine {
  // Context operations
  getContext(agentId: string): Context
  updateContext(agentId: string, updates: Partial<Context>): void
  mergeContext(...contexts: Context[]): Context

  // Skill operations
  loadSkill(skillId: string): Skill
  getApplicableSkills(context: Context): Skill[]

  // Knowledge base
  logExecution(execution: ExecutionLog): void
  getPatterns(query: PatternQuery): Pattern[]

  // Agent communication
  publish(topic: string, message: Message): void
  subscribe(topic: string, handler: MessageHandler): void
}
```

### Step 2: Agent Integration
Each agent gets Memory Engine as a service:
```markdown
Agent receives:
- Current context (session, project, historical)
- Applicable skills (filtered by context)
- Decision rules (from SOUL framework)
- Communication bus (for coordination)
```

### Step 3: Automatic Learning
System captures and analyzes:
- Successful patterns
- Decision effectiveness
- Skill combinations
- Error patterns
- User preferences

## Benefits

1. **Unified Intelligence** - All agents share knowledge
2. **Continuous Learning** - System improves over time
3. **Coordination** - Agents can work together
4. **Auditability** - Full decision log maintained
5. **Adaptability** - Skills and agents can evolve
6. **Consistency** - All agents follow same Soul principles

## Status

- [x] Context API implementation
- [x] Skill management implementation
- [x] Knowledge Base (execution logging)
- [x] Learning system (pattern analysis)
- [x] Agent profile management
- [x] Agent Bus (pub/sub)
- [ ] Integration with existing agents
- [ ] Persistence layer (file/database)
- [ ] Skill auto-loading
- [ ] Hook integration
- [ ] MCP connectors

## Usage

```typescript
import { memoryEngine } from '@sierra-estates/memory-engine'
import type { Context, Skill } from '@sierra-estates/memory-engine'

// Register a skill
memoryEngine.registerSkill({
  id: 'whatsapp-send',
  name: 'Send WhatsApp Message',
  applicableWhen: (context) => context.channel === 'whatsapp'
})

// Get applicable skills for a context
const skills = memoryEngine.getApplicableSkills({
  agentId: 'lead-handler',
  channel: 'whatsapp'
})

// Subscribe to agent communication
const unsubscribe = memoryEngine.subscribe('agent:registered', (agent) => {
  console.log('New agent registered:', agent)
})

// Log execution for learning
memoryEngine.logExecution({
  agentId: 'lead-handler',
  action: 'send-message',
  timestamp: new Date(),
  success: true,
  skillsUsed: ['whatsapp-send']
})

// Analyze patterns
const patterns = memoryEngine.getPatterns()
```

---

**The Memory Engine transforms Sierra Estates from a collection of independent agents into a unified, learning, evolving intelligence system.**
