const { kv } = require('@vercel/kv');

// POST (público): el usuario aprueba la propuesta -> status "aprobado".
// GET  (con secreto): el agente local consulta el estado para saber si armar los canastos.
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const sel = await kv.get('pipeline:seleccion');
      if (!sel) return res.status(404).json({ ok: false, error: 'sin seleccion' });
      sel.status = 'aprobado';
      await kv.set('pipeline:seleccion', sel);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      if (req.headers['x-pipeline-secret'] !== process.env.PIPELINE_SECRET)
        return res.status(401).json({ ok: false, error: 'no autorizado' });
      const sel = await kv.get('pipeline:seleccion');
      return res.status(200).json({ ok: true, status: sel ? sel.status : 'vacio', seleccion: sel || null });
    }

    return res.status(405).json({ ok: false, error: 'metodo no permitido' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
