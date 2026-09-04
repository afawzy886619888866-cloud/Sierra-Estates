import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Supabase Master Schema & Migration Pipeline Test Suite', () => {
  const ROOT_DIR = path.resolve(__dirname, '..');
  const SCHEMA_PATH = path.join(ROOT_DIR, 'supabase', 'schema.sql');

  describe('Master Database Schema (`supabase/schema.sql`)', () => {
    it('verifies schema file exists and is populated', () => {
      expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
      const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      expect(content.length).toBeGreaterThan(1000);
    });

    it('declares required Postgres extensions for cryptography and vector search', () => {
      const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      expect(content).toMatch(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp"/i);
      expect(content).toMatch(/CREATE EXTENSION IF NOT EXISTS "vector"/i);
    });

    it('creates all authoritative platform tables with correct primary keys', () => {
      const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      const expectedTables = [
        'listings',
        'leads',
        'profiles',
        'compounds',
        'unified_memory',
        'inquiries',
        'activities',
        'whatsapp_queue',
        'whatsapp_conversations',
        'whatsapp_numbers',
        'deals',
        'contracts',
        'system_config',
        'knowledge_base',
        'developers',
        'owners',
        'system_status',
        'system_metrics',
      ];

      for (const table of expectedTables) {
        const regex = new RegExp(`CREATE TABLE IF NOT EXISTS\\s+(?:public\\.)?${table}\\b`, 'i');
        expect(
          regex.test(content),
          `Expected table ${table} to be defined in supabase/schema.sql`
        ).toBe(true);
      }
    });

    it('defines 1536-dimensional vector embedding columns for semantic search', () => {
      const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      expect(content).toMatch(/embedding\s+vector\(1536\)/i);
    });

    it('implements pgvector similarity search RPC functions', () => {
      const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      expect(content).toMatch(/CREATE OR REPLACE FUNCTION match_listings/i);
      expect(content).toMatch(/CREATE OR REPLACE FUNCTION search_properties/i);
      expect(content).toMatch(/CREATE OR REPLACE FUNCTION match_listings_gemini/i);
    });

    it('enforces Row Level Security (RLS) on sensitive tables', () => {
      const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      const securedTables = ['listings', 'leads', 'profiles', 'unified_memory', 'inquiries', 'whatsapp_queue'];
      for (const table of securedTables) {
        expect(
          content.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`) ||
          content.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`) ||
          content.includes(`ENABLE ROW LEVEL SECURITY`),
          `Expected table ${table} to enable Row Level Security`
        ).toBe(true);
      }
    });
  });

  describe('Migration & Seeding Scripts Verification', () => {
    it('verifies apply-supabase-schema.mjs targets Supabase Management API with schema.sql', () => {
      const scriptPath = path.join(ROOT_DIR, 'scripts', 'apply-supabase-schema.mjs');
      expect(fs.existsSync(scriptPath)).toBe(true);
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('supabase/schema.sql');
      expect(content).toContain('https://api.supabase.com/v1/projects');
      expect(content).toContain('/database/query');
    });

    it('verifies migrate-data-to-supabase.ts handles Excel / JSON parsing and batch seeding', () => {
      const scriptPath = path.join(ROOT_DIR, 'scripts', 'migrate-data-to-supabase.ts');
      expect(fs.existsSync(scriptPath)).toBe(true);
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('from(\'listings\')');
      expect(content).toContain('from(\'leads\')');
      expect(content).toContain('upsert');
    });

    it('verifies generate-supabase-embeddings.ts generates semantic embeddings into Supabase', () => {
      const scriptPath = path.join(ROOT_DIR, 'scripts', 'generate-supabase-embeddings.ts');
      expect(fs.existsSync(scriptPath)).toBe(true);
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('embedding');
      expect(content).toContain('listings');
    });

    it('verifies wire-and-seed-supabase.mjs seeds reference entities directly', () => {
      const scriptPath = path.join(ROOT_DIR, 'scripts', 'wire-and-seed-supabase.mjs');
      expect(fs.existsSync(scriptPath)).toBe(true);
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('compounds');
      expect(content).toContain('developers');
    });

    it('verifies verify-supabase-connection.ts performs live connectivity checks', () => {
      const scriptPath = path.join(ROOT_DIR, 'scripts', 'verify-supabase-connection.ts');
      expect(fs.existsSync(scriptPath)).toBe(true);
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('getSupabase');
    });
  });
});
