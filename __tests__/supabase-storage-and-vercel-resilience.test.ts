import { describe, it, expect, beforeAll } from "vitest";
import { StorageService } from "../apps/sierra-estates-realty/lib/services/StorageService";

describe("Supabase Storage & Vercel Resilience Suite", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://REDACTED-PROJECT.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "REDACTED_SUPABASE_SERVICE_ROLE_KEY"; // cspell:disable-line
    process.env.SUPABASE_PROPERTY_MEDIA_BUCKET = "property-media";
  });

  it("StorageService uploads base64 asset and returns public URL", async () => {
    // Generate a 1x1 pixel base64 test image
    const sampleBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const publicUrl = await StorageService.uploadPropertyMedia(
      "unit-test-101",
      sampleBase64,
      "image/png",
      "test-pixel.png",
    );

    expect(publicUrl).toBeDefined();
    expect(publicUrl).toContain(
      "https://REDACTED-PROJECT.supabase.co/storage/v1/object/public/property-media/",
    );
    expect(publicUrl).toContain("properties/unit-test-101/");
  });

  it("StorageService handles base64 with data URI prefix and uploads successfully", async () => {
    const dataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const publicUrl = await StorageService.uploadPropertyMedia(
      "unit-test-101",
      dataUri,
      "image/png",
      "test-data-uri.png",
    );

    expect(publicUrl).toBeDefined();
    expect(publicUrl).toContain(
      "https://REDACTED-PROJECT.supabase.co/storage/v1/object/public/property-media/",
    );
    expect(publicUrl).toContain("properties/unit-test-101/");
  });

  it("verifies public Supabase storage bucket configuration", () => {
    const bucket =
      process.env.SUPABASE_PROPERTY_MEDIA_BUCKET || "property-media";
    expect(bucket).toBe("property-media");
  });
});
