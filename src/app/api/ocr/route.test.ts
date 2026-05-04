import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { getAuthUser } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    text: JSON.stringify({
      merchant: 'Gemini Store',
      total: 42.00,
      date: '2026-05-04',
    }),
  });

  const mockModels = {
    generateContent: mockGenerateContent,
  };

  return {
    GoogleGenAI: vi.fn().mockImplementation(function() {
      return {
        models: mockModels,
      };
    }),
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      ARRAY: 'ARRAY',
    },
  };
});

describe('OCR API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if unauthorized', async () => {
    (getAuthUser as any).mockResolvedValue(null);
    const req = new Request('http://localhost/api/ocr', {
      method: 'POST',
      body: JSON.stringify({ rawText: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 400 if no rawText provided', async () => {
    (getAuthUser as any).mockResolvedValue({ userId: '1', householdId: 'h1' });
    const req = new Request('http://localhost/api/ocr', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should parse receipt successfully with AI', async () => {
    (getAuthUser as any).mockResolvedValue({ userId: '1', householdId: 'h1' });
    const req = new Request('http://localhost/api/ocr', {
      method: 'POST',
      body: JSON.stringify({ rawText: 'Parsed this text' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.merchant).toBe('Gemini Store');
    expect(data.data.total).toBe(42);
  });

  it('should return 500 if AI fails', async () => {
    (getAuthUser as any).mockResolvedValue({ userId: '1', householdId: 'h1' });
    
    // Trigger failure by making mockGenerateContent throw or return empty
    const { GoogleGenAI } = await import('@google/genai');
    const aiInstance = new GoogleGenAI({ apiKey: 'test' });
    (aiInstance.models.generateContent as any).mockRejectedValue(new Error('AI Error'));

    const req = new Request('http://localhost/api/ocr', {
      method: 'POST',
      body: JSON.stringify({ rawText: 'Parsed this text' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});
