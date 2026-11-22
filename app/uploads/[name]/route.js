import fs from 'fs';
import path from 'path';

const dir = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
const TYPE = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export async function GET(_, { params }) {
  const m = /^([a-f0-9]{16})\.(jpg|png|webp)$/.exec(params.name);
  if (!m) return new Response('Not found', { status: 404 });
  try {
    const buf = fs.readFileSync(path.join(dir, params.name));
    return new Response(buf, { headers: { 'Content-Type': TYPE[m[2]], 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
