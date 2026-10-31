/**
 * @sierra-estates/config - Shared configuration & system constants
 */
export declare const SIERRA_CONFIG: {
    readonly appName: "Sierra Estates";
    readonly appUrl: any;
    readonly supabase: {
        readonly url: any;
        readonly storageBuckets: {
            readonly media: "media";
            readonly propertyMedia: "property-media";
            readonly salesKits: "sales-kits";
        };
    };
    readonly whatsapp: {
        readonly gatewayPort: 2785;
        readonly runnerPort: 2786;
        readonly flagshipLine: "201092048333";
        readonly timezone: "Africa/Cairo";
        readonly activeHours: "9-22";
        readonly slotBatchSize: 25;
    };
    readonly ai: {
        readonly defaultModel: "gemini-2.5-pro";
        readonly fastModel: "gemini-2.5-flash";
    };
};
export default SIERRA_CONFIG;
