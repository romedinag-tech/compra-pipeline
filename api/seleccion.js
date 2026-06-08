const { kv } = require('@vercel/kv');

// POST (público): recibe la selección desde la web y la deja "pendiente".
// GET  (con secreto): el agente local lee la selección; con ?claim=1 la marca "procesando".
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return res.status(400).json({ ok: false, error: 'sin items' });
      const seleccion = {
        id: 'sel_' + Date.now(),
        ts: new Date().toISOString(),
        fecha: body.fecha || '',
        items,
        status: 'pendiente'
      };
      await kv.set('pipeline:seleccion', seleccion);
      await kv.del('pipeline:propuesta');
      return res.status(200).json({ ok: true, id: seleccion.id });
    }

    if (req.method === 'GET') {
      if (req.headers['x-pipeline-secret'] !== process.env.PIPELINE_SECRET)
        return res.status(401).json({ ok: false, error: 'no autorizado' });
      const sel = await kv.get('pipeline:seleccion');
      if (sel && req.query.claim === '1' && sel.status === 'pendiente') {
        sel.status = 'procesando';
        await kv.set('pipeline:seleccion', sel);
      }
      return res.status(200).json({ ok: true, seleccion: sel || null });
    }

    return res.status(405).json({ ok: false, error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
