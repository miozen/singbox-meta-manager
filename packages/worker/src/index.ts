import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createTemplate, deleteTemplate, ensureSchema, listTemplates, readTemplate, stripSchema, updateTemplate } from './templates';
import { issueToken, verifyToken } from './auth';
import { isNonEmptyString, isValidTemplateId } from '../../shared/src/validators';

type Bindings = {
  ASSETS: Fetcher;
  SINGBOX_DB: D1Database;
  ADMIN_PASSWORD: string;
  TOKEN_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use('/*', cors());

function jsonError(message: string, status = 400, code = 'BAD_REQUEST') {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function requireWriteAuth(c: any, next: any) {
  const auth = c.req.header('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return jsonError('Missing token', 401, 'UNAUTHORIZED');
  const payload = await verifyToken(token, c.env.TOKEN_SECRET);
  if (!payload) return jsonError('Invalid or expired token', 401, 'UNAUTHORIZED');
  await next();
}

app.get('/api/health', (c) => c.json({ ok: true }));

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json().catch(() => null) as { password?: string } | null;
  if (!body?.password) return jsonError('Password is required', 400, 'VALIDATION_ERROR');
  if (!c.env.ADMIN_PASSWORD || body.password !== c.env.ADMIN_PASSWORD) {
    return jsonError('Invalid password', 401, 'UNAUTHORIZED');
  }
  const token = await issueToken(c.env.TOKEN_SECRET);
  const payload = await verifyToken(token, c.env.TOKEN_SECRET);
  return c.json({ token, expiresAt: payload?.exp ?? 0 });
});

app.get('/api/templates', async (c) => c.json(await listTemplates(c.env.SINGBOX_DB)));
app.get('/api/templates/:id', async (c) => {
  const item = await readTemplate(c.env.SINGBOX_DB, c.req.param('id'));
  if (!item) return jsonError('Not found', 404, 'NOT_FOUND');
  return c.json(item);
});

app.post('/api/templates', requireWriteAuth, async (c) => {
  const body = await c.req.json().catch(() => null) as { id?: string; name?: string; raw_config?: string } | null;
  if (!isValidTemplateId(body?.id) || !isNonEmptyString(body?.name) || !isNonEmptyString(body?.raw_config)) {
    return jsonError('Missing or invalid required fields', 400, 'VALIDATION_ERROR');
  }
  try {
    await createTemplate(c.env.SINGBOX_DB, body.id, body.name, body.raw_config);
    return c.json({ success: true });
  } catch (e) {
    return jsonError('Template already exists or insert failed', 409, 'CONFLICT');
  }
});

app.put('/api/templates/:id', requireWriteAuth, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null) as { name?: string; raw_config?: string } | null;
  if (!isNonEmptyString(body?.name) || !isNonEmptyString(body?.raw_config)) return jsonError('Missing required fields', 400, 'VALIDATION_ERROR');
  const result = await updateTemplate(c.env.SINGBOX_DB, id, body.name, body.raw_config);
  if (!result.meta.changes) return jsonError('Not found', 404, 'NOT_FOUND');
  return c.json({ success: true });
});

app.delete('/api/templates/:id', requireWriteAuth, async (c) => {
  const result = await deleteTemplate(c.env.SINGBOX_DB, c.req.param('id'));
  if (!result.meta.changes) return jsonError('Not found', 404, 'NOT_FOUND');
  return c.json({ success: true });
});

app.get('/sub/:id', async (c) => {
  const item = await readTemplate(c.env.SINGBOX_DB, c.req.param('id'));
  if (!item) return c.text('Subscription Not Found', 404);
  try {
    return c.json(JSON.parse(stripSchema(ensureSchema(item.raw_config))));
  } catch {
    return c.text('Internal JSON Error', 500);
  }
});

function shouldHandleWithApi(pathname: string) {
  return pathname === '/api' || pathname.startsWith('/api/') || pathname.startsWith('/sub/');
}

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (shouldHandleWithApi(url.pathname)) {
      return app.fetch(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};
