const { put, head } = require('@vercel/blob');

const SEL = 'seleccion.json';

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

// POST (público): el usuario aprueba -> "aprobado".
// GET  (con secreto): el agente local consulta el estado para armar los canastos.
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const sel = await readJson(SEL);
      if (!sel) return res.status(404).json({ ok: false, error: 'sin seleccion' });
      sel.status = 'aprobado';
      await writeJson(SEL, sel);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'GET') {
      if (req.headers['x-pipeline-secret'] !== process.env.PIPELINE_SECRET)
        return res.status(401).json({ ok: false, error: 'no autorizado' });
      const sel = await readJson(SEL);
      return res.status(200).json({ ok: true, status: sel ? sel.status : 'vacio', seleccion: sel || null });
    }
    return res.status(405).json({ ok: false, error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
