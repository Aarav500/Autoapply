
import puppeteer from 'puppeteer';

async function manualLoginAndTest() {
    console.log('🧪 Starting LinkedIn Manual Login & Test...');
    console.log('⚠️  A browser window will open. Please log in to LinkedIn manually within 120 seconds.');

    try {
        // Launch directly to ensure headful mode
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox']
        });

        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        console.log('🚀 Navigating to LinkedIn Login...');
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

        // Wait for login by checking for feed or profile URL
        // We poll every 2 seconds
        console.log('⏳ Waiting for manual login...');
        const maxWaitTime = 120000; // 2 minutes
        const startTime = Date.now();
        let isLoggedIn = false;

        while (Date.now() - startTime < maxWaitTime) {
            const url = page.url();
            if (url.includes('/feed') || url.includes('/in/')) {
                isLoggedIn = true;
                break;
            }
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!isLoggedIn) {
            console.error('❌ Timeout: User did not log in within 2 minutes.');
            // await browser.close(); 
            return;
        }

        console.log('✅ LOGIN DETECTED!');
        console.log('🚀 Navigating to Profile to verify controls...');
        // Force navigation to profile
        await page.goto('https://www.linkedin.com/in/', { waitUntil: 'domcontentloaded' });

        // Wait a bit for dynamic content
        await new Promise(r => setTimeout(r, 3000));

        // --- Execute Dry Run Verification ---

        // 1. Check Headline
        console.log('🔍 Looking for Headline Edit Button...');
        try {
            // Note: Selectors on LinkedIn change often. We use aria-labels which are more stable.
            const editIntroBtn = await page.waitForSelector('main section button[aria-label*="Edit intro"]', { timeout: 10000 });
            if (editIntroBtn) {
                console.log('✅ Found "Edit Intro" button (Headline)');
                await editIntroBtn.hover();
                // We click it to open modal, then cancel
                await editIntroBtn.click();

                await page.waitForSelector('label', { timeout: 5000 });
                console.log('✅ Opened Edit Modal');

                // Find and click close/cancel
                const closeBtn = await page.$('button[aria-label="Dismiss"]');
                if (closeBtn) await closeBtn.click();
                else {
                    const xBtn = await page.$('button[data-test-modal-close-btn]');
                    if (xBtn) await xBtn.click();
                }
            }
        } catch (e) {
            console.error('❌ Failed Headline Test (Selector might need update):', e);
        }

        // 2. Check About
        console.log('\n🔍 Looking for About Edit Button...');
        try {
            // Scroll to find About section by text or ID
            await page.evaluate(() => {
                // Try to find an element with text "About" or id="about"
                const aboutHeader = Array.from(document.querySelectorAll('h2, span')).find(el => el.textContent?.trim() === 'About');
                if (aboutHeader) aboutHeader.scrollIntoView();

                const aboutId = document.getElementById('about');
                if (aboutId) aboutId.scrollIntoView();
            });
            await new Promise(r => setTimeout(r, 2000));

            // Look for edit pencil in the about section
            const editAboutBtn = await page.$('#about ~ .pvs-header__container .pvs-header__action, #about + div button[aria-label*="Edit about"]');
            if (editAboutBtn) {
                console.log('✅ Found "Edit About" button');
                await editAboutBtn.hover();
            } else {
                console.warn('⚠️ Could NOT find "Edit About" button. (This is expected if About section is empty or selectors changed)');
            }
        } catch (e) {
            console.error('❌ Failed About Test:', e);
        }

        console.log('\n✅ TEST COMPLETE');
        console.log('Browser will remain open for you to explore.');

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    }
}

manualLoginAndTest().catch(console.error);
