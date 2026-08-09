import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requireAuth } from './middleware/auth';
import { authRouter } from './routes/auth';
import { categoryRouter } from './routes/categories';
import { planRouter } from './routes/plans';
import { actualRouter } from './routes/actuals';
import { lockRouter } from './routes/locks';
import { reportRouter } from './routes/report';
import { HonoEnv } from './types/hono';

const app = new Hono<HonoEnv>();

app.use('/api/*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));

app.onError((err, c) => {
  console.error('[Global Error]', err);
  return c.json({ error: 'Internal Server Error', details: err instanceof Error ? err.message : String(err) }, 500);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.get('/ping', (c) => c.text('pong!'));

app.use('/api/*', requireAuth);

app.route('/api/auth', authRouter);
app.route('/api/categories', categoryRouter);
app.route('/api/plans', planRouter);
app.route('/api/actuals', actualRouter);
app.route('/api/locks', lockRouter);
app.route('/api/report', reportRouter);

export default {
  fetch: app.fetch,
};