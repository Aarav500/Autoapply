// ============================================
// COLLEGE APPLICATION AUTOMATION
// Auto-fill Common App, Coalition, UC App, CSS Profile
// ============================================

import { browserManager } from './browser';
import { DEFAULT_PROFILE, UserProfile } from './user-profile';

export type CollegeAppPlatform = 'common-app' | 'coalition' | 'uc-app' | 'css-profile';

interface CollegeAppResult {
    platform: CollegeAppPlatform;
    success: boolean;
    fieldsCompleted: number;
    error?: string;
}

// Platform URLs
const PLATFORM_URLS: Record<CollegeAppPlatform, string> = {
    'common-app': 'https://apply.commonapp.org',
    'coalition': 'https://www.coalitionforcollegeaccess.org',
    'uc-app': 'https://apply.universityofcalifornia.edu',
    'css-profile': 'https://cssprofile.collegeboard.org',
};

/**
 * College Application Automation Service
 * Auto-fills college application platforms
 */
export class CollegeAppAutomation {
    private profile: UserProfile;

    constructor(profile: UserProfile = DEFAULT_PROFILE) {
        this.profile = profile;
    }

    /**
     * Start automation for a specific platform
     */
    async autoFillPlatform(platform: CollegeAppPlatform): Promise<CollegeAppResult> {
        const bm = browserManager;
        bm.log(`🎓 Starting ${platform} automation...`);

        try {
            const page = await bm.getPage();
            if (!page) throw new Error('Failed to get browser page');

            const url = PLATFORM_URLS[platform];
            bm.log(`Navigating to ${platform}: ${url}`);

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
            await new Promise(r => setTimeout(r, 3000));

            // Check if logged in (most platforms require auth)
            const isLoggedIn = await this.checkLoginStatus(platform);
            if (!isLoggedIn) {
                bm.log(`⚠️ ${platform} requires login. Please log in first.`);
                return { platform, success: false, fieldsCompleted: 0, error: 'Login required' };
            }

            // Auto-fill based on platform
            let fieldsCompleted = 0;

            switch (platform) {
                case 'common-app':
                    fieldsCompleted = await this.fillCommonApp();
                    break;
                case 'coalition':
                    fieldsCompleted = await this.fillCoalition();
                    break;
                case 'uc-app':
                    fieldsCompleted = await this.fillUCApp();
                    break;
                case 'css-profile':
                    fieldsCompleted = await this.fillCSSProfile();
                    break;
            }

            bm.log(`✅ ${platform}: Completed ${fieldsCompleted} fields`);
            return { platform, success: true, fieldsCompleted };

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            bm.log(`❌ ${platform} automation failed: ${msg}`);
            return { platform, success: false, fieldsCompleted: 0, error: msg };
        }
    }

    /**
     * Check if user is logged in to the platform
     */
    private async checkLoginStatus(platform: CollegeAppPlatform): Promise<boolean> {
        const page = await browserManager.getPage();
        if (!page) return false;

        return page.evaluate((plat) => {
            // Check for common login indicators
            const loginButtons = document.querySelectorAll(
                'button[data-testid*="login"], a[href*="login"], .login-btn, .sign-in'
            );
            const dashboardElements = document.querySelectorAll(
                '.dashboard, .my-colleges, .profile, [data-user]'
            );

            // If login buttons visible and no dashboard = not logged in
            return dashboardElements.length > 0 || loginButtons.length === 0;
        }, platform);
    }

    /**
     * Fill Common App fields
     */
    private async fillCommonApp(): Promise<number> {
        const page = await browserManager.getPage();
        if (!page) return 0;

        let count = 0;
        const profile = this.profile;

        // Common field selectors for Common App
        const fieldMappings = [
            { selector: 'input[name*="firstName"], input[id*="firstName"]', value: profile.firstName },
            { selector: 'input[name*="lastName"], input[id*="lastName"]', value: profile.lastName },
            { selector: 'input[name*="email"], input[id*="email"]', value: profile.email },
            { selector: 'input[name*="phone"], input[id*="phone"]', value: profile.phone },
            { selector: 'input[name*="city"], input[id*="city"]', value: profile.city },
            { selector: 'input[name*="state"], input[id*="state"]', value: profile.state },
            { selector: 'input[name*="zip"], input[id*="zip"]', value: profile.zipCode },
            { selector: 'input[name*="gpa"], input[id*="gpa"]', value: profile.gpa.toString() },
            { selector: 'input[name*="school"], input[id*="school"]', value: profile.school },
        ];

        for (const mapping of fieldMappings) {
            try {
                const element = await page.$(mapping.selector);
                if (element) {
                    await element.click({ clickCount: 3 }); // Select all
                    await element.type(mapping.value);
                    count++;
                    browserManager.log(`  ✓ Filled: ${mapping.selector.split(',')[0]}`);
                }
            } catch {
                // Field not found, continue
            }
        }

        return count;
    }

    /**
     * Fill Coalition App fields
     */
    private async fillCoalition(): Promise<number> {
        // Similar structure to Common App
        return this.fillCommonApp();
    }

    /**
     * Fill UC Application fields
     */
    private async fillUCApp(): Promise<number> {
        const page = await browserManager.getPage();
        if (!page) return 0;

        let count = 0;
        const profile = this.profile;

        browserManager.log('  Filling UC Application...');

        // UC App specific fields
        const fieldMappings = [
            { selector: '#firstName, input[name="firstName"]', value: profile.firstName },
            { selector: '#lastName, input[name="lastName"]', value: profile.lastName },
            { selector: '#email, input[name="email"]', value: profile.email },
            { selector: '#phoneNumber, input[name="phone"]', value: profile.phone },
            { selector: '#permanentCity, input[name="city"]', value: profile.city },
            { selector: '#permanentState, select[name="state"]', value: profile.state },
            { selector: '#permanentZip, input[name="zip"]', value: profile.zipCode },
        ];

        for (const mapping of fieldMappings) {
            try {
                await page.waitForSelector(mapping.selector, { timeout: 1000 });
                const element = await page.$(mapping.selector);
                if (element) {
                    await element.click({ clickCount: 3 });
                    await element.type(mapping.value);
                    count++;
                }
            } catch {
                // Field not found
            }
        }

        return count;
    }

    /**
     * Fill CSS Profile fields
     */
    private async fillCSSProfile(): Promise<number> {
        // Similar to UC App
        return this.fillUCApp();
    }

    /**
     * Auto-fill ALL platforms
     */
    async autoFillAll(): Promise<CollegeAppResult[]> {
        const platforms: CollegeAppPlatform[] = ['common-app', 'coalition', 'uc-app', 'css-profile'];
        const results: CollegeAppResult[] = [];

        for (const platform of platforms) {
            const result = await this.autoFillPlatform(platform);
            results.push(result);
            await new Promise(r => setTimeout(r, 5000)); // Delay between platforms
        }

        return results;
    }
}

// Export singleton
export const collegeAppAutomation = new CollegeAppAutomation();
