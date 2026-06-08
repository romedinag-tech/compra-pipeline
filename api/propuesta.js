const { Redis } = require('@upstash/redis');
const kv = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

// POST (con secreto): el agente local publica la propuesta -> status "propuesta".
// GET  (público): la web consulta status + propuesta para mostrarla.
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      if (req.headers['x-pipeline-secret'] !== process.env.PIPELINE_SECRET)
        return res.status(401).json({ ok: false, error: 'no autorizado' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const propuesta = {
        ts: new Date().toISOString(),
        id: body.id || '',
        resumen: body.resumen || '',
        html: body.html || '',
        data: body.data || null
      };
      await kv.set('pipeline:propuesta', propuesta);
      const sel = await kv.get('pipeline:seleccion');
      if (sel) { sel.status = 'propuesta'; await kv.set('pipeline:seleccion', sel); }
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const sel = await kv.get('pipeline:seleccion');
      const prop = await kv.get('pipeline:propuesta');
      return res.status(200).json({
        ok: true,
        status: sel ? sel.status : 'vacio',
        propuesta: prop || null
      });
    }

    return res.status(405).json({ ok: false, error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
