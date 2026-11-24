import { imageStorage } from '@/lib/image-storage';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';

const dir = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'uploads');
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file' }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: 'Only JPG, PNG or WEBP images allowed' }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 4 MB' }, { status: 400 });
  const name = `${crypto.randomBytes(8).toString('hex')}.webp`;
  let bytes;
  try {
    bytes = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25_000_000 })
      .rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 }).toBuffer();
  } catch {
    return NextResponse.json({ error: 'Could not read this image' }, { status: 400 });
  }
  if (imageStorage.enabled) {
    const response = await imageStorage.request(name, { method: 'POST', body: bytes, headers: { 'Content-Type': 'image/webp' } }).catch(() => null);
    if (!response?.ok) return NextResponse.json({ error: 'Could not store image' }, { status: 502 });
  } else {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), bytes);
  }
  return NextResponse.json({ url: `/uploads/${name}` });
}
