// ============================================
// ANALYTICS TRACKING
// Track user interactions with opportunities
// ============================================

// Use localStorage for now (can be upgraded to S3 via useS3Storage hook in components)
const ANALYTICS_KEY = 'analytics-events';


// ============================================
// TYPES
// ============================================

export type EventType =
    | 'opportunity_viewed'
    | 'opportunity_saved'
    | 'opportunity_unsaved'
    | 'opportunity_hidden'
    | 'documents_generated'
    | 'document_downloaded'
    | 'document_copied'
    | 'document_shared'
    | 'apply_clicked'
    | 'status_changed'
    | 'filter_applied'
    | 'search_performed'
    | 'scan_triggered';

export interface AnalyticsEvent {
    id: string;
    type: EventType;
    timestamp: string;
    opportunityId?: string;
    opportunityType?: 'job' | 'scholarship';
    opportunityTitle?: string;
    documentType?: 'cv' | 'cover_letter' | 'essay';
    previousStatus?: string;
    newStatus?: string;
    filterType?: string;
    filterValue?: string;
    searchQuery?: string;
    metadata?: Record<string, unknown>;
}

export interface AnalyticsStats {
    totalViews: number;
    totalSaves: number;
    totalDocsGenerated: number;
    totalApplyClicks: number;
    totalApplications: number;
    conversionRate: number; // applications / views
    topViewedOpportunities: { id: string; title: string; views: number }[];
    activityByDay: { date: string; events: number }[];
    documentsByType: { type: string; count: number }[];
}

export interface AnalyticsData {
    events: AnalyticsEvent[];
    stats: AnalyticsStats;
    lastUpdated: string;
}

// ============================================
// ANALYTICS SERVICE
// ============================================

class AnalyticsService {
    private events: AnalyticsEvent[] = [];
    private initialized: boolean = false;
    private readonly MAX_EVENTS = 1000; // Keep last 1000 events

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem(ANALYTICS_KEY);
                if (stored) {
                    const data = JSON.parse(stored) as AnalyticsData;
                    if (data && data.events) {
                        this.events = data.events;
                    }
                }
            }
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize analytics:', error);
            // Continue with in-memory analytics
            this.initialized = true;
        }
    }

    private generateId(): string {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async track(
        type: EventType,
        data?: Partial<Omit<AnalyticsEvent, 'id' | 'type' | 'timestamp'>>
    ): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        const event: AnalyticsEvent = {
            id: this.generateId(),
            type,
            timestamp: new Date().toISOString(),
            ...data,
        };

        this.events.push(event);

        // Trim to max events
        if (this.events.length > this.MAX_EVENTS) {
            this.events = this.events.slice(-this.MAX_EVENTS);
        }

        // Persist asynchronously
        this.persist();
    }

    private persist(): void {
        if (typeof window === 'undefined') return;

        try {
            const data: AnalyticsData = {
                events: this.events,
                stats: this.computeStats(),
                lastUpdated: new Date().toISOString(),
            };
            localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to persist analytics:', error);
        }
    }

    computeStats(): AnalyticsStats {

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Filter to recent events
        const recentEvents = this.events.filter(
            e => new Date(e.timestamp) >= thirtyDaysAgo
        );

        // Count by type
        const viewEvents = recentEvents.filter(e => e.type === 'opportunity_viewed');
        const saveEvents = recentEvents.filter(e => e.type === 'opportunity_saved');
        const docsEvents = recentEvents.filter(e => e.type === 'documents_generated');
        const applyEvents = recentEvents.filter(e => e.type === 'apply_clicked');
        const applicationEvents = recentEvents.filter(
            e => e.type === 'status_changed' && e.newStatus === 'applied'
        );

        // Top viewed
        const viewCounts: Record<string, { title: string; count: number }> = {};
        for (const event of viewEvents) {
            if (event.opportunityId) {
                if (!viewCounts[event.opportunityId]) {
                    viewCounts[event.opportunityId] = {
                        title: event.opportunityTitle || 'Unknown',
                        count: 0,
                    };
                }
                viewCounts[event.opportunityId].count++;
            }
        }

        const topViewed = Object.entries(viewCounts)
            .map(([id, data]) => ({ id, title: data.title, views: data.count }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        // Activity by day
        const activityByDay: Record<string, number> = {};
        for (const event of recentEvents) {
            const date = event.timestamp.split('T')[0];
            activityByDay[date] = (activityByDay[date] || 0) + 1;
        }

        const activityArray = Object.entries(activityByDay)
            .map(([date, events]) => ({ date, events }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Documents by type
        const docCounts: Record<string, number> = {};
        for (const event of docsEvents) {
            const docType = event.documentType || 'unknown';
            docCounts[docType] = (docCounts[docType] || 0) + 1;
        }

        const documentsByType = Object.entries(docCounts)
            .map(([type, count]) => ({ type, count }));

        // Conversion rate
        const totalViews = viewEvents.length;
        const totalApplications = applicationEvents.length;
        const conversionRate = totalViews > 0
            ? Math.round((totalApplications / totalViews) * 100) / 100
            : 0;

        return {
            totalViews,
            totalSaves: saveEvents.length,
            totalDocsGenerated: docsEvents.length,
            totalApplyClicks: applyEvents.length,
            totalApplications,
            conversionRate,
            topViewedOpportunities: topViewed,
            activityByDay: activityArray,
            documentsByType,
        };
    }

    getEvents(limit?: number): AnalyticsEvent[] {
        const events = [...this.events].reverse();
        return limit ? events.slice(0, limit) : events;
    }

    getStats(): AnalyticsStats {
        return this.computeStats();
    }

    // Convenience methods for common tracking
    async trackOpportunityViewed(
        opportunityId: string,
        opportunityType: 'job' | 'scholarship',
        opportunityTitle: string
    ): Promise<void> {
        await this.track('opportunity_viewed', {
            opportunityId,
            opportunityType,
            opportunityTitle,
        });
    }

    async trackOpportunitySaved(
        opportunityId: string,
        opportunityType: 'job' | 'scholarship',
        opportunityTitle: string
    ): Promise<void> {
        await this.track('opportunity_saved', {
            opportunityId,
            opportunityType,
            opportunityTitle,
        });
    }

    async trackDocumentsGenerated(
        opportunityId: string,
        opportunityTitle: string,
        documentTypes: string[]
    ): Promise<void> {
        await this.track('documents_generated', {
            opportunityId,
            opportunityTitle,
            metadata: { documentTypes },
        });
    }

    async trackDocumentDownloaded(
        opportunityId: string,
        documentType: 'cv' | 'cover_letter' | 'essay'
    ): Promise<void> {
        await this.track('document_downloaded', {
            opportunityId,
            documentType,
        });
    }

    async trackApplyClicked(
        opportunityId: string,
        opportunityType: 'job' | 'scholarship',
        opportunityTitle: string
    ): Promise<void> {
        await this.track('apply_clicked', {
            opportunityId,
            opportunityType,
            opportunityTitle,
        });
    }

    async trackStatusChanged(
        opportunityId: string,
        previousStatus: string,
        newStatus: string
    ): Promise<void> {
        await this.track('status_changed', {
            opportunityId,
            previousStatus,
            newStatus,
        });
    }

    async trackSearch(query: string): Promise<void> {
        await this.track('search_performed', {
            searchQuery: query,
        });
    }

    async trackFilter(filterType: string, filterValue: string): Promise<void> {
        await this.track('filter_applied', {
            filterType,
            filterValue,
        });
    }
}

// Singleton instance
export const analytics = new AnalyticsService();

// ============================================
// REACT HOOK
// ============================================

import { useState, useEffect, useCallback } from 'react';

export function useAnalytics() {
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            await analytics.initialize();
            setStats(analytics.getStats());
            setIsLoading(false);
        };
        loadStats();
    }, []);

    const refreshStats = useCallback(() => {
        setStats(analytics.getStats());
    }, []);

    return {
        stats,
        isLoading,
        refreshStats,
        track: analytics.track.bind(analytics),
        trackOpportunityViewed: analytics.trackOpportunityViewed.bind(analytics),
        trackOpportunitySaved: analytics.trackOpportunitySaved.bind(analytics),
        trackDocumentsGenerated: analytics.trackDocumentsGenerated.bind(analytics),
        trackDocumentDownloaded: analytics.trackDocumentDownloaded.bind(analytics),
        trackApplyClicked: analytics.trackApplyClicked.bind(analytics),
        trackStatusChanged: analytics.trackStatusChanged.bind(analytics),
        trackSearch: analytics.trackSearch.bind(analytics),
        trackFilter: analytics.trackFilter.bind(analytics),
    };
}
