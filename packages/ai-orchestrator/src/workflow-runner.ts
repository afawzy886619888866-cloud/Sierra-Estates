import pino from 'pino';
import { deepseekReasoningEngine } from '@sierra-estates/deepseek-harness';
import { WorkflowInstance, WorkflowStep, WorkflowResult } from './types.js';

const logger = pino({ name: 'ai-workflow-runner' });

export class WorkflowRunner {
  /**
   * Execute a sequential or DAG multi-agent workflow
   */
  public async executeWorkflow(workflow: WorkflowInstance): Promise<WorkflowResult> {
    const startedAt = Date.now();
    logger.info({ msg: `Starting workflow execution: ${workflow.name}`, workflowId: workflow.id });

    workflow.status = 'running';
    const aggregatedResults: Record<string, any> = {};

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
      } catch (err: any) {
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

  private async executeStep(step: WorkflowStep, context: Record<string, any>): Promise<Record<string, any>> {
    if (step.assignedAgent === 'deepseek_reasoner') {
      const task = step.inputs?.task || step.name;
      const mode = step.inputs?.mode || 'reason';

      if (mode === 'eval') {
        const report = await deepseekReasoningEngine.runEvaluationSuite();
        return {
          agent: 'deepseek_reasoner',
          stepId: step.id,
          status: 'success',
          mode: 'eval',
          processedAt: new Date().toISOString(),
          data: report,
        };
      }

      if (mode === 'develop') {
        const plan = await deepseekReasoningEngine.developProgram(task, {
          ...context,
          ...step.inputs,
        });
        return {
          agent: 'deepseek_reasoner',
          stepId: step.id,
          status: 'success',
          mode: 'develop',
          processedAt: new Date().toISOString(),
          data: plan,
        };
      }

      const reasoningOutput = await deepseekReasoningEngine.reason(task, {
        ...context,
        ...step.inputs,
      });

      return {
        agent: 'deepseek_reasoner',
        stepId: step.id,
        status: 'success',
        mode: 'reason',
        processedAt: new Date().toISOString(),
        data: reasoningOutput,
      };
    }

    // Default simulation/stub for standard worker agents
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
