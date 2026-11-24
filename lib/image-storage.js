const bucket = process.env.SUPABASE_IMAGE_BUCKET;

export const imageStorage = {
  enabled: Boolean(bucket),
  async request(name, options = {}) {
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!base || !key) throw new Error('Supabase image storage is not configured');
    return fetch(base + '/storage/v1/object/' + encodeURIComponent(bucket) + '/' + encodeURIComponent(name), {
      ...options,
      headers: { apikey: key, ...options.headers },
      cache: 'no-store',
    });
  },
};

