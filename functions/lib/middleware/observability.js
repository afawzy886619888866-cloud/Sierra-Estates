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
exports.ALERT_POLICIES = exports.httpErrorCounter = exports.httpRequestDuration = exports.authFailureCounter = exports.authSuccessCounter = exports.firestoreDuration = exports.firestoreWriteCounter = exports.firestoreReadCounter = exports.agentWorkflowDuration = exports.agentWorkflowErrors = exports.agentWorkflowCounter = exports.otelSDK = void 0;
exports.initializeObservability = initializeObservability;
exports.traceOperation = traceOperation;
exports.httpTracingMiddleware = httpTracingMiddleware;
exports.shutdownObservability = shutdownObservability;
const functions = __importStar(require("firebase-functions"));
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const trace_agent_1 = require("@google-cloud/trace-agent");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const opentelemetry_cloud_monitoring_exporter_1 = require("@google-cloud/opentelemetry-cloud-monitoring-exporter");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const opentelemetry_cloud_logging_exporter_1 = require("@google-cloud/opentelemetry-cloud-logging-exporter");
/**
 * PHASE 1.4: OpenTelemetry Observability Stack
 * Distributed tracing, metrics, and logging for Sierra Estates backend
 */
// Initialize Cloud Trace
const traceExporter = new trace_agent_1.TraceExporter();
// Initialize Cloud Monitoring
const metricExporter = new opentelemetry_cloud_monitoring_exporter_1.GoogleCloudMetricExporter();
const metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
    exporter: metricExporter,
    intervalMillis: 60000, // Export every 60 seconds
});
// Initialize Cloud Logging
const logsExporter = new opentelemetry_cloud_logging_exporter_1.GoogleCloudLogsExporter();
const loggerProvider = new sdk_logs_1.LoggerProvider();
loggerProvider.addLogRecordProcessor(new sdk_logs_1.BatchLogRecordProcessor(logsExporter));
// Create OpenTelemetry SDK
exports.otelSDK = new sdk_node_1.NodeSDK({
    traceExporter,
    metricReaders: [metricReader],
    loggerProvider,
    instrumentations: [
        ...(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
            "@opentelemetry/instrumentation-fs": {
                enabled: false, // Disable FS instrumentation (too noisy)
            },
        }),
    ],
});
/**
 * Initialize observability on startup
 */
async function initializeObservability() {
    try {
        await exports.otelSDK.start();
        functions.logger.info("[OTEL] OpenTelemetry SDK started successfully");
    }
    catch (error) {
        functions.logger.error("[OTEL] Failed to start OpenTelemetry", error);
    }
}
/**
 * Custom metrics for Sierra Estates
 */
const api_1 = require("@opentelemetry/api");
const meter = api_1.metrics.getMeter("sierra-estates-backend", "1.0.0");
// Agent workflow metrics
exports.agentWorkflowCounter = meter.createCounter("agent_workflow_total", {
    description: "Total agent workflow requests",
});
exports.agentWorkflowErrors = meter.createCounter("agent_workflow_errors_total", {
    description: "Total agent workflow errors",
});
exports.agentWorkflowDuration = meter.createHistogram("agent_workflow_duration_ms", {
    description: "Agent workflow execution time in milliseconds",
});
// Database metrics
exports.firestoreReadCounter = meter.createCounter("firestore_reads_total", {
    description: "Total Firestore read operations",
});
exports.firestoreWriteCounter = meter.createCounter("firestore_writes_total", {
    description: "Total Firestore write operations",
});
exports.firestoreDuration = meter.createHistogram("firestore_operation_duration_ms", {
    description: "Firestore operation latency in milliseconds",
});
// Authentication metrics
exports.authSuccessCounter = meter.createCounter("auth_success_total", {
    description: "Successful authentications",
});
exports.authFailureCounter = meter.createCounter("auth_failures_total", {
    description: "Failed authentications",
});
// HTTP request metrics
exports.httpRequestDuration = meter.createHistogram("http_request_duration_ms", {
    description: "HTTP request latency in milliseconds",
});
exports.httpErrorCounter = meter.createCounter("http_errors_total", {
    description: "Total HTTP errors",
});
/**
 * Trace helper for measuring operation duration
 */
async function traceOperation(operationName, operation, attributes) {
    const tracer = api_1.metrics.getTracer("sierra-estates");
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
    }
    catch (error) {
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
function httpTracingMiddleware(req, res, next) {
    const startTime = Date.now();
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        // Record metrics
        exports.httpRequestDuration.record(duration, {
            method: req.method,
            endpoint: req.path,
            status: statusCode.toString(),
        });
        if (statusCode >= 400) {
            exports.httpErrorCounter.add(1, {
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
exports.ALERT_POLICIES = {
    // Alert on high error rate
    highErrorRate: {
        displayName: "Agent Workflow Error Rate > 5%",
        conditions: [
            {
                displayName: "Error rate spike",
                conditionThreshold: {
                    filter: 'resource.type="cloud_function" AND metric.type="custom.googleapis.com/agent_workflow_errors_total"',
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
                    filter: 'resource.type="cloud_function" AND metric.type="custom.googleapis.com/agent_workflow_duration_ms"',
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
                filter: 'resource.type="cloud_firestore_database" AND metric.type="firestore.googleapis.com/document/count"',
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
                filter: 'resource.type="cloud_function" AND metric.type="custom.googleapis.com/auth_failures_total"',
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
async function shutdownObservability() {
    try {
        await exports.otelSDK.shutdown();
        functions.logger.info("[OTEL] OpenTelemetry SDK shut down successfully");
    }
    catch (error) {
        functions.logger.error("[OTEL] Error during OpenTelemetry shutdown", error);
    }
}
//# sourceMappingURL=observability.js.map