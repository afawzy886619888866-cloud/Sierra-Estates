import * as functions from "firebase-functions";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { TraceExporter } from "@google-cloud/trace-agent";
import { MetricReader, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { GoogleCloudMetricExporter } from "@google-cloud/opentelemetry-cloud-monitoring-exporter";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { GoogleCloudLogsExporter } from "@google-cloud/opentelemetry-cloud-logging-exporter";

/**
 * PHASE 1.4: OpenTelemetry Observability Stack
 * Distributed tracing, metrics, and logging for Sierra Estates backend
 */

// Initialize Cloud Trace
const traceExporter = new TraceExporter();

// Initialize Cloud Monitoring
const metricExporter = new GoogleCloudMetricExporter();
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  intervalMillis: 60000, // Export every 60 seconds
});

// Initialize Cloud Logging
const logsExporter = new GoogleCloudLogsExporter();
const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(logsExporter)
);

// Create OpenTelemetry SDK
export const otelSDK = new NodeSDK({
  traceExporter,
  metricReaders: [metricReader],
  loggerProvider,
  instrumentations: [
    ...getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false, // Disable FS instrumentation (too noisy)
      },
    }),
  ],
});

/**
 * Initialize observability on startup
 */
export async function initializeObservability(): Promise<void> {
  try {
    await otelSDK.start();
    functions.logger.info("[OTEL] OpenTelemetry SDK started successfully");
  } catch (error) {
    functions.logger.error("[OTEL] Failed to start OpenTelemetry", error);
  }
}

/**
 * Custom metrics for Sierra Estates
 */

import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("sierra-estates-backend", "1.0.0");

// Agent workflow metrics
export const agentWorkflowCounter = meter.createCounter(
  "agent_workflow_total",
  {
    description: "Total agent workflow requests",
  }
);

export const agentWorkflowErrors = meter.createCounter(
  "agent_workflow_errors_total",
  {
    description: "Total agent workflow errors",
  }
);

export const agentWorkflowDuration = meter.createHistogram(
  "agent_workflow_duration_ms",
  {
    description: "Agent workflow execution time in milliseconds",
  }
);

// Database metrics
export const firestoreReadCounter = meter.createCounter(
  "firestore_reads_total",
  {
    description: "Total Firestore read operations",
  }
);

export const firestoreWriteCounter = meter.createCounter(
  "firestore_writes_total",
  {
    description: "Total Firestore write operations",
  }
);

export const firestoreDuration = meter.createHistogram(
  "firestore_operation_duration_ms",
  {
    description: "Firestore operation latency in milliseconds",
  }
);

// Authentication metrics
export const authSuccessCounter = meter.createCounter(
  "auth_success_total",
  {
    description: "Successful authentications",
  }
);

export const authFailureCounter = meter.createCounter(
  "auth_failures_total",
  {
    description: "Failed authentications",
  }
);

// HTTP request metrics
export const httpRequestDuration = meter.createHistogram(
  "http_request_duration_ms",
  {
    description: "HTTP request latency in milliseconds",
  }
);

export const httpErrorCounter = meter.createCounter(
  "http_errors_total",
  {
    description: "Total HTTP errors",
  }
);

/**
 * Trace helper for measuring operation duration
 */
export async function traceOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string>
): Promise<T> {
  const tracer = metrics.getTracer("sierra-estates");
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    functions.logger.info(`[TRACE] Operation completed`, {
      operation: operationName,
      duration,
      ...attributes,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    functions.logger.error(`[TRACE] Operation failed`, {
      operation: operationName,
      duration,
      error: error instanceof Error ? error.message : "Unknown error",
      ...attributes,
    });

    throw error;
  }
}

/**
 * Express middleware for automatic HTTP tracing
 */
export function httpTracingMiddleware(
  req: functions.https.Request,
  res: functions.Response,
  next: () => void
) {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Record metrics
    httpRequestDuration.record(duration, {
      method: req.method,
      endpoint: req.path,
      status: statusCode.toString(),
    });

    if (statusCode >= 400) {
      httpErrorCounter.add(1, {
        status: statusCode.toString(),
        endpoint: req.path,
      });
    }

    // Log request
    functions.logger.info(`[HTTP] Request completed`, {
      method: req.method,
      path: req.path,
      status: statusCode,
      duration,
      userAgent: req.headers["user-agent"],
    });

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Cloud Monitoring Alert Policies
 * (Create via Terraform or gcloud)
 */

export const ALERT_POLICIES = {
  // Alert on high error rate
  highErrorRate: {
    displayName: "Agent Workflow Error Rate > 5%",
    conditions: [
      {
        displayName: "Error rate spike",
        conditionThreshold: {
          filter:
            'resource.type="cloud_function" AND metric.type="custom.googleapis.com/agent_workflow_errors_total"',
          comparison: "COMPARISON_GT",
          thresholdValue: 0.05,
          duration: "60s",
        },
      },
    ],
    notificationChannels: ["ops@siesta.com"],
  },

  // Alert on high latency
  highLatency: {
    displayName: "Agent Workflow Latency > 5s",
    conditions: [
      {
        displayName: "P95 latency spike",
        conditionThreshold: {
          filter:
            'resource.type="cloud_function" AND metric.type="custom.googleapis.com/agent_workflow_duration_ms"',
          comparison: "COMPARISON_GT",
          thresholdValue: 5000, // 5 seconds
          duration: "300s",
        },
      },
    ],
    notificationChannels: ["ops@siesta.com"],
  },

  // Alert on dead letter queue growth
  deadLetterQueueGrowth: {
    displayName: "Dead Letter Queue > 10 items",
    conditions: [
      {
        displayName: "DLQ size spike",
        filter:
          'resource.type="cloud_firestore_database" AND metric.type="firestore.googleapis.com/document/count"',
        comparison: "COMPARISON_GT",
        thresholdValue: 10,
        duration: "300s",
      },
    ],
    notificationChannels: ["ops@siesta.com", "pagerduty-escalation"],
  },

  // Alert on auth failures
  authFailureRate: {
    displayName: "Authentication Failure Rate > 10%",
    conditions: [
      {
        displayName: "Auth failure spike",
        filter:
          'resource.type="cloud_function" AND metric.type="custom.googleapis.com/auth_failures_total"',
        comparison: "COMPARISON_GT",
        thresholdValue: 0.1, // 10%
        duration: "60s",
      },
    ],
    notificationChannels: ["security-team@siesta.com"],
  },
};

/**
 * Graceful shutdown
 */
export async function shutdownObservability(): Promise<void> {
  try {
    await otelSDK.shutdown();
    functions.logger.info("[OTEL] OpenTelemetry SDK shut down successfully");
  } catch (error) {
    functions.logger.error(
      "[OTEL] Error during OpenTelemetry shutdown",
      error
    );
  }
}
