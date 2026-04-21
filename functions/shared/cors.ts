import { HttpRequest, HttpResponseInit } from '@azure/functions';

/**
 * Get allowed origins from environment variable
 */
function getAllowedOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS || '';
  return corsOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
}

/**
 * Set CORS headers for HTTP response
 */
export function setCorsHeaders(request: HttpRequest, response: HttpResponseInit): void {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = request.headers.get('origin');

  // Set appropriate Access-Control-Allow-Origin header
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': requestOrigin
    };
  } else if (allowedOrigins.length === 1) {
    // If only one origin is configured, use it directly
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': allowedOrigins[0]
    };
  }

  // Set other CORS headers
  response.headers = {
    ...response.headers,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400' // 24 hours
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreFlight(request: HttpRequest): HttpResponseInit | null {
  if (request.method === 'OPTIONS') {
    const response: HttpResponseInit = {
      status: 200,
      headers: {}
    };
    setCorsHeaders(request, response);
    return response;
  }
  return null;
}