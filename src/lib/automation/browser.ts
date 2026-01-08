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

        const isProduction = process.env.NODE_ENV === 'production';
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

        this.browser = await puppeteer.launch({
            headless: isProduction, // Headless in production, visible locally
            executablePath: executablePath || undefined, // Use system Chromium if set
            defaultViewport: { width: 1280, height: 800 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage', // Overcome limited resource problems in containers
                '--disable-gpu', // GPU not needed for headless
                '--single-process', // Reduce memory usage
            ],
        });

        this.page = await this.browser.newPage();

        // Anti-detection measures
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        this.log('Browser initialized');
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
