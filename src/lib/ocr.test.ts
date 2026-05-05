import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseReceiptImage, isOcrSupported } from './ocr';

// Mock Tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: 'Mocked Receipt Text',
        confidence: 90,
      },
    }),
    terminate: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('parseReceiptImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract text with Tesseract and parse with AI', async () => {
    const mockFile = new File([''], 'receipt.jpg', { type: 'image/jpeg' });
    const mockAiResponse = {
      success: true,
      data: {
        merchant: 'Test Store',
        total: 25.50,
        date: '2026-05-04',
        items: [{ description: 'Item 1', price: 25.50 }],
      },
    };

    (global.fetch as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAiResponse),
    });

    const result = await parseReceiptImage(mockFile);

    expect(result.rawText).toBe('Mocked Receipt Text');
    expect(result.merchant).toBe('Test Store');
    expect(result.total).toBe(25.50);
    expect(result.date).toBe('2026-05-04');
    expect(global.fetch).toHaveBeenCalledWith('/api/ocr', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ rawText: 'Mocked Receipt Text' }),
    }));
  });

  it('should return raw text if AI parsing fails', async () => {
    const mockFile = new File([''], 'receipt.jpg', { type: 'image/jpeg' });

    (global.fetch as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).mockResolvedValue({
      ok: false,
    });

    const result = await parseReceiptImage(mockFile);

    expect(result.rawText).toBe('Mocked Receipt Text');
    expect(result.merchant).toBeUndefined();
    expect(result.total).toBeUndefined();
  });

  it('should handle network errors gracefully', async () => {
    const mockFile = new File([''], 'receipt.jpg', { type: 'image/jpeg' });

    (global.fetch as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).mockRejectedValue(new Error('Network error'));

    const result = await parseReceiptImage(mockFile);

    expect(result.rawText).toBe('Mocked Receipt Text');
    expect(result.merchant).toBeUndefined();
  });
});

describe('isOcrSupported', () => {
    it('should return true if window and WebAssembly exist', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        global.window = { WebAssembly: {} } as any;
        expect(isOcrSupported()).toBe(true);
    });

    it('should return false if window is undefined', () => {
        const originalWindow = global.window;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (global as any).window;
        expect(isOcrSupported()).toBe(false);
        global.window = originalWindow;
    });
});
