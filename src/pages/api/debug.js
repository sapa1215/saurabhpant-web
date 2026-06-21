export const prerender = false;

export async function GET({ locals }) {
  const runtime = locals.runtime;
  return new Response(JSON.stringify({
    hasRuntime: !!runtime,
    hasEnv: !!runtime?.env,
    envKeys: runtime?.env ? Object.keys(runtime.env) : [],
    hasGroqKey: !!(runtime?.env?.GROQ_API_KEY),
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
