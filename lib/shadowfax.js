const hosts = {
  staging: 'https://dale.staging.shadowfax.in/api',
  production: 'https://dale.shadowfax.in/api',
};

export const shadowfaxMode = () => process.env.SHADOWFAX_ENV || 'staging';

export async function shadowfaxGet(path) {
  return request(path);
}

export async function shadowfaxPlaceOrder(payload) {
  return request('/v3/clients/orders/', payload);
}

async function request(path, payload) {
  const token = process.env.SHADOWFAX_API_TOKEN?.trim();
  const mode = shadowfaxMode();
  if (!token || !Object.hasOwn(hosts, mode)) {
    return { status: 503, error: 'Configure a Shadowfax API token and environment first.' };
  }
  try {
    const response = await fetch(new URL(hosts[mode] + path), {
      method: payload ? 'POST' : 'GET',
      headers: {
        Authorization: 'Token ' + token, Accept: 'application/json',
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403) {
      return { status: 502, authRejected: true, error: 'Shadowfax rejected the token. Check that it matches the selected environment.' };
    }
    if (!response.ok) return { status: 502, error: 'Shadowfax could not complete this check.' };
    return { data: await response.json(), mode };
  } catch {
    return { status: 502, error: 'Could not reach Shadowfax. Try again shortly.' };
  }
}
