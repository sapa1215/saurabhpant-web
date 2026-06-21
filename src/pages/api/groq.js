export const prerender = false;

const ALLOWED_ORIGINS = ['https://saurabhpant.com', 'https://www.saurabhpant.com'];

export async function POST({ request, locals }) {
  const runtime = locals.runtime;
  const GROQ_API_KEY = runtime?.env?.GROQ_API_KEY;

  const origin = request.headers.get('Origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'API key not configured', debug: { hasRuntime: !!runtime, hasEnv: !!runtime?.env, keys: runtime?.env ? Object.keys(runtime.env) : [] } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || 'https://saurabhpant.com'
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://saurabhpant.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
