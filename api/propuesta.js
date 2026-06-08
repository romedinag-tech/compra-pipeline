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

// POST (con secreto): el agente local publica la propuesta -> "propuesta".
// GET  (público): la web consulta estado + propuesta.
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      if (req.headers['x-pipeline-secret'] !== process.env.PIPELINE_SECRET)
        return res.status(401).json({ ok: false, error: 'no autorizado' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const propuesta = { ts: new Date().toISOString(), id: body.id || '', resumen: body.resumen || '', html: body.html || '', data: body.data || null };
      await writeJson(PROP, propuesta);
      const sel = await readJson(SEL);
      if (sel) { sel.status = 'propuesta'; await writeJson(SEL, sel); }
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'GET') {
      const sel = await readJson(SEL);
      const prop = await readJson(PROP);
      return res.status(200).json({
        ok: true,
        status: sel ? sel.status : 'vacio',
        propuesta: (prop && prop.html) ? prop : null
      });
    }
    return res.status(405).json({ ok: false, error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
