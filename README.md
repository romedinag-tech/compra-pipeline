# Compra Pipeline

Pipeline semiautónomo de compra de supermercado:

1. **Web (Vercel):** marcas productos y aprietas **Enviar a Claude** → `POST /api/seleccion` (guarda en Vercel KV, estado `pendiente`).
2. **Agente local (tu PC, app abierta):** una tarea programada sondea cada ~2 min `GET /api/seleccion?claim=1` (con secreto), compara precios **Jumbo (web) + Líder (tu Chrome)** y publica la propuesta con `POST /api/propuesta`.
3. **Web:** muestra la propuesta y un botón **Aprobar** → `POST /api/aprobar` (estado `aprobado`).
4. **Agente local:** arma los **canastos en Jumbo y Líder** en tu Chrome y **se detiene antes de pagar** (el pago lo haces tú).

## Por qué una parte corre local y no en la nube
Líder bloquea acceso automático y los carritos son tu sesión logueada → leer Líder y armar canastos **requieren tu Chrome abierto**. Vercel maneja el front + la captura de la selección; el agente local hace la comparación y los canastos.

## Setup en Vercel (una vez)
1. Importar este repo como proyecto en Vercel (Framework preset: **Other**).
2. Pestaña **Storage** → **Create Database** → **KV** → conectarla al proyecto (inyecta las vars `KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.).
3. **Settings → Environment Variables** → agregar `PIPELINE_SECRET` con el valor entregado por Claude (el mismo que usa el agente local).
4. Redeploy.

## Endpoints
- `POST /api/seleccion` `{items:[{producto,cantidad}], fecha}` — público (desde la web).
- `GET  /api/seleccion?claim=1` — header `x-pipeline-secret`; lo usa el agente local.
- `GET  /api/propuesta` — público; la web consulta estado + propuesta.
- `POST /api/propuesta` `{resumen, html, data}` — header `x-pipeline-secret`; lo usa el agente.
- `POST /api/aprobar` — público (botón Aprobar).
- `GET  /api/aprobar` — header `x-pipeline-secret`; el agente revisa si ya se aprobó.

## Seguridad
- El `PIPELINE_SECRET` vive solo como variable de entorno en Vercel y en la tarea local. Nunca en el HTML.
- Claude nunca paga: el agente deja los canastos listos y el pago final lo realizas tú.
