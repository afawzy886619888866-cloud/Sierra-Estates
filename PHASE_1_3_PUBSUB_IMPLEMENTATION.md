# Phase 1.3: Pub/Sub Retry Queue Implementation

## Overview

Production-grade retry system with exponential backoff, dead letter queue, and manual intervention capabilities.

## Key Features

### 1. Exponential Backoff

```
Attempt 1: 1 second delay
Attempt 2: 2 seconds delay
Attempt 3: 4 seconds delay
Attempt 4: 8 seconds delay
Attempt 5: 16 seconds delay
Max: 10 minutes (prevents runaway retries)
```

### 2. Dead Letter Queue

Failed tasks (after 5 retries) moved to dead letter collection for manual investigation:

- Stores full error context
- Timestamp of failure
- All retry attempts logged
- Ops team can manually reset

### 3. Task Types Supported

- `agent_workflow` - AI agent interactions
- `email` - Transactional emails
- `data_sync` - Background data synchronization

### 4. Automatic Cleanup

- Completed tasks deleted after 30 days
- Prevents Firestore collection bloat
- Runs via Cloud Scheduler daily

## Firestore Schema

```
retry_queue/{taskId}
├── id: string (UUID)
├── type: "agent_workflow" | "email" | "data_sync"
├── payload: object (task-specific data)
├── status: "pending" | "processing" | "completed" | "failed" | "deadletter"
├── attempt: number (current attempt count)
├── maxRetries: number (default: 5)
├── backoffMs: number (exponential backoff in ms)
├── createdAt: timestamp
├── nextRetryAt: timestamp (when to retry)
├── lastError: string (error message from last attempt)

dead_letter_queue/{taskId}
├── (all fields from retry_queue)
├── movedAt: timestamp
├── finalError: string (error after all retries exhausted)
```

## Integration with Agent Workflow

### Before (No Retry)

```typescript
try {
  await agentWorkflow({ userId, message });
} catch (error) {
  // Task lost, agent never responds
  logger.error("Agent failed:", error);
}
```

### After (With Retry Queue)

```typescript
try {
  await agentWorkflow({ userId, message });
} catch (error) {
  // Automatically retry with exponential backoff
  await enqueueRetryTask("agent_workflow", {
    userId,
    message,
    sessionId,
  });
}
```

## Deployment Steps

### Step 1: Update firestore.indexes.json

Add index for retry queue queries:

```json
{
  "indexes": [
    {
      "collectionGroup": "retry_queue",
      "queryScope": "Collection",
      "fields": [
        { "fieldPath": "status", "order": "Ascending" },
        { "fieldPath": "nextRetryAt", "order": "Ascending" }
      ]
    }
  ]
}
```

Deploy:

```bash
firebase deploy --only firestore:indexes
```

### Step 2: Deploy Retry Queue Service

```bash
npm install uuid  # Add dependency
npm run deploy:functions
```

### Step 3: Create Cloud Scheduler Jobs

**Job 1: Process Retries (Every 1 minute)**

```bash
gcloud scheduler jobs create pubsub process-retries \
  --location=us-central1 \
  --schedule="*/1 * * * *" \
  --topic=process-retries \
  --message-body='{"action":"process"}' \
  --tz=UTC
```

**Job 2: Cleanup Queue (Daily at 2 AM)**

```bash
gcloud scheduler jobs create pubsub cleanup-retry-queue \
  --location=us-central1 \
  --schedule="0 2 * * *" \
  --topic=cleanup-retry-queue \
  --message-body='{"action":"cleanup"}' \
  --tz=UTC
```

### Step 4: Create Pub/Sub Topics

```bash
gcloud pubsub topics create agent-workflow-retry
gcloud pubsub topics create process-retries
gcloud pubsub topics create cleanup-retry-queue
```

### Step 5: Set Environment Variables

```bash
# .env.local
AGENT_ENDPOINT=https://your-region-project.cloudfunctions.net
FIREBASE_ADMIN_TOKEN=<service-account-token>
EMAIL_SERVICE_ENDPOINT=https://api.sendgrid.com
EMAIL_SERVICE_TOKEN=<sendgrid-api-key>
DATA_SYNC_ENDPOINT=https://your-sync-service.com
DATA_SYNC_TOKEN=<sync-token>
```

## Monitoring & Alerts

### Metrics to Track

1. **Queue Depth**: Number of pending tasks
2. **Retry Rate**: Tasks needing retry per hour
3. **Success Rate**: Tasks completing on first attempt
4. **Dead Letter Queue Size**: Failed tasks needing manual intervention

### CloudMonitoring Dashboard

```yaml
displayName: "Retry Queue Health"
mosaicLayout:
  columns: 12
  tiles:
    - displayName: "Pending Tasks"
      query: |
        firestore.googleapis.com/collection/retry_queue
        | {status == "pending"}
        | count()
    
    - displayName: "Dead Letter Queue Size"
      query: |
        firestore.googleapis.com/collection/dead_letter_queue
        | count()
    
    - displayName: "Retry Success Rate"
      query: |
        log.googleapis.com
        | {resource.type == "cloud_function"}
        | {jsonPayload.message =~ "RETRY.*completed"}
```

### Alert Policies

```
1. Dead Letter Queue > 10 items
   → Send alert to ops@siesta.com
   → Page on-call engineer

2. Pending Queue > 100 items
   → Check for stuck Cloud Scheduler jobs
   → Review recent errors

3. Retry Success Rate < 80%
   → Investigate failing task type
   → Review error logs
```

## Testing

### Test Case 1: Successful Retry After Transient Failure

```typescript
// Simulate temporary service outage
await enqueueRetryTask("agent_workflow", {
  userId: "test-user",
  message: "Hello",
});
// Task will retry automatically after 1s
// Should complete on second attempt
```

### Test Case 2: Dead Letter Queue After Max Retries

```typescript
// Simulate permanent service failure
await enqueueRetryTask("email", {
  to: "test@example.com",
  subject: "Test",
  body: "This service is down",
});
// Task will retry 5 times, then move to dead letter queue
```

### Test Case 3: Manual Retry from Dead Letter

```typescript
const deadLetterTasks = await getDeadLetterTasks();
for (const task of deadLetterTasks) {
  // After fixing underlying issue
  await manuallyRetryTask(task.id);
}
```

## Cost Analysis

### Firestore Operations

- **Reads**: 1 read per task per minute (while pending)
  - If 50 pending tasks: 50 reads/min = ~72k reads/month = ~$0.29
- **Writes**: 2 writes per retry (status update + backoff update)
  - If 100 retries/day: 200 writes/day = ~6k writes/month = ~$0.06

### Pub/Sub

- **Messages**: ~100 per minute = ~144k/month = Free (first 10M/month)
- **Storage**: Negligible (<1KB per task)

### Cloud Scheduler

- **Jobs**: 2 jobs running hourly + daily = ~$3/month

### Total Monthly Cost: ~$3.50

## Troubleshooting

### Dead Letter Queue Growing

**Problem**: Tasks moving to dead letter queue
**Solution**:

1. Check failed task errors: `getDeadLetterTasks()`
2. Investigate underlying service (is agent endpoint down?)
3. Fix issue, then `manuallyRetryTask()`

### Retries Taking Too Long

**Problem**: Tasks waiting >10 minutes before final failure
**Solution**: Reduce `maxRetries` or `maxBackoffMs` in configuration

### Queue Not Processing

**Problem**: Pending tasks not decreasing
**Solution**:

1. Check Cloud Scheduler jobs: `gcloud scheduler jobs list`
2. Check Pub/Sub topics have subscriptions
3. Check Cloud Functions logs for errors

## Success Metrics (Post-Deployment)

| Metric | Target | Tool |
| -------- | -------- | ------ |
| Agent Success Rate | >98% on first attempt | Cloud Logging |
| Retry Success Rate | >95% after retries | Firestore queries |
| Dead Letter Queue | <5 items/day | Monitoring dashboard |
| Avg Task Latency | <2s (with retries) | Cloud Trace |

## Phase 1.3 Completion Checklist

- [ ] Firestore indexes deployed
- [ ] Retry queue service deployed
- [ ] Cloud Scheduler jobs created
- [ ] Pub/Sub topics created
- [ ] Environment variables configured
- [ ] Monitoring dashboard created
- [ ] Alert policies configured
- [ ] Test cases executed
- [ ] Ops team trained on manual retry
- [ ] Fallback escalation documented

**Estimated Time: 1 week**  
**Critical Path**: Deploy indexes (1 day) → Cloud Scheduler (2 days) → Monitoring setup (2 days) → Testing & refinement (2 days)

---

**Next Phase**: Phase 1.4 - OpenTelemetry observability stack (1 week)
