const LIKE_VN_API_URL = 'https://like.vn/api/v2';

function toFormBody(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

export async function callLikeVnApi(params) {
  const response = await fetch(LIKE_VN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toFormBody(params),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text.slice(0, 300) };
  }

  if (!response.ok && !data.error) {
    data.error = `Like.vn API lỗi ${response.status}`;
  }

  return data;
}

export function getBalance(apiKey) {
  return callLikeVnApi({ key: apiKey, action: 'balance' });
}

export function getServices(apiKey) {
  return callLikeVnApi({ key: apiKey, action: 'services' });
}

export function getOrderStatus(apiKey, orderId) {
  return callLikeVnApi({ key: apiKey, action: 'status', order: orderId });
}

export function addOrder(apiKey, { service, link, quantity }) {
  return callLikeVnApi({
    key: apiKey,
    action: 'add',
    service,
    link,
    quantity,
  });
}
