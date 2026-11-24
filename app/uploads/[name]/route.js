import { imageStorage } from '@/lib/image-storage';
import fs from 'fs';
import path from 'path';

const dir = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
const TYPE = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export async function GET(_, { params }) {
  const m = /^([a-f0-9]{16})\.(jpg|png|webp)$/.exec(params.name);
  if (!m) return new Response('Not found', { status: 404 });
  const headers = { 'Content-Type': TYPE[m[2]], 'Cache-Control': 'public, max-age=31536000, immutable' };
  if (imageStorage.enabled) {
    const response = await imageStorage.request(params.name).catch(() => null);
    if (response?.ok) return new Response(response.body, { headers });
    if (!response || ![400, 404].includes(response.status)) return new Response('Image temporarily unavailable', { status: 502 });
  }
  try {
    const buf = fs.readFileSync(path.join(dir, params.name));
    return new Response(buf, { headers });
  } catch { return new Response('Not found', { status: 404 }); }
}
