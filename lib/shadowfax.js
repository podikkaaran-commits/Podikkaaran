const hosts = {
  staging: 'https://dale.staging.shadowfax.in/api',
  production: 'https://dale.shadowfax.in/api',
};

export async function shadowfaxGet(path) {
  const token = process.env.SHADOWFAX_API_TOKEN?.trim();
  const mode = process.env.SHADOWFAX_ENV || 'staging';
  if (!token || !Object.hasOwn(hosts, mode)) {
    return { status: 503, error: 'Configure a Shadowfax API token and environment first.' };
  }
  try {
    const response = await fetch(new URL(hosts[mode] + path), {
      headers: { Authorization: 'Token ' + token, Accept: 'application/json' },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403) {
      return { status: 502, error: 'Shadowfax rejected the token. Check that it matches the selected environment.' };
    }
    if (!response.ok) return { status: 502, error: 'Shadowfax could not complete this check.' };
    return { data: await response.json(), mode };
  } catch {
    return { status: 502, error: 'Could not reach Shadowfax. Try again shortly.' };
  }
}
