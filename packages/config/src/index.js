"use strict";
/**
 * @sierra-estates/config - Shared configuration & system constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIERRA_CONFIG = void 0;
exports.SIERRA_CONFIG = {
    appName: 'Sierra Estates',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://sierra-estates.net',
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co',
        storageBuckets: {
            media: 'media',
            propertyMedia: 'property-media',
            salesKits: 'sales-kits',
        },
    },
    whatsapp: {
        gatewayPort: 2785,
        runnerPort: 2786,
        flagshipLine: '201092048333',
        timezone: 'Africa/Cairo',
        activeHours: '9-22',
        slotBatchSize: 25,
    },
    ai: {
        defaultModel: 'gemini-2.5-pro',
        fastModel: 'gemini-2.5-flash',
    },
};
exports.default = exports.SIERRA_CONFIG;
