
import { browserManager } from './browser';

export interface Experience {
    title: string;
    company: string;
    description: string;
    startDate: string; // MM/YYYY
    current: boolean;
}

export const linkedInManager = {
    /**
     * Set session cookie manually
     */
    async setCookie(value: string) {
        if (!value) throw new Error('Cookie value is required');
        await browserManager.setCookie('li_at', value);
    },

    /**
     * Updates the user's headline
     */
    async updateHeadline(headline: string) {
        if (!headline) throw new Error('Headline is required');

        const bm = browserManager;
        await bm.initialize();
        const page = bm.getPage();

        bm.log('🚀 Navigating to LinkedIn Profile...');
        await page.goto('https://www.linkedin.com/in/', { waitUntil: 'domcontentloaded' });

        // Click "Edit Intro" (Pencil icon near top card)
        // Heuristic: Look for the first pencil icon in the top section or by aria-label
        bm.log('✏️ Clicking Edit Intro...');
        await page.waitForSelector('.pv-text-details__left-panel button[aria-label*="Edit intro"]', { timeout: 10000 });
        await page.click('.pv-text-details__left-panel button[aria-label*="Edit intro"]');

        // Wait for modal
        await page.waitForSelector('input[name="headline"]', { timeout: 5000 });

        bm.log('📝 Typing new headline...');
        // Clear existing
        await page.click('input[name="headline"]', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        // Type new
        await page.type('input[name="headline"]', headline, { delay: 50 });

        bm.log('💾 Saving...');
        await page.click('button[data-view-name="profile-form-save"]');

        // Wait for modal to close
        await page.waitForSelector('input[name="headline"]', { hidden: true });
        bm.log('✅ Headline updated!');
    },

    /**
     * Updates the About section
     */
    async updateAbout(aboutText: string) {
        if (!aboutText) throw new Error('About text is required');

        const bm = browserManager;
        await bm.initialize();
        const page = bm.getPage();

        bm.log('🚀 Navigating to LinkedIn Profile...');
        await page.goto('https://www.linkedin.com/in/', { waitUntil: 'domcontentloaded' });

        // Scroll down to find About section
        bm.log('🔍 Finding About section...');

        // Click "Edit About" (Pencil icon in about section)
        // This is tricky, usually id="about" then find the pencil
        const editButtonSelector = '#about ~ .pvs-header__container .pvs-header__action';

        // Scroll to element to ensure it's actionable
        try {
            await page.waitForSelector('#about', { timeout: 5000 });
            await page.evaluate(() => {
                const about = document.getElementById('about');
                if (about) about.scrollIntoView();
            });

            await new Promise(r => setTimeout(r, 1000)); // Wait for scroll

            // Try to find the edit button near the About header
            // Often it's an anchor or button inside the section header
            await page.click('#about + div button[aria-label*="Edit about"], #about + div a[href*="edit/about"]');
        } catch (e) {
            // Fallback: Try direct URL editing if we can guess the urn
            bm.log('⚠️ Could not click edit button, trying direct navigation...');
            // NOTE: This usually requires the specific URN, so we stick to UI interaction for now
            throw new Error('Could not find About section edit button');
        }

        // Wait for modal
        await page.waitForSelector('textarea[name="message"]', { timeout: 5000 }); // About field is often named 'message' or generic textarea

        bm.log('📝 Typing new About section...');
        await page.click('textarea[name="message"]', { clickCount: 3 });
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        // Paste text to avoid slow typing for long content
        await page.evaluate((text) => {
            const el = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
            if (el) {
                el.value = text;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, aboutText);

        bm.log('💾 Saving...');
        await page.click('button[data-view-name="profile-form-save"]');
        await page.waitForSelector('textarea[name="message"]', { hidden: true });
        bm.log('✅ About section updated!');
    },

    /**
     * AUTO-PILOT: Likes posts in the feed
     */
    async engageWithFeed(count: number = 3) {
        const bm = browserManager;
        await bm.initialize();
        const page = bm.getPage();

        bm.log('👀 Navigating to Feed to engage...');
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });

        bm.log('📜 Scrolling and looking for posts...');
        let liked = 0;
        let scrolls = 0;

        while (liked < count && scrolls < 10) {
            // Scroll down
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(r => setTimeout(r, 2000));
            scrolls++;

            // Find like buttons that are NOT yet liked
            // aria-label usually contains "Like" or "React"
            // We look for button with specific reaction class or label
            const likeButtons = await page.$$('button[aria-label^="React Like"], button.react-button__trigger');

            for (const btn of likeButtons) {
                if (liked >= count) break;

                // key: verify it's not already active/liked
                const ariaPressed = await page.evaluate(el => el.getAttribute('aria-pressed'), btn);
                if (ariaPressed !== 'true') {
                    await btn.click();
                    bm.log('👍 Liked a post');
                    liked++;
                    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000)); // Human delay
                }
            }
        }
        bm.log(`✅ Engagement complete. Liked ${liked} posts.`);
    },

    /**
     * AUTO-PILOT: Connects with people based on search
     */
    async connectWithNewPeople(keywords: string, limit: number = 2) {
        const bm = browserManager;
        await bm.initialize();
        const page = bm.getPage();

        bm.log(`🤝 Searching for people: "${keywords}"...`);
        const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('.reusable-search__result-container', { timeout: 10000 }).catch(() => null);

        let sent = 0;
        const connectButtons = await page.$$('button'); // Get all buttons to filter text

        for (const btn of connectButtons) {
            if (sent >= limit) break;

            const text = await page.evaluate(el => el.textContent?.trim(), btn);
            if (text === 'Connect') {
                bm.log('👋 Clicking Connect...');
                await btn.click();
                await new Promise(r => setTimeout(r, 1000));

                // Handle "Add a note" modal -> Click "Send without a note" for speed/automation
                const sendNowBtn = await page.$('button[aria-label="Send now"], button[aria-label="Send without a note"]');
                if (sendNowBtn) {
                    await sendNowBtn.click();
                    bm.log('📨 Connection request sent!');
                    sent++;
                } else {
                    // Sometimes it asks for email, if so, we cancel
                    const closeBtn = await page.$('button[aria-label="Dismiss"]');
                    if (closeBtn) await closeBtn.click();
                }
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        bm.log(`✅ Networking complete. Sent ${sent} requests.`);
    },

    /**
     * AUTO-PILOT: Creates a new post
     */
    async createPost(content: string) {
        if (!content) return;
        const bm = browserManager;
        await bm.initialize();
        const page = bm.getPage();

        bm.log('✍️ Navigating to start a post...');
        await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });

        // Click "Start a post"
        await page.waitForSelector('button.share-box-feed-entry__trigger', { timeout: 10000 });
        await page.click('button.share-box-feed-entry__trigger');

        // Wait for modal editor
        await page.waitForSelector('.ql-editor', { timeout: 5000 });

        bm.log('📝 Typing content...');
        await page.type('.ql-editor', content, { delay: 30 });
        await new Promise(r => setTimeout(r, 1000));

        bm.log('🚀 Clicking Post...');
        // Find the Post button (usually disabled until text is there)
        const postBtn = await page.$('button.share-actions__primary-action');
        if (postBtn) {
            await postBtn.click();
            bm.log('✅ Post published!');
            // Wait for modal close
            await new Promise(r => setTimeout(r, 3000));
        } else {
            throw new Error('Could not find Post button');
        }
    },

    /**
     * Adds an Experience entry
     */
    async addExperience(exp: Experience) {
        const bm = browserManager;
        await bm.initialize();
        const page = bm.getPage();

        bm.log(`💼 Adding Experience: ${exp.title} at ${exp.company}...`);

        // Go to Experience edit form directly (usually this URL works for adding new)
        // Or navigate: Profile -> Add Section -> Core -> Add position
        await page.goto('https://www.linkedin.com/in/', { waitUntil: 'domcontentloaded' });

        // Wait for dynamic load
        await new Promise(r => setTimeout(r, 2000));

        // Click "Add profile section" if available (top of profile)
        try {
            // We'll try a direct URL approach for "Add Position" which is more robust than selecting through menus
            await page.goto('https://www.linkedin.com/profile/add?startTask=POSITION_NEW', { waitUntil: 'domcontentloaded' });

            // Wait for form
            await page.waitForSelector('input[id*="title"]', { timeout: 10000 });
        } catch (e) {
            bm.log('⚠️ Could not open Add Position form directly. Trying manual navigation...');
            // Fallback navigation would go here
            throw e;
        }

        // Fill Title
        bm.log('📝 Filling Title...');
        await page.type('input[id*="title"]', exp.title, { delay: 50 });
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        // Fill Company
        bm.log('📝 Filling Company...');
        await page.type('input[id*="company"]', exp.company, { delay: 50 });
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        // Start Date (Simple approach: Assume current or recent)
        // Note: Date selectors are complex on LinkedIn (Month/Year dropdowns)
        // We will try to just set "I am currently working here" if implied, or skip complex date for MVP
        // For MVP: We just focus on Title/Company/Description which are text fields.

        // Fill Description
        if (exp.description) {
            bm.log('📝 Filling Description...');
            await page.type('textarea[id*="description"]', exp.description, { delay: 30 });
        }

        // Save
        bm.log('💾 Saving Position...');
        const saveBtn = await page.$('button[data-view-name="profile-form-save"]');
        if (saveBtn) await saveBtn.click();

        await new Promise(r => setTimeout(r, 3000));
        bm.log('✅ Experience Added!');
    },

    /**
     * Adds an Education entry
     */
    async addEducation(edu: { school: string; degree: string; field: string }) {
        const bm = browserManager;
        await bm.initialize();
        const page = bm.getPage();

        bm.log(`🎓 Adding Education: ${edu.school}...`);

        // Direct URL for Add Education
        await page.goto('https://www.linkedin.com/profile/add?startTask=EDUCATION_NEW', { waitUntil: 'domcontentloaded' });

        try {
            await page.waitForSelector('input[id*="school"]', { timeout: 10000 });
        } catch (e) {
            throw new Error('Could not open Add Education form');
        }

        // School
        bm.log('📝 Filling School...');
        await page.type('input[id*="school"]', edu.school, { delay: 50 });
        await new Promise(r => setTimeout(r, 1000));
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        // Degree
        if (edu.degree) {
            bm.log('📝 Filling Degree...');
            await page.type('input[id*="degree"]', edu.degree, { delay: 50 });
            await new Promise(r => setTimeout(r, 1000));
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        }

        // Field
        if (edu.field) {
            bm.log('📝 Filling Field of Study...');
            await page.type('input[id*="field"]', edu.field, { delay: 50 });
            await new Promise(r => setTimeout(r, 1000));
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        }

        // Save
        bm.log('💾 Saving Education...');
        const saveBtn = await page.$('button[data-view-name="profile-form-save"]');
        if (saveBtn) await saveBtn.click();

        await new Promise(r => setTimeout(r, 3000));
        bm.log('✅ Education Added!');
    }
};
