// ============================================
// CIRCUIT BREAKER PATTERN
// Prevents cascading failures across scrapers
// ============================================

export enum CircuitState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Failures exceeded threshold, reject all
    HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export class CircuitBreaker {
    private state = CircuitState.CLOSED;
    private failureCount = 0;
    private lastFailureTime = 0;
    private successCount = 0;

    constructor(
        private name: string,
        private failureThreshold = 5,
        private resetTimeout = 60000, // 1 minute
        private halfOpenSuccessThreshold = 2
    ) {}

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            // Check if we should try transitioning to HALF_OPEN
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN`);
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            } else {
                throw new Error(`Circuit breaker OPEN for ${this.name}`);
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= this.halfOpenSuccessThreshold) {
                console.log(`[CircuitBreaker:${this.name}] Transitioning to CLOSED`);
                this.state = CircuitState.CLOSED;
                this.failureCount = 0;
            }
        } else if (this.state === CircuitState.CLOSED) {
            this.failureCount = 0; // Reset on any success
        }
    }

    private onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            console.log(`[CircuitBreaker:${this.name}] Failed in HALF_OPEN, transitioning to OPEN`);
            this.state = CircuitState.OPEN;
        } else if (this.failureCount >= this.failureThreshold) {
            console.log(`[CircuitBreaker:${this.name}] Threshold exceeded, transitioning to OPEN`);
            this.state = CircuitState.OPEN;
        }
    }

    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
        };
    }

    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
    }
}
