import { getProxySource } from './lib/proxy.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const proxySource = getProxySource();
  const hasServerProxy = proxySource === 'env';

  return res.status(200).json({
    isVercel: Boolean(process.env.VERCEL),
    hasServerProxy,
    proxySource,
    needsProxy: Boolean(process.env.VERCEL) && proxySource === 'none',
  });
}
