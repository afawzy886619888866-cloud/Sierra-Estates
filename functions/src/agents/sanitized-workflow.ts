import { defineFlow, defineStep } from "@genkit-ai/flow";
import { gemini15Flash } from "@genkit-ai/google-genkit";
import * as functions from "firebase-functions";
import {
  sanitizeAgentInput,
  checkRateLimit,
  validateJsonPayload,
} from "../middleware/sanitizer";

/**
 * PHASE 1.2: Genkit Agent with Input Sanitization
 * Example workflow demonstrating security-first agent design
 */

// Step 1: Validate and sanitize user input
const validateUserInput = defineStep(
  {
    name: "validateUserInput",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        message: { type: "string" },
      },
      required: ["userId", "message"],
    } as any,
    outputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        sanitizedMessage: { type: "string" },
      },
    } as any,
  },
  async (input: { userId: string; message: string }) => {
    // Rate limit check
    const allowed = await checkRateLimit(input.userId, 100, 60000);
    if (!allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Too many requests. Please try again later."
      );
    }

    // Sanitize input
    const sanitized = sanitizeAgentInput(input.message, 2000);

    return {
      userId: input.userId,
      sanitizedMessage: sanitized,
    };
  }
);

// Step 2: Query Firestore for context
const fetchUserContext = defineStep(
  {
    name: "fetchUserContext",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
      },
      required: ["userId"],
    } as any,
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
    } as any,
  },
  async (input: { userId: string }) => {
    const admin = require("firebase-admin");
    const db = admin.firestore();

    // Get user document
    const userDoc = await db.doc(`users/${input.userId}`).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "User not found"
      );
    }

    const userData = userDoc.data();

    // Get enrolled programs
    const enrollments = await db
      .collection("enrollments")
      .where("client_uid", "==", input.userId)
      .get();

    const enrolledPrograms = enrollments.docs.map(
      (doc: any) => doc.data().program_id
    );

    return {
      userId: input.userId,
      enrolledPrograms,
      userRole: userData.role,
    };
  }
);

// Step 3: Call LLM with context
const generateAgentResponse = defineStep(
  {
    name: "generateAgentResponse",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        message: { type: "string" },
        context: { type: "object" },
      },
    } as any,
    outputSchema: {
      type: "object",
      properties: {
        response: { type: "string" },
        context: { type: "object" },
      },
    } as any,
  },
  async (input: any) => {
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
    const response = await gemini15Flash.generate({
      prompt: `${systemPrompt}\n\nUser Context:\n${contextStr}\n\nUser Message: ${input.message}`,
      temperature: 0.7,
      maxOutputTokens: 500,
    });

    return {
      response: response.text(),
      context: input.context,
    };
  }
);

// Step 4: Store session state
const storeAgentSession = defineStep(
  {
    name: "storeAgentSession",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        message: { type: "string" },
        response: { type: "string" },
      },
    } as any,
    outputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
      },
    } as any,
  },
  async (input: any) => {
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
  }
);

// Main flow: Sanitized agent interaction
export const sanitizedAgentWorkflow = defineFlow(
  {
    name: "sanitizedAgentWorkflow",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        message: { type: "string" },
      },
      required: ["userId", "message"],
    } as any,
    outputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        response: { type: "string" },
        status: { type: "string" },
      },
    } as any,
  },
  async (input: { userId: string; message: string }) => {
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
  }
);

// Cloud Function wrapper
export const agentWorkflow = functions.https.onRequest(
  { cors: true, memory: "512MB", timeoutSeconds: 60 },
  async (req, res) => {
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
      validateJsonPayload(req.body);

      // Run sanitized workflow
      const result = await sanitizedAgentWorkflow({
        userId,
        message: req.body.message,
      });

      res.json(result);
    } catch (error) {
      console.error("Agent workflow error:", error);

      if (error instanceof functions.https.HttpsError) {
        res.status(error.code as any).json({ error: error.message });
      } else {
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }
);
