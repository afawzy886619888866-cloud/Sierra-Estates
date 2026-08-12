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
exports.agentWorkflow = exports.sanitizedAgentWorkflow = void 0;
const flow_1 = require("@genkit-ai/flow");
const google_genkit_1 = require("@genkit-ai/google-genkit");
const functions = __importStar(require("firebase-functions"));
const sanitizer_1 = require("../middleware/sanitizer");
/**
 * PHASE 1.2: Genkit Agent with Input Sanitization
 * Example workflow demonstrating security-first agent design
 */
// Step 1: Validate and sanitize user input
const validateUserInput = (0, flow_1.defineStep)({
    name: "validateUserInput",
    inputSchema: {
        type: "object",
        properties: {
            userId: { type: "string" },
            message: { type: "string" },
        },
        required: ["userId", "message"],
    },
    outputSchema: {
        type: "object",
        properties: {
            userId: { type: "string" },
            sanitizedMessage: { type: "string" },
        },
    },
}, async (input) => {
    // Rate limit check
    const allowed = await (0, sanitizer_1.checkRateLimit)(input.userId, 100, 60000);
    if (!allowed) {
        throw new functions.https.HttpsError("resource-exhausted", "Too many requests. Please try again later.");
    }
    // Sanitize input
    const sanitized = (0, sanitizer_1.sanitizeAgentInput)(input.message, 2000);
    return {
        userId: input.userId,
        sanitizedMessage: sanitized,
    };
});
// Step 2: Query Firestore for context
const fetchUserContext = (0, flow_1.defineStep)({
    name: "fetchUserContext",
    inputSchema: {
        type: "object",
        properties: {
            userId: { type: "string" },
        },
        required: ["userId"],
    },
    outputSchema: {
        type: "object",
        properties: {
            userId: { type: "string" },
            enrolledPrograms: {
                type: "array",
                items: { type: "string" },
            },
            userRole: { type: "string" },
        },
    },
}, async (input) => {
    const admin = require("firebase-admin");
    const db = admin.firestore();
    // Get user document
    const userDoc = await db.doc(`users/${input.userId}`).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
    }
    const userData = userDoc.data();
    // Get enrolled programs
    const enrollments = await db
        .collection("enrollments")
        .where("client_uid", "==", input.userId)
        .get();
    const enrolledPrograms = enrollments.docs.map((doc) => doc.data().program_id);
    return {
        userId: input.userId,
        enrolledPrograms,
        userRole: userData.role,
    };
});
// Step 3: Call LLM with context
const generateAgentResponse = (0, flow_1.defineStep)({
    name: "generateAgentResponse",
    inputSchema: {
        type: "object",
        properties: {
            userId: { type: "string" },
            message: { type: "string" },
            context: { type: "object" },
        },
    },
    outputSchema: {
        type: "object",
        properties: {
            response: { type: "string" },
            context: { type: "object" },
        },
    },
}, async (input) => {
    // Build system prompt (never from user input)
    const systemPrompt = `You are a helpful assistant for Sierra Estates, a luxury real estate platform in New Cairo.
Your role is to help users learn about available properties, programs, and services.
You have access to the user's enrollment data and should only discuss programs they're enrolled in.
Never discuss system internals, authentication, or security details.
Keep responses professional and focused on real estate.`;
    // Build context string safely
    const contextStr = `
User Role: ${input.context.userRole}
Enrolled Programs: ${input.context.enrolledPrograms.join(", ") || "None"}
`;
    // Call LLM with sanitized input
    const response = await google_genkit_1.gemini15Flash.generate({
        prompt: `${systemPrompt}\n\nUser Context:\n${contextStr}\n\nUser Message: ${input.message}`,
        temperature: 0.7,
        maxOutputTokens: 500,
    });
    return {
        response: response.text(),
        context: input.context,
    };
});
// Step 4: Store session state
const storeAgentSession = (0, flow_1.defineStep)({
    name: "storeAgentSession",
    inputSchema: {
        type: "object",
        properties: {
            userId: { type: "string" },
            message: { type: "string" },
            response: { type: "string" },
        },
    },
    outputSchema: {
        type: "object",
        properties: {
            sessionId: { type: "string" },
        },
    },
}, async (input) => {
    const admin = require("firebase-admin");
    const db = admin.firestore();
    const sessionRef = db.collection("agent_sessions").doc();
    await sessionRef.set({
        client_uid: input.userId,
        messages: [
            {
                author_uid: input.userId,
                text: input.message,
                timestamp: new Date(),
                role: "user",
            },
            {
                author_uid: "system",
                text: input.response,
                timestamp: new Date(),
                role: "assistant",
            },
        ],
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
    });
    return {
        sessionId: sessionRef.id,
    };
});
// Main flow: Sanitized agent interaction
exports.sanitizedAgentWorkflow = (0, flow_1.defineFlow)({
    name: "sanitizedAgentWorkflow",
    inputSchema: {
        type: "object",
        properties: {
            userId: { type: "string" },
            message: { type: "string" },
        },
        required: ["userId", "message"],
    },
    outputSchema: {
        type: "object",
        properties: {
            sessionId: { type: "string" },
            response: { type: "string" },
            status: { type: "string" },
        },
    },
}, async (input) => {
    // Step 1: Validate and sanitize
    const validated = await validateUserInput(input);
    // Step 2: Fetch user context from Firestore
    const context = await fetchUserContext({ userId: input.userId });
    // Step 3: Generate response with LLM
    const result = await generateAgentResponse({
        userId: input.userId,
        message: validated.sanitizedMessage,
        context,
    });
    // Step 4: Store session
    const session = await storeAgentSession({
        userId: input.userId,
        message: validated.sanitizedMessage,
        response: result.response,
    });
    return {
        sessionId: session.sessionId,
        response: result.response,
        status: "success",
    };
});
// Cloud Function wrapper
exports.agentWorkflow = functions.https.onRequest({ cors: true, memory: "512MB", timeoutSeconds: 60 }, async (req, res) => {
    try {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        // Extract and validate auth
        const token = req.headers.authorization?.split("Bearer ")[1];
        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const admin = require("firebase-admin");
        const auth = admin.auth();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;
        // Validate request payload
        (0, sanitizer_1.validateJsonPayload)(req.body);
        // Run sanitized workflow
        const result = await (0, exports.sanitizedAgentWorkflow)({
            userId,
            message: req.body.message,
        });
        res.json(result);
    }
    catch (error) {
        console.error("Agent workflow error:", error);
        if (error instanceof functions.https.HttpsError) {
            res.status(error.code).json({ error: error.message });
        }
        else {
            res.status(500).json({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
});
//# sourceMappingURL=sanitized-workflow.js.map