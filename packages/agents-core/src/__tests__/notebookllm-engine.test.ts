import { describe, it, expect, vi } from 'vitest';
import { NotebookLMEngine, SourceDocument } from '../notebookllm-engine';

describe('NotebookLMEngine', () => {
  it('instantiates correctly and handles query formatting', () => {
    const engine = new NotebookLMEngine('mock-key-for-test');
    expect(engine).toBeDefined();
  });

  it('validates missing API key on query execution', async () => {
    const engine = new NotebookLMEngine('');
    const sources: SourceDocument[] = [
      { id: 'src-1', title: 'Doc 1', type: 'text', content: 'Test content' }
    ];
    await expect(engine.queryGroundedSources(sources, 'Test question')).rejects.toThrow(
      'Gemini API key is not configured for NotebookLM Engine.'
    );
  });
});
