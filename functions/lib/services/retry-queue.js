"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupRetryQueue = exports.processRetryQueue = void 0;
exports.enqueueRetryTask = enqueueRetryTask;
exports.processRetryTask = processRetryTask;
exports.manuallyRetryTask = manuallyRetryTask;
exports.getRetryTaskStatus = getRetryTaskStatus;
exports.getDeadLetterTasks = getDeadLetterTasks;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const uuid_1 = require("uuid");
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BACKOFF_MS = 1000; // 1 second
const MAX_BACKOFF_MS = 600000; // 10 minutes
/**
 * Enqueue a task for retry with exponential backoff
 */
async function enqueueRetryTask(type, payload, maxRetries = DEFAULT_MAX_RETRIES, backoffMs = DEFAULT_BACKOFF_MS) {
    const db = admin.firestore();
    const taskId = (0, uuid_1.v4)();
    const task = {
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
    await topic.publish(Buffer.from(JSON.stringify({
        taskId,
        type,
    })));
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
async function processRetryTask(taskId) {
    const db = admin.firestore();
    const taskRef = db.collection("retry_queue").doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
        functions.logger.error(`[RETRY] Task not found`, { taskId });
        return;
    }
    const task = taskDoc.data();
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
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        // Check if we should retry
        if (task.attempt < task.maxRetries) {
            const nextBackoff = Math.min(task.backoffMs * Math.pow(2, task.attempt), MAX_BACKOFF_MS);
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
        }
        else {
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
async function processAgentWorkflow(task) {
    const { userId, message, sessionId } = task.payload;
    // Call agent workflow endpoint
    const response = await fetch(`${process.env.AGENT_ENDPOINT}/agentWorkflow`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.FIREBASE_ADMIN_TOKEN}`,
        },
        body: JSON.stringify({
            userId,
            message,
        }),
    });
    if (!response.ok) {
        throw new Error(`Agent workflow failed with status ${response.status}: ${response.statusText}`);
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
async function processEmailTask(task) {
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
        throw new Error(`Email service failed with status ${response.status}`);
    }
}
/**
 * Process data sync task
 */
async function processDataSync(task) {
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
async function notifyDeadLetterQueue(taskId, task, error) {
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
exports.processRetryQueue = functions.pubsub
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
    functions.logger.info(`[RETRY_QUEUE] Processing ${pendingTasks.size} pending tasks`);
    for (const doc of pendingTasks.docs) {
        await processRetryTask(doc.id);
    }
    return pendingTasks.size;
});
/**
 * Cloud Scheduler job to clean up old completed tasks
 * Run daily to prevent queue from growing indefinitely
 */
exports.cleanupRetryQueue = functions.pubsub
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
    functions.logger.info(`[RETRY_CLEANUP] Deleted ${deleted} old completed tasks`);
    return deleted;
});
/**
 * Manually retry a specific task
 */
async function manuallyRetryTask(taskId) {
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
async function getRetryTaskStatus(taskId) {
    const db = admin.firestore();
    const doc = await db.collection("retry_queue").doc(taskId).get();
    return doc.exists ? doc.data() : null;
}
/**
 * Get dead letter queue tasks
 */
async function getDeadLetterTasks(limit = 50) {
    const db = admin.firestore();
    const tasks = await db
        .collection("dead_letter_queue")
        .orderBy("movedAt", "desc")
        .limit(limit)
        .get();
    return tasks.docs.map((doc) => doc.data());
}
//# sourceMappingURL=retry-queue.js.map