import type { NextRequest } from 'next/server';

const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1';
const INCOMING_API_KEY_HEADER = 'x-elevenlabs-api-key';
const RESPONSE_HEADER_ALLOWLIST = [
  'content-type',
  'content-disposition',
  'cache-control',
  'etag',
  'last-modified',
];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function createUpstreamUrl(request: NextRequest, path: string[]): string {
  const upstreamUrl = new URL(
    `${ELEVENLABS_API_BASE_URL}/${path.map(encodeURIComponent).join('/')}`
  );

  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    upstreamUrl.searchParams.append(key, value);
  }

  return upstreamUrl.toString();
}

function createResponseHeaders(upstreamResponse: Response): Headers {
  const headers = new Headers();

  for (const headerName of RESPONSE_HEADER_ALLOWLIST) {
    const headerValue = upstreamResponse.headers.get(headerName);
    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return headers;
}

async function proxyRequest(
  request: NextRequest,
  method: 'GET' | 'POST',
  path: string[]
): Promise<Response> {
  const apiKey = request.headers.get(INCOMING_API_KEY_HEADER)?.trim();
  if (!apiKey) {
    return Response.json({ error: 'ElevenLabs API key required.' }, { status: 401 });
  }

  const requestHeaders = new Headers();
  requestHeaders.set('xi-api-key', apiKey);

  const contentType = request.headers.get('content-type');
  if (contentType) {
    requestHeaders.set('content-type', contentType);
  }

  const accept = request.headers.get('accept');
  if (accept) {
    requestHeaders.set('accept', accept);
  }

  try {
    const upstreamResponse = await fetch(createUpstreamUrl(request, path), {
      method,
      headers: requestHeaders,
      body: method === 'POST' ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: createResponseHeaders(upstreamResponse),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : 'Failed to reach ElevenLabs.';

    return Response.json(
      {
        error: message,
      },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await params;
  return proxyRequest(request, 'GET', path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await params;
  return proxyRequest(request, 'POST', path);
}
