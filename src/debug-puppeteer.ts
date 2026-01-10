
import puppeteer from 'puppeteer';

async function testLaunch() {
    console.log('🔍 Debugging Puppeteer Launch...');
    try {
        console.log('🚀 Launching Browser (Headless: FALSE)...');
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox']
        });

        console.log('✅ Browser launched!');
        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        console.log('🌐 Navigating to Google...');
        await page.goto('https://www.google.com');
        console.log('✅ Navigation successful!');

        console.log('⏳ Keeping browser open for 10 seconds...');
        await new Promise(r => setTimeout(r, 10000));

        await browser.close();
        console.log('👋 Browser closed.');
    } catch (e) {
        console.error('❌ Launch Failed:', e);
    }
}

testLaunch();
