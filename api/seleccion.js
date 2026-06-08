const { put, head } = require('@vercel/blob');

const SEL = 'seleccion.json';
const PROP = 'propuesta.json';

async function readJson(path) {
  try {
    const h = await head(path);
    const r = await fetch(h.url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
async function writeJson(path, obj) {
  await put(path, JSON.stringify(obj), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 0
  });
}

// POST (público): recibe la selección desde la web -> "pendiente".
// GET  (con secreto): el agente local lee la selección; con ?claim=1 -> "procesando".
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return res.status(400).json({ ok: false, error: 'sin items' });
      const seleccion = { id: 'sel_' + Date.now(), ts: new Date().toISOString(), fecha: body.fecha || '', items, status: 'pendiente' };
      await writeJson(SEL, seleccion);
      await writeJson(PROP, { empty: true });
      return res.status(200).json({ ok: true, id: seleccion.id });
    }
    if (req.method === 'GET') {
      if (req.headers['x-pipeline-secret'] !== process.env.PIPELINE_SECRET)
        return res.status(401).json({ ok: false, error: 'no autorizado' });
      const sel = await readJson(SEL);
      if (sel && req.query.claim === '1' && sel.status === 'pendiente') {
        sel.status = 'procesando';
        await writeJson(SEL, sel);
      }
      return res.status(200).json({ ok: true, seleccion: sel || null });
    }
    return res.status(405).json({ ok: false, error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
