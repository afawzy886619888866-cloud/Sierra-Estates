import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuid } from "uuid";

/**
 * PHASE 1.3: Pub/Sub Retry Queue with Exponential Backoff
 * Ensures agent workflows complete even after transient failures
 */

interface RetryableTask {
  id: string;
  type: "agent_workflow" | "email" | "data_sync";
  payload: any;
  attempt: number;
  maxRetries: number;
  backoffMs: number;
  createdAt: Date;
  nextRetryAt: Date;
  lastError?: string;
  status: "pending" | "processing" | "completed" | "failed" | "deadletter";
}

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BACKOFF_MS = 1000; // 1 second
const MAX_BACKOFF_MS = 600000; // 10 minutes

/**
 * Enqueue a task for retry with exponential backoff
 */
export async function enqueueRetryTask(
  type: RetryableTask["type"],
  payload: any,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  backoffMs: number = DEFAULT_BACKOFF_MS
): Promise<string> {
  const db = admin.firestore();
  const taskId = uuid();

  const task: RetryableTask = {
    id: taskId,
    type,
    payload,
    attempt: 0,
    maxRetries,
    backoffMs,
    createdAt: new Date(),
    nextRetryAt: new Date(),
    status: "pending",
  };

  await db.collection("retry_queue").doc(taskId).set(task);

  // Publish to Pub/Sub topic to trigger processing
  const pubsub = admin.pubsub();
  const topic = pubsub.topic("agent-workflow-retry");

  await topic.publish(
    Buffer.from(
      JSON.stringify({
        taskId,
        type,
      })
    )
  );

  functions.logger.info(`[RETRY] Task enqueued`, {
    taskId,
    type,
    maxRetries,
  });

  return taskId;
}

/**
 * Process a single retry task
 */
export async function processRetryTask(taskId: string): Promise<void> {
  const db = admin.firestore();
  const taskRef = db.collection("retry_queue").doc(taskId);
  const taskDoc = await taskRef.get();

  if (!taskDoc.exists) {
    functions.logger.error(`[RETRY] Task not found`, { taskId });
    return;
  }

  const task = taskDoc.data() as RetryableTask;

  // Skip if already completed or in dead letter queue
  if (task.status === "completed" || task.status === "deadletter") {
    return;
  }

  // Check if it's time to retry
  if (new Date() < task.nextRetryAt) {
    functions.logger.info(`[RETRY] Task not ready yet`, {
      taskId,
      nextRetryAt: task.nextRetryAt,
    });
    return;
  }

  try {
    // Update status to processing
    await taskRef.update({
      status: "processing",
      attempt: task.attempt + 1,
    });

    // Execute based on task type
    switch (task.type) {
      case "agent_workflow":
        await processAgentWorkflow(task);
        break;
      case "email":
        await processEmailTask(task);
        break;
      case "data_sync":
        await processDataSync(task);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }

    // Mark as completed
    await taskRef.update({
      status: "completed",
    });

    functions.logger.info(`[RETRY] Task completed`, {
      taskId,
      attempt: task.attempt + 1,
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";

    // Check if we should retry
    if (task.attempt < task.maxRetries) {
      const nextBackoff = Math.min(
        task.backoffMs * Math.pow(2, task.attempt),
        MAX_BACKOFF_MS
      );
      const nextRetryAt = new Date(Date.now() + nextBackoff);

      await taskRef.update({
        status: "pending",
        lastError: errorMsg,
        nextRetryAt,
        backoffMs: nextBackoff,
      });

      functions.logger.warn(`[RETRY] Task will retry`, {
        taskId,
        attempt: task.attempt + 1,
        nextRetryAt,
        error: errorMsg,
      });
    } else {
      // Move to dead letter queue
      await taskRef.update({
        status: "deadletter",
        lastError: errorMsg,
      });

      functions.logger.error(`[RETRY] Task moved to dead letter queue`, {
        taskId,
        attempts: task.attempt,
        finalError: errorMsg,
      });

      // Alert ops team
      await notifyDeadLetterQueue(taskId, task, errorMsg);
    }
  }
}

/**
 * Process agent workflow task
 */
async function processAgentWorkflow(task: RetryableTask): Promise<void> {
  const { userId, message, sessionId } = task.payload;

  // Call agent workflow endpoint
  const response = await fetch(
    `${process.env.AGENT_ENDPOINT}/agentWorkflow`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIREBASE_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        userId,
        message,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Agent workflow failed with status ${response.status}: ${response.statusText}`
    );
  }

  const result = await response.json();

  // Update session with result
  const db = admin.firestore();
  if (sessionId) {
    await db.doc(`agent_sessions/${sessionId}`).update({
      result,
      status: "completed",
      completed_at: new Date(),
    });
  }
}

/**
 * Process email task
 */
async function processEmailTask(task: RetryableTask): Promise<void> {
  const { to, subject, body } = task.payload;

  // Call email service (e.g., SendGrid, MailChimp)
  const response = await fetch(`${process.env.EMAIL_SERVICE_ENDPOINT}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.EMAIL_SERVICE_TOKEN}`,
    },
    body: JSON.stringify({
      to,
      subject,
      body,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Email service failed with status ${response.status}`
    );
  }
}

/**
 * Process data sync task
 */
async function processDataSync(task: RetryableTask): Promise<void> {
  const { source, destination, query } = task.payload;

  // Call sync service
  const response = await fetch(`${process.env.DATA_SYNC_ENDPOINT}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DATA_SYNC_TOKEN}`,
    },
    body: JSON.stringify({
      source,
      destination,
      query,
    }),
  });

  if (!response.ok) {
    throw new Error(`Data sync failed with status ${response.status}`);
  }
}

/**
 * Notify ops team of dead letter queue items
 */
async function notifyDeadLetterQueue(
  taskId: string,
  task: RetryableTask,
  error: string
): Promise<void> {
  const db = admin.firestore();

  // Store in dead letter collection
  await db.collection("dead_letter_queue").doc(taskId).set({
    ...task,
    movedAt: new Date(),
    finalError: error,
  });

  // Send alert to ops (e.g., PagerDuty, email)
  functions.logger.error(`[DEAD_LETTER] Critical alert`, {
    taskId,
    type: task.type,
    error,
    createdAt: task.createdAt,
  });
}

/**
 * Cloud Scheduler trigger for retry processing
 * Call this every minute to process pending retries
 */
export const processRetryQueue = functions.pubsub
  .topic("process-retries")
  .onPublish(async (message, context) => {
    const db = admin.firestore();

    // Query all pending tasks that are ready to retry
    const now = new Date();
    const pendingTasks = await db
      .collection("retry_queue")
      .where("status", "==", "pending")
      .where("nextRetryAt", "<=", now)
      .limit(100) // Process max 100 at a time
      .get();

    functions.logger.info(
      `[RETRY_QUEUE] Processing ${pendingTasks.size} pending tasks`
    );

    for (const doc of pendingTasks.docs) {
      await processRetryTask(doc.id);
    }

    return pendingTasks.size;
  });

/**
 * Cloud Scheduler job to clean up old completed tasks
 * Run daily to prevent queue from growing indefinitely
 */
export const cleanupRetryQueue = functions.pubsub
  .topic("cleanup-retry-queue")
  .onPublish(async (message, context) => {
    const db = admin.firestore();

    // Delete completed tasks older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const oldTasks = await db
      .collection("retry_queue")
      .where("status", "==", "completed")
      .where("createdAt", "<", thirtyDaysAgo)
      .limit(100)
      .get();

    let deleted = 0;
    for (const doc of oldTasks.docs) {
      await doc.ref.delete();
      deleted++;
    }

    functions.logger.info(
      `[RETRY_CLEANUP] Deleted ${deleted} old completed tasks`
    );

    return deleted;
  });

/**
 * Manually retry a specific task
 */
export async function manuallyRetryTask(taskId: string): Promise<void> {
  const db = admin.firestore();
  const taskRef = db.collection("retry_queue").doc(taskId);

  await taskRef.update({
    status: "pending",
    nextRetryAt: new Date(),
    attempt: 0, // Reset attempt counter
  });

  functions.logger.info(`[RETRY] Task manually reset for retry`, { taskId });
}

/**
 * Get retry task status
 */
export async function getRetryTaskStatus(taskId: string): Promise<RetryableTask | null> {
  const db = admin.firestore();
  const doc = await db.collection("retry_queue").doc(taskId).get();

  return doc.exists ? (doc.data() as RetryableTask) : null;
}

/**
 * Get dead letter queue tasks
 */
export async function getDeadLetterTasks(
  limit: number = 50
): Promise<RetryableTask[]> {
  const db = admin.firestore();
  const tasks = await db
    .collection("dead_letter_queue")
    .orderBy("movedAt", "desc")
    .limit(limit)
    .get();

  return tasks.docs.map((doc) => doc.data() as RetryableTask);
}
