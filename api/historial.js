const { put, head } = require('@vercel/blob');

const HIST = 'historial.json';

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

// GET  (público): devuelve el historial completo de análisis de precios.
// POST (con secreto): agrega un registro {fecha, precios:[{producto, jumbo, lider, nota}]}.
module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const hist = await readJson(HIST);
      return res.status(200).json({ ok: true, historial: Array.isArray(hist) ? hist : [] });
    }
    if (req.method === 'POST') {
      if (req.headers['x-pipeline-secret'] !== process.env.PIPELINE_SECRET)
        return res.status(401).json({ ok: false, error: 'no autorizado' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const registro = {
        fecha: body.fecha || new Date().toISOString().slice(0, 10),
        ts: new Date().toISOString(),
        precios: Array.isArray(body.precios) ? body.precios : []
      };
      const hist = (await readJson(HIST)) || [];
      // si ya hay un registro de la misma fecha, lo reemplaza (evita duplicados por reintentos)
      const filtrado = hist.filter(r => r.fecha !== registro.fecha);
      filtrado.push(registro);
      filtrado.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      await writeJson(HIST, filtrado);
      return res.status(200).json({ ok: true, total: filtrado.length });
    }
    return res.status(405).json({ ok: false, error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
