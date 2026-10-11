// Read-only Commons search. Writes a reviewable metadata artifact, not application data.
import { writeFile, readFile } from 'node:fs/promises';
const searches = {
  lisbon: 'Lisbon skyline', kyoto: 'Kyoto Kiyomizu temple', cancun: 'Cancun Playa Delfines',
  reykjavik: 'Reykjavik skyline', barcelona: 'Barcelona skyline', bangkok: 'Bangkok skyline',
  singapore: 'Singapore Marina Bay skyline', 'cape-town': 'Cape Town Table Mountain city',
  marrakech: 'Marrakech Koutoubia', vancouver: 'Vancouver skyline',
  'rio-de-janeiro': 'Rio de Janeiro Sugarloaf panorama', 'punta-cana': 'Punta Cana Bavaro beach',
};
const clean = text => String(text || '').replace(/<[^>]*>/g, '').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, dec) => String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10))).replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const candidates = JSON.parse(await readFile('/private/tmp/wandersphere-photo-candidates.json', 'utf8').catch(() => '{}'));
for (const [id, search] of Object.entries(searches)) {
  if (candidates[id]?.length) continue;
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: `${search} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '5', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1000', format: 'json' });
  const response = await fetch(url, { headers: { 'User-Agent': 'WanderSphere-hackathon-photo-audit/1.0' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
  const data = await response.json();
  candidates[id] = Object.values(data.query?.pages || {}).sort((a, b) => a.index - b.index).flatMap(page => {
    const info = page.imageinfo?.[0]; const metadata = info?.extmetadata;
    if (!info || !/^(CC BY(?:-SA)? [\d.]+|CC0|Public domain)$/.test(metadata?.LicenseShortName?.value || '') || metadata?.Restrictions?.value) return [];
    return [{ title: page.title, author: clean(metadata.Artist?.value), license: metadata.LicenseShortName.value,
      license_url: metadata.LicenseUrl?.value || null, source_url: info.descriptionurl,
      download_url: info.thumburl || info.url, checked_at: '2026-10-11', description: clean(metadata.ImageDescription?.value).slice(0, 180) }];
  });
  console.log(id, candidates[id].map(photo => `${photo.title} (${photo.license})`).join(' | '));
  await writeFile('/private/tmp/wandersphere-photo-candidates.json', JSON.stringify(candidates, null, 2));
  await new Promise(resolve => setTimeout(resolve, 1500));
}
await writeFile('/private/tmp/wandersphere-photo-candidates.json', JSON.stringify(candidates, null, 2));
