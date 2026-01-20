// ============================================
// BROWSER AUTOMATION MANAGER
// Handles Puppeteer browser lifecycle and state
// ============================================

import puppeteer, { Browser, Page } from 'puppeteer';

export interface AutomationState {
    status: 'idle' | 'running' | 'paused_for_otp' | 'completed' | 'error';
    currentStep: string;
    logs: string[];
    progress: number;
    totalSteps: number;
    otpRequired?: boolean;
    otpPlatform?: string;
    error?: string;
}

class BrowserManager {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private state: AutomationState = {
        status: 'idle',
        currentStep: '',
        logs: [],
        progress: 0,
        totalSteps: 0,
    };
    private otpResolver: ((otp: string) => void) | null = null;

    async initialize(): Promise<void> {
        if (this.browser) return;

        this.log('Initializing browser...');

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

        // Use headless mode by default for better reliability
        this.log('🚀 Launching browser in headless mode...');
        this.browser = await puppeteer.launch({
            headless: 'shell', // Use new headless mode for better performance
            executablePath: executablePath || undefined,
            defaultViewport: { width: 1920, height: 1080 },
            timeout: 60000, // 60 second timeout
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-crash-reporter',
                '--disable-breakpad',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-sync',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
            ],
        });

        this.page = await this.browser.newPage();

        // Anti-detection measures
        await this.page.evaluateOnNewDocument(() => {
            // Override navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => false });

            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Chrome object
            (window as any).chrome = { runtime: {} };
        });

        // Set realistic user agent
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        );

        this.log('✅ Browser initialized');
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    getPage(): Page {
        if (!this.page) throw new Error('Browser not initialized');
        return this.page;
    }

    getState(): AutomationState {
        return { ...this.state };
    }

    log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        this.state.logs.push(logEntry);
        console.log(logEntry);
    }

    setStatus(status: AutomationState['status']): void {
        this.state.status = status;
    }

    setStep(step: string, progress: number, total: number): void {
        this.state.currentStep = step;
        this.state.progress = progress;
        this.state.totalSteps = total;
    }

    // Pause for OTP - returns a Promise that resolves when OTP is provided
    async setCookie(name: string, value: string, domain: string = '.linkedin.com'): Promise<void> {
        await this.initialize();
        if (!this.page) throw new Error('Page not initialized');

        this.log(`🍪 Setting cookie: ${name}...`);
        await this.page.setCookie({
            name,
            value,
            domain,
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        });
        this.log('✅ Cookie set successfully');

        // Refresh to apply
        await this.page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
    }

    // Pause for OTP - returns a Promise that resolves when OTP is provided
    async pauseForOTP(platform: string): Promise<string> {
        this.state.status = 'paused_for_otp';
        this.state.otpRequired = true;
        this.state.otpPlatform = platform;
        this.log(`⏸️ PAUSED: OTP/verification needed for ${platform}`);

        return new Promise((resolve) => {
            this.otpResolver = resolve;
        });
    }

    // Called when user provides OTP
    provideOTP(otp: string): void {
        if (this.otpResolver) {
            this.state.status = 'running';
            this.state.otpRequired = false;
            this.log(`▶️ RESUMED: OTP received, continuing...`);
            this.otpResolver(otp);
            this.otpResolver = null;
        }
    }

    setError(error: string): void {
        this.state.status = 'error';
        this.state.error = error;
        this.log(`❌ ERROR: ${error}`);
    }
}

// Singleton instance
export const browserManager = new BrowserManager();
