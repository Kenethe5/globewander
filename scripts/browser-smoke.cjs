// Run with WANDER_PUPPETEER_MODULE set to an installed puppeteer-core module path.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.WANDER_PUPPETEER_MODULE || 'puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.WANDER_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(process.env.WANDER_SITE_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
    console.log('Loaded frontend');
    const click = async text => {
      await page.waitForFunction(text => [...document.querySelectorAll('button')].some(button => button.textContent === text && !button.disabled), {}, text);
      await page.evaluate(text => [...document.querySelectorAll('button')].find(button => button.textContent === text).click(), text);
    };
    await click('Next'); await click('Next'); await click('Warm'); await click('Next');
    await page.select('#month', '12'); await click('Next'); await click('Beaches'); await click('Food');
    await click('Find destinations'); await page.waitForSelector('.preference-summary');
    console.log('Live ranking received');
    await page.waitForSelector('.destination-card');
    const before = await page.$$eval('.destination-card', cards => cards.map(card => card.getAttribute('aria-label')));
    assert.equal(before.length, process.env.WANDER_DEMO_CHECK ? 4 : 12);
    assert(await page.$('canvas'));
    if (process.env.WANDER_DEMO_CHECK) {
      assert(await page.$eval('.demo-note', el => el.textContent.includes('Sample scores are invented')));
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ demo: true, fixtureCities: before.length, labelled: true, pageErrors: errors }));
      return;
    }
    await click('Edit preferences'); await click('Next'); await click('Next'); await click('Cold');
    await page.waitForFunction(() => document.body.textContent.includes('Results are updating'));
    await page.waitForFunction(() => !document.body.textContent.includes('Results are updating'));
    console.log('What If update received');
    const after = await page.$$eval('.destination-card', cards => cards.map(card => card.getAttribute('aria-label')));
    assert.notDeepEqual(before, after);
    await page.click('[aria-label="Close destination details"]');
    await page.click('[aria-label="Kyoto, Japan"]');
    await page.waitForFunction(() => document.querySelector('.details-drawer h2')?.textContent === 'Kyoto');
    assert(await page.$('.details-drawer a'));
    await page.waitForFunction(() => { const image = document.querySelector('.details-drawer img'); return image?.complete && image.naturalWidth > 0; });
    assert(await page.$('.photo-credit a'));
    assert(await page.$eval('.details-drawer', el => el.textContent.includes('solo full-room proxy')));
    await new Promise(resolve => setTimeout(resolve, 1000)); // Finish the documented 850ms camera animation.
    await page.click('[aria-label="Close destination details"]');
    const canvasBounds = await page.$eval('canvas', el => { const box = el.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; });
    await page.mouse.click(canvasBounds.x, canvasBounds.y);
    await page.waitForFunction(() => document.querySelector('.details-drawer h2')?.textContent === 'Kyoto');
    console.log('Selected city marker remains clickable above country polygons');
    await page.select('[aria-label="Explore a country"]', '620');
    await page.waitForSelector('[aria-label="Supported cities in selected country"]');
    assert(await page.$eval('[aria-label="Supported cities in selected country"]', el => el.textContent.includes('Lisbon')));
    await click('Lisbon');
    await page.waitForFunction(() => document.querySelector('.details-drawer h2')?.textContent === 'Lisbon');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.click('[aria-label="Close destination details"]');
    await page.select('[aria-label="Explore a country"]', '250');
    await page.waitForFunction(() => document.body.textContent.includes('Not yet covered'));
    const portugal = await page.$eval('canvas', el => { const box = el.getBoundingClientRect(); return { x: box.x + box.width / 2 + 8, y: box.y + box.height / 2 - 10 }; });
    await page.mouse.click(portugal.x, portugal.y);
    await page.waitForSelector('[aria-label="Supported cities in selected country"]');
    console.log('Portugal country polygon click yields supported cities');
    await page.click('summary');
    await page.type('#preference-text', 'food and warm weather');
    await click('Fill preference controls');
    await page.waitForFunction(() => document.body.textContent.includes('Text parsing is not configured'));
    await click('Surprise Me');
    await page.waitForSelector('.details-drawer h2');
    await page.setViewport({ width: 390, height: 844 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth);
    await page.waitForFunction(() => document.querySelector('.globe-wrap').getBoundingClientRect().right <= window.innerWidth);
    const box = await page.$eval('canvas', el => { const bounds = el.getBoundingClientRect(); return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }; });
    await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 40, box.y + 10, { steps: 10 }); await page.mouse.up();
    await page.mouse.wheel({ deltaY: 120 });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ cities: before.length, reranked: true, detailSources: true, countryChoices: true, parserMissingKey: true, surpriseMe: true, mobileOverflow: false, pageErrors: errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
