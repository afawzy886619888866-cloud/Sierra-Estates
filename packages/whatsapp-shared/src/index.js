/**
 * @sierra-estates/whatsapp-shared
 * Shared WhatsApp agent utilities extracted from the legacy packages/whatsapp-agent.
 * All modules use CommonJS (require/module.exports).
 */

const brochureManager = require('./brochure-manager');
const propertyEvaluator = require('./property-evaluator');
const firebaseService = require('./firebase-service');
const emailService = require('./email-service');
const propertyMatcher = require('./property-matcher');
const memoryService = require('./memory-service');
const calendarService = require('./calendar-service');
const ViewingReminderService = require('./reminder-service');
const unifiedMemoryEngine = require('./unified-memory-engine');
const hermesAgent = require('./hermes-agent');
const { ListingManager } = require('./listing-manager');
const { ReportGenerator } = require('./report-generator');

module.exports = {
  brochureManager,
  propertyEvaluator,
  firebaseService,
  emailService,
  propertyMatcher,
  memoryService,
  calendarService,
  ViewingReminderService,
  unifiedMemoryEngine,
  hermesAgent,
  ListingManager,
  ReportGenerator,
};
