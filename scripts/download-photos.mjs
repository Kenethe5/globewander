import { readFile, writeFile, mkdir } from 'node:fs/promises';
const candidates = JSON.parse(await readFile('/private/tmp/wandersphere-photo-candidates.json', 'utf8'));
await mkdir('frontend/public/destination-photos', { recursive: true });
const credits = {};
for (const [id, choices] of Object.entries(candidates)) {
  const photo = choices[0];
  if (!photo || !/^[a-z-]+$/.test(id)) continue;
  const response = await fetch(photo.download_url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/jpeg')) throw new Error(`${id}: ${response.status}`);
  await writeFile(`frontend/public/destination-photos/${id}.jpg`, Buffer.from(await response.arrayBuffer()));
  credits[id] = { ...photo, image_url: `/destination-photos/${id}.jpg`, changes: 'Commons-provided thumbnail; no further modifications.' };
  console.log(id);
}
await writeFile('/private/tmp/wandersphere-photo-credits.json', JSON.stringify(credits, null, 2));
