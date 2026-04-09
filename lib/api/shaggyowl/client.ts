import type { ApiResult } from './types';

export interface RequestConfig {
  method: 'GET' | 'POST';
  endpoint: string;
  body?: Record<string, unknown>;
  retries?: number;
  retryDelay?: number;
}

const BASE_URL = process.env.SHAGGYOWL_BASE_URL;

if (!BASE_URL) {
  throw new Error('SHAGGYOWL_BASE_URL environment variable not set');
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function shaggyOwlClient<T>(
  config: RequestConfig
): Promise<ApiResult<T>> {
  const { method, endpoint, body, retries = 3, retryDelay = 1000 } = config;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        // Log response for debugging
        const text = await response.text();
        console.error(`API Error ${response.status}:`, text.substring(0, 200));
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      console.log('API Response:', text.substring(0, 500));

      // Try to parse as JSON
      try {
        const data = JSON.parse(text);
        return { success: true, data: data as T };
      } catch {
        throw new Error(`Unexpected token '<', " ${text.substring(0, 50)}"... is not valid JSON`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry on last attempt
      if (attempt < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await delay(retryDelay * Math.pow(2, attempt));
      }
    }
  }

  return {
    success: false,
    error: `Failed after ${retries} attempts: ${lastError?.message}`,
  };
}
