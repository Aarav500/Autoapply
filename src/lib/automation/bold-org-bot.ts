// ============================================
// BOLD.ORG SCHOLARSHIP BOT
// Automates account creation and scholarship applications
// ============================================

import { browserManager } from './browser';

export interface UserProfile {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    gpa: number;
    major: string;
    school: string;
    graduationYear: number;
}

const USER_PROFILE: UserProfile = {
    email: 'ashah264@ucr.edu',
    phone: '+19509062964',
    firstName: 'Aarav',
    lastName: 'Shah',
    gpa: 3.8,
    major: 'Computer Science',
    school: 'University of California, Riverside',
    graduationYear: 2026,
};

export async function runBoldOrgWorkflow(): Promise<void> {
    const bm = browserManager;

    try {
        await bm.initialize();
        const page = bm.getPage();

        bm.setStep('Navigating to Bold.org', 1, 10);
        await page.goto('https://bold.org/scholarships/', { waitUntil: 'networkidle2' });
        bm.log('Loaded Bold.org scholarships page');

        // Check if already logged in
        bm.setStep('Checking login status', 2, 10);
        const isLoggedIn = await page.$('[data-testid="user-menu"]') !== null ||
            await page.$('a[href="/profile"]') !== null;

        if (!isLoggedIn) {
            bm.log('Not logged in, starting account creation/login...');
            await signUpOrLogin(page, bm);
        } else {
            bm.log('Already logged in!');
        }

        // Find scholarships
        bm.setStep('Searching for scholarships', 5, 10);
        await findAndApplyScholarships(page, bm);

        bm.setStatus('completed');
        bm.log('✅ Bold.org workflow completed!');

    } catch (error) {
        bm.setError(error instanceof Error ? error.message : 'Unknown error');
    }
}

async function signUpOrLogin(page: any, bm: typeof browserManager): Promise<void> {
    bm.setStep('Starting sign up process', 3, 10);

    // Click Sign Up / Log In button
    const signUpBtn = await page.$('a[href="/login"]') ||
        await page.$('button:has-text("Sign Up")') ||
        await page.$('a:has-text("Get Started")');

    if (signUpBtn) {
        await signUpBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
        await page.goto('https://bold.org/login/', { waitUntil: 'networkidle2' });
    }

    bm.log('On login/signup page');

    // Look for sign up option
    const signUpLink = await page.$('a:has-text("Sign up")') ||
        await page.$('a:has-text("Create account")');

    if (signUpLink) {
        await signUpLink.click();
        await new Promise(r => setTimeout(r, 2000));
    }

    // Fill email
    bm.setStep('Entering email', 4, 10);
    const emailInput = await page.$('input[type="email"]') ||
        await page.$('input[name="email"]');

    if (emailInput) {
        await emailInput.type(USER_PROFILE.email, { delay: 50 });
        bm.log(`Entered email: ${USER_PROFILE.email}`);
    }

    // Look for continue/submit button
    const continueBtn = await page.$('button[type="submit"]') ||
        await page.$('button:has-text("Continue")');

    if (continueBtn) {
        await continueBtn.click();
        await new Promise(r => setTimeout(r, 3000));
    }

    // Check if OTP/verification is needed
    const otpInput = await page.$('input[name="code"]') ||
        await page.$('input[placeholder*="code"]') ||
        await page.$('input[placeholder*="OTP"]');

    if (otpInput) {
        // PAUSE FOR OTP
        const otp = await bm.pauseForOTP('Bold.org');
        await otpInput.type(otp, { delay: 50 });

        const verifyBtn = await page.$('button[type="submit"]');
        if (verifyBtn) {
            await verifyBtn.click();
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    bm.log('Sign up/login process completed');
}

async function findAndApplyScholarships(page: any, bm: typeof browserManager): Promise<void> {
    bm.setStep('Finding eligible scholarships', 6, 10);

    // Navigate to scholarships
    await page.goto('https://bold.org/scholarships/', { waitUntil: 'networkidle2' });

    // Get list of scholarships
    const scholarshipCards = await page.$$('[data-testid="scholarship-card"]') ||
        await page.$$('.scholarship-card') ||
        await page.$$('article');

    bm.log(`Found ${scholarshipCards.length} scholarships`);

    // Apply to first 3 as demo
    const maxApply = Math.min(3, scholarshipCards.length);

    for (let i = 0; i < maxApply; i++) {
        bm.setStep(`Applying to scholarship ${i + 1}/${maxApply}`, 7 + i, 10);

        try {
            // Click on scholarship
            const cards = await page.$$('[data-testid="scholarship-card"]') ||
                await page.$$('.scholarship-card') ||
                await page.$$('article');

            if (cards[i]) {
                await cards[i].click();
                await new Promise(r => setTimeout(r, 2000));

                // Look for apply button
                const applyBtn = await page.$('button:has-text("Apply")') ||
                    await page.$('a:has-text("Apply")');

                if (applyBtn) {
                    await applyBtn.click();
                    await new Promise(r => setTimeout(r, 3000));
                    bm.log(`Applied to scholarship ${i + 1}`);
                } else {
                    bm.log(`No apply button found for scholarship ${i + 1}`);
                }

                // Go back
                await page.goBack();
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (err) {
            bm.log(`Error applying to scholarship ${i + 1}: ${err}`);
        }
    }
}

export { USER_PROFILE };
