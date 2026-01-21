'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// DEADLINE INTELLIGENCE & FINANCIAL OPTIMIZER
// Optimizes application strategy for maximum ROI
// ============================================

interface OptimizationRequest {
    scholarships: {
        id: string;
        name: string;
        amount: string;
        amountValue?: number;
        deadline: string;
        matchScore: number;
        successProbability?: number;
        estimatedTimeToApply?: number; // minutes
        category: string;
    }[];
    constraints?: {
        maxTimeAvailable?: number; // minutes per week
        prioritizeAmount?: boolean;
        prioritizeDeadline?: boolean;
        prioritizeProbability?: boolean;
    };
}

// Helper: Parse amount to numeric value
function parseAmount(amount: string): number {
    // Extract first number from string
    const match = amount.match(/\$?([0-9,]+)/);
    if (match) {
        return parseInt(match[1].replace(/,/g, ''));
    }
    return 0;
}

// Helper: Calculate days until deadline
function daysUntilDeadline(deadline: string): number {
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// Helper: Calculate expected value
function calculateExpectedValue(scholarship: any): number {
    const amount = scholarship.amountValue || parseAmount(scholarship.amount);
    const probability = (scholarship.successProbability || scholarship.matchScore) / 100;
    return amount * probability;
}

// Helper: Calculate urgency score
function calculateUrgency(scholarship: any): number {
    const daysLeft = daysUntilDeadline(scholarship.deadline);

    if (daysLeft <= 0) return 0;
    if (daysLeft <= 7) return 100;
    if (daysLeft <= 14) return 90;
    if (daysLeft <= 30) return 75;
    if (daysLeft <= 60) return 50;
    if (daysLeft <= 90) return 30;
    return 10;
}

// Helper: Calculate ROI score
function calculateROI(scholarship: any): number {
    const expectedValue = calculateExpectedValue(scholarship);
    const timeToApply = scholarship.estimatedTimeToApply || 60; // default 60 minutes

    // ROI = Expected value per hour of work
    const roi = expectedValue / (timeToApply / 60);

    return Math.round(roi);
}

export async function POST(request: NextRequest) {
    try {
        const body: OptimizationRequest = await request.json();
        const { scholarships, constraints = {} } = body;

        console.log(`🎯 Optimizing strategy for ${scholarships.length} scholarships...`);

        // Default constraints
        const {
            maxTimeAvailable = 600, // 10 hours per week
            prioritizeAmount = false,
            prioritizeDeadline = false,
            prioritizeProbability = false,
        } = constraints;

        // ============================================
        // PHASE 1: Calculate metrics for each scholarship
        // ============================================
        console.log('📊 Phase 1: Calculating metrics...');

        const enrichedScholarships = scholarships.map(s => {
            const amountValue = s.amountValue || parseAmount(s.amount);
            const daysLeft = daysUntilDeadline(s.deadline);
            const expectedValue = calculateExpectedValue(s);
            const urgency = calculateUrgency(s);
            const roi = calculateROI(s);

            return {
                ...s,
                amountValue,
                daysUntilDeadline: daysLeft,
                expectedValue,
                urgencyScore: urgency,
                roiScore: roi,
                estimatedTimeToApply: s.estimatedTimeToApply || 60,
            };
        });

        // ============================================
        // PHASE 2: Calculate priority score
        // ============================================
        console.log('🎲 Phase 2: Calculating priority scores...');

        const scoredScholarships = enrichedScholarships.map(s => {
            let priorityScore = 0;

            // Base: Expected value (30%)
            const maxExpectedValue = Math.max(...enrichedScholarships.map(x => x.expectedValue));
            priorityScore += (s.expectedValue / maxExpectedValue) * 30;

            // Urgency (25%)
            priorityScore += s.urgencyScore * 0.25;

            // ROI (25%)
            const maxROI = Math.max(...enrichedScholarships.map(x => x.roiScore));
            priorityScore += (s.roiScore / maxROI) * 25;

            // Match score (20%)
            priorityScore += s.matchScore * 0.20;

            // User preferences adjustments
            if (prioritizeAmount) {
                const amountBonus = (s.amountValue / Math.max(...enrichedScholarships.map(x => x.amountValue))) * 15;
                priorityScore += amountBonus;
            }

            if (prioritizeDeadline) {
                priorityScore += s.urgencyScore * 0.15;
            }

            if (prioritizeProbability && s.successProbability) {
                priorityScore += s.successProbability * 0.15;
            }

            return {
                ...s,
                priorityScore: Math.round(priorityScore),
            };
        });

        // Sort by priority score
        const sortedScholarships = scoredScholarships.sort((a, b) => b.priorityScore - a.priorityScore);

        // ============================================
        // PHASE 3: Build application timeline
        // ============================================
        console.log('📅 Phase 3: Building application timeline...');

        const timeline: any[] = [];
        let cumulativeTime = 0;

        for (const scholarship of sortedScholarships) {
            // Skip if past deadline
            if (scholarship.daysUntilDeadline <= 0) continue;

            // Check if we have time
            if (cumulativeTime + scholarship.estimatedTimeToApply > maxTimeAvailable) {
                // Out of time
                break;
            }

            timeline.push({
                scholarshipId: scholarship.id,
                scholarshipName: scholarship.name,
                priority: timeline.length + 1,
                recommendedWeek: Math.ceil(cumulativeTime / maxTimeAvailable) + 1,
                estimatedTime: scholarship.estimatedTimeToApply,
                deadline: scholarship.deadline,
                daysLeft: scholarship.daysUntilDeadline,
                expectedValue: scholarship.expectedValue,
                priorityScore: scholarship.priorityScore,
            });

            cumulativeTime += scholarship.estimatedTimeToApply;
        }

        console.log(`   ✅ Timeline created: ${timeline.length} scholarships`);

        // ============================================
        // PHASE 4: Calculate financial projections
        // ============================================
        console.log('💰 Phase 4: Calculating financial projections...');

        const includedScholarships = sortedScholarships.slice(0, timeline.length);

        const financialProjection = {
            totalPotentialValue: includedScholarships.reduce((sum, s) => sum + s.amountValue, 0),
            totalExpectedValue: includedScholarships.reduce((sum, s) => sum + s.expectedValue, 0),
            conservativeEstimate: Math.round(includedScholarships.reduce((sum, s) => sum + s.expectedValue, 0) * 0.5),
            optimisticEstimate: Math.round(includedScholarships.reduce((sum, s) => sum + s.expectedValue, 0) * 1.5),
            totalTimeRequired: cumulativeTime,
            averageROI: includedScholarships.reduce((sum, s) => sum + s.roiScore, 0) / includedScholarships.length,
            scholarshipsToApply: includedScholarships.length,
            scholarshipsSkipped: scholarships.length - includedScholarships.length,
        };

        console.log(`   💰 Expected value: $${financialProjection.totalExpectedValue.toLocaleString()}`);
        console.log(`   ⏱️ Time required: ${financialProjection.totalTimeRequired} minutes`);

        // ============================================
        // PHASE 5: Generate insights & recommendations
        // ============================================
        console.log('🔍 Phase 5: Generating insights...');

        const insights: string[] = [];
        const recommendations: string[] = [];

        // Insight: Most valuable opportunities
        const topValue = sortedScholarships.slice(0, 3);
        insights.push(`Top 3 by expected value: ${topValue.map(s => `${s.name} ($${s.expectedValue.toLocaleString()})`).join(', ')}`);

        // Insight: Urgent deadlines
        const urgent = sortedScholarships.filter(s => s.daysUntilDeadline <= 14 && s.daysUntilDeadline > 0);
        if (urgent.length > 0) {
            insights.push(`${urgent.length} scholarships have urgent deadlines (≤14 days)`);
            recommendations.push(`Prioritize: ${urgent.slice(0, 3).map(s => s.name).join(', ')}`);
        }

        // Insight: High ROI opportunities
        const highROI = sortedScholarships.filter(s => s.roiScore > 1000);
        if (highROI.length > 0) {
            insights.push(`${highROI.length} scholarships have exceptional ROI (>$1000/hour)`);
            recommendations.push('Focus on high-ROI scholarships first for maximum efficiency');
        }

        // Recommendation: Time allocation
        const weeksNeeded = Math.ceil(financialProjection.totalTimeRequired / maxTimeAvailable);
        recommendations.push(`Allocate ${weeksNeeded} week(s) to complete all ${includedScholarships.length} applications`);

        // Recommendation: Skipped scholarships
        if (financialProjection.scholarshipsSkipped > 0) {
            const skippedValue = scholarships.slice(timeline.length).reduce((sum, s) => sum + (s.amountValue || parseAmount(s.amount)), 0);
            recommendations.push(`${financialProjection.scholarshipsSkipped} scholarships skipped due to time constraints (potential value: $${skippedValue.toLocaleString()})`);

            if (maxTimeAvailable < 600) {
                recommendations.push('Consider increasing weekly time budget to capture more opportunities');
            }
        }

        // Recommendation: Expected outcome
        const expectedScholarshipsWon = includedScholarships.filter(s => (s.successProbability || s.matchScore) > 70).length;
        recommendations.push(`Based on success probabilities, expect to win ${Math.max(1, Math.round(expectedScholarshipsWon * 0.3))} to ${Math.round(expectedScholarshipsWon * 0.5)} scholarships`);

        console.log('✅ Optimization complete!');

        return NextResponse.json({
            success: true,
            strategy: {
                totalScholarships: scholarships.length,
                recommendedToApply: includedScholarships.length,
                priorityOrder: sortedScholarships.map((s, i) => ({
                    rank: i + 1,
                    scholarshipId: s.id,
                    name: s.name,
                    priorityScore: s.priorityScore,
                    expectedValue: s.expectedValue,
                    daysLeft: s.daysUntilDeadline,
                    roiScore: s.roiScore,
                })),
                timeline,
                financialProjection,
            },
            insights,
            recommendations,
            metadata: {
                optimizedAt: new Date().toISOString(),
                constraints,
            },
        });

    } catch (error) {
        console.error('Strategy optimization error:', error);
        return NextResponse.json({
            error: 'Failed to optimize strategy',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
