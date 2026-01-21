'use server';

import { NextRequest, NextResponse } from 'next/server';
import { scrapeBoldOrg } from '@/lib/automation/scrapers/bold-org-scraper';
import { scrapeFastWeb } from '@/lib/automation/scrapers/fastweb-scraper';
import { scrapeScholarshipsCom } from '@/lib/automation/scrapers/scholarships-com-scraper';
import { matchAndRankScholarships } from '@/lib/automation/opportunity-matcher';
import { UserProfile } from '@/lib/automation/user-profile';

// ============================================
// REAL-TIME SCHOLARSHIP DISCOVERY ENGINE
// Scrapes 100+ scholarships from multiple sources weekly
// ============================================

interface DiscoveryRequest {
    userProfile: any;
    constraints: {
        citizenship: string;
        is_transfer_student: boolean;
        is_first_gen: boolean;
        is_low_income: boolean;
    };
    sources?: ('bold' | 'fastweb' | 'scholarships-com' | 'all')[];
    maxResults?: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: DiscoveryRequest = await request.json();
        const { userProfile, constraints, sources = ['all'], maxResults = 100 } = body;

        console.log(`🔍 Starting scholarship discovery...`);
        console.log(`   Sources: ${sources.join(', ')}`);
        console.log(`   Max results: ${maxResults}`);

        const allScholarships: any[] = [];
        const sourcesUsed = sources.includes('all') ? ['bold', 'fastweb', 'scholarships-com'] : sources;

        // ============================================
        // PHASE 1: Scrape from each source
        // ============================================
        for (const source of sourcesUsed) {
            try {
                console.log(`   📡 Scraping ${source}...`);
                let scholarships: any[] = [];

                switch (source) {
                    case 'bold':
                        scholarships = await scrapeBoldOrg({
                            maxPages: 5,
                            filters: {
                                major: userProfile?.major,
                                ethnicity: userProfile?.ethnicity,
                                state: userProfile?.state,
                            },
                        });
                        break;

                    case 'fastweb':
                        scholarships = await scrapeFastWeb({
                            profile: {
                                gpa: userProfile?.gpa,
                                major: userProfile?.major,
                                gradYear: userProfile?.graduationYear,
                                ethnicity: userProfile?.ethnicity,
                            },
                            maxResults: 50,
                        });
                        break;

                    case 'scholarships-com':
                        scholarships = await scrapeScholarshipsCom({
                            keywords: [userProfile?.major, 'transfer', 'international'],
                            amount: { min: 1000 },
                            maxResults: 50,
                        });
                        break;
                }

                console.log(`   ✅ Found ${scholarships.length} from ${source}`);
                allScholarships.push(...scholarships);

            } catch (error) {
                console.error(`   ❌ Error scraping ${source}:`, error);
                // Continue with other sources
            }
        }

        console.log(`🎯 Total discovered: ${allScholarships.length} scholarships`);

        // ============================================
        // PHASE 2: Deduplicate by URL/name
        // ============================================
        console.log('🔄 Deduplicating scholarships...');
        const seen = new Set<string>();
        const uniqueScholarships = allScholarships.filter(s => {
            const key = `${s.scholarship_name}-${s.sponsor}`.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        console.log(`   ✅ ${uniqueScholarships.length} unique scholarships after dedup`);

        // ============================================
        // PHASE 3: Match and rank by user profile
        // ============================================
        console.log('📊 Matching scholarships to user profile...');

        const profile: UserProfile = {
            name: userProfile?.name || '',
            email: userProfile?.email || '',
            phone: userProfile?.phone || '',
            gpa: userProfile?.gpa || 3.0,
            major: userProfile?.major || 'Computer Science',
            university: userProfile?.currentCollege || '',
            graduationYear: userProfile?.graduationYear || new Date().getFullYear() + 2,
            skills: userProfile?.skills || [],
            workExperience: userProfile?.workExperience || [],
            projects: userProfile?.projects || [],
        };

        const matchedScholarships = matchAndRankScholarships(
            uniqueScholarships,
            profile,
            constraints,
            undefined,
            'match_score'
        );

        // Filter to top matches
        const topMatches = matchedScholarships
            .filter(m => m.passed_hard_filters)
            .slice(0, maxResults);

        console.log(`   ✅ ${topMatches.length} scholarships match your profile`);

        // ============================================
        // PHASE 4: Calculate aggregate stats
        // ============================================
        const stats = {
            totalDiscovered: allScholarships.length,
            uniqueScholarships: uniqueScholarships.length,
            eligibleScholarships: topMatches.length,
            totalPotentialValue: topMatches.reduce((sum, m) => {
                const scholarship = m.opportunity.scholarship_data;
                if (scholarship?.amount_value) {
                    return sum + scholarship.amount_value;
                }
                // Parse amount string
                const match = scholarship?.amount.match(/\$([0-9,]+)/);
                if (match) {
                    return sum + parseInt(match[1].replace(/,/g, ''));
                }
                return sum;
            }, 0),
            averageMatchScore: topMatches.length > 0
                ? Math.round(topMatches.reduce((sum, m) => sum + m.score, 0) / topMatches.length)
                : 0,
            sourcesScraped: sourcesUsed,
            discoveredAt: new Date().toISOString(),
        };

        console.log('✅ Discovery complete!');
        console.log(`   💰 Total potential value: $${stats.totalPotentialValue.toLocaleString()}`);
        console.log(`   📈 Average match: ${stats.averageMatchScore}%`);

        return NextResponse.json({
            success: true,
            scholarships: topMatches.map(m => m.opportunity.scholarship_data),
            stats,
        });

    } catch (error) {
        console.error('Scholarship discovery error:', error);
        return NextResponse.json({
            error: 'Failed to discover scholarships',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

// ============================================
// GET endpoint for scheduled/background discovery
// ============================================
export async function GET(request: NextRequest) {
    // This can be called by a cron job to update scholarship database weekly
    try {
        console.log('🔄 Running scheduled scholarship discovery...');

        // For GET, use default parameters (discover all for general profile)
        const defaultProfile = {
            gpa: 3.5,
            major: 'Computer Science',
            graduationYear: new Date().getFullYear() + 2,
        };

        const defaultConstraints = {
            citizenship: 'international',
            is_transfer_student: true,
            is_first_gen: false,
            is_low_income: false,
        };

        // Use the POST logic
        const mockRequest = {
            json: async () => ({
                userProfile: defaultProfile,
                constraints: defaultConstraints,
                sources: ['all'],
                maxResults: 200,
            }),
        } as any;

        const response = await POST(mockRequest);
        const data = await response.json();

        return NextResponse.json({
            success: true,
            message: 'Scheduled discovery complete',
            stats: data.stats,
        });

    } catch (error) {
        console.error('Scheduled discovery error:', error);
        return NextResponse.json({
            error: 'Scheduled discovery failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
