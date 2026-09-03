import pino from 'pino';


const logger = pino({ name: 'ai-workflow-runner' });

export class WorkflowRunner {
  /**
   * Execute a sequential or DAG multi-agent workflow
   */
   async executeWorkflow(workflow) {
    const startedAt = Date.now();
    logger.info({ msg: `Starting workflow execution: ${workflow.name}`, workflowId: workflow.id });

    workflow.status = 'running';
    const aggregatedResults = {};

    let completedSteps = 0;

    for (const step of workflow.steps) {
      step.status = 'running';
      step.startedAt = new Date().toISOString();

      try {
        logger.info({ msg: `Running step [${step.name}] via agent [${step.assignedAgent}]` });

        // Simulate or invoke step execution
        const stepOutput = await this.executeStep(step, workflow.context);

        step.output = stepOutput;
        step.status = 'completed';
        step.completedAt = new Date().toISOString();
        aggregatedResults[step.id] = stepOutput;
        completedSteps++;
      } catch (err) {
        step.status = 'failed';
        step.error = err.message || 'Unknown step failure';
        step.completedAt = new Date().toISOString();
        workflow.status = 'failed';
        logger.error({ err, msg: `Step [${step.name}] failed` });
        break;
      }
    }

    if (workflow.status !== 'failed') {
      workflow.status = 'completed';
    }

    const durationMs = Date.now() - startedAt;
    return {
      workflowId: workflow.id,
      status: workflow.status,
      results: aggregatedResults,
      metrics: {
        durationMs,
        stepsTotal: workflow.steps.length,
        stepsCompleted: completedSteps,
      },
      timestamp: new Date().toISOString(),
    };
  }

   async executeStep(step, context) {
    // In production this delegates to agent SDK clients
    return {
      agent: step.assignedAgent,
      stepId: step.id,
      status: 'success',
      processedAt: new Date().toISOString(),
      data: {
        actionTaken: `Executed ${step.name}`,
        contextKeysReceived: Object.keys(context),
      },
    };
  }
}
