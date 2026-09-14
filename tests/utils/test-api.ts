import { NextRequest } from 'next/server';
import { expect } from 'vitest';

// Mock user for testing
export const createMockUser = (overrides: Partial<{
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
}> = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: null,
  createdAt: new Date(),
  ...overrides,
});

// Mock NextRequest helper
export function createMockRequest(
  body: unknown,
  options: { method?: string; headers?: Record<string, string> } = {}
): NextRequest {
  const { method = 'POST', headers = {} } = options;
  return new NextRequest('http://localhost:3000/api/test', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// Mock GET request with query params
export function createMockGetRequest(
  url: string,
  options: { headers?: Record<string, string> } = {}
): NextRequest {
  const { headers = {} } = options;
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

// Response helpers
export async function expectJsonResponse(
  response: Response,
  expectedStatus: number,
  expectedBody?: Record<string, unknown>
) {
  expect(response.status).toBe(expectedStatus);
  const body = await response.json();
  if (expectedBody) {
    expect(body).toMatchObject(expectedBody);
  }
  return body;
}

export async function expectErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedError?: string
) {
  expect(response.status).toBe(expectedStatus);
  const body = await response.json();
  expect(body).toHaveProperty('error');
  if (expectedError) {
    expect(body.error).toBe(expectedError);
  }
  return body;
}