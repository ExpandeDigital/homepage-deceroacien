// Vercel serverless function: POST /api/mp/create-preference
// No expone credenciales: usa process.env.MP_ACCESS_TOKEN y MP_BASE_URL

import fs from 'fs';
import path from 'path';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  // CORS básico (localhost y dominio principal)
  const origin = req.headers.origin || '';
  const allowOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://deceroacien.app',
    'https://www.deceroacien.app'
  ];
  if (allowOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      items = [], // ['course.pmv', 'course.pmf']
      user = {},  // { id, email }
      returnTo // optional: para volver luego
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items is required (array of SKUs)' });
    }

    // Cargar precios desde assets/config/pricing.json
    const pricingPath = path.join(process.cwd(), 'assets', 'config', 'pricing.json');
    let pricing;
    try {
      const raw = fs.readFileSync(pricingPath, 'utf-8');
      pricing = JSON.parse(raw);
    } catch (e) {
      console.error('No se pudo leer pricing.json:', e);
      return res.status(500).json({ error: 'Misconfigured server: pricing.json missing or invalid' });
    }
    const currencyId = pricing.currency || 'CLP';
    const PRODUCT_MAP = pricing.products || {};

    // Construcción de ítems válidos
    const mpItems = items
      .map((sku) => ({ sku, def: PRODUCT_MAP[sku] }))
      .filter((x) => !!x.def)
      .map(({ sku, def }) => ({
        title: def.title,
        unit_price: def.unit_price,
        quantity: 1,
        currency_id: currencyId,
        description: sku
      }));

    if (mpItems.length === 0) {
      return res.status(400).json({ error: 'No valid SKUs provided' });
    }

    // Base URL: para back_urls y webhook
    const BASE_URL = process.env.MP_BASE_URL || 'https://deceroacien.app';
    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Misconfigured server: missing MP_ACCESS_TOKEN' });
    }

    // Elegimos el primer SKU para el grant del PoC (uno por checkout)
    const firstSku = items[0];
    const successUrl = `${BASE_URL}/portal-alumno.html?grant=${encodeURIComponent(firstSku)}`;
    const failureUrl = `${BASE_URL}/academy-fases/index.html`;
    const pendingUrl = `${BASE_URL}/academy-fases/index.html`;
    const notificationUrl = `${BASE_URL}/api/mp/webhook`;

    // SDK oficial: crear preferencia
    const mp = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    const preference = new Preference(mp);
    const { id, init_point, sandbox_init_point } = await preference.create({
      body: {
        items: mpItems,
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl
        },
        auto_return: 'approved',
        notification_url: notificationUrl,
        statement_descriptor: 'DE CERO A CIEN',
        external_reference: user?.email || user?.id || 'anonymous',
        metadata: {
          entitlements: items,
          userEmail: user?.email || null,
          userId: user?.id || null,
          returnTo: returnTo || null
        }
      }
    });

    return res.status(200).json({ id, init_point, sandbox_init_point });
  } catch (err) {
    console.error('create-preference exception:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
