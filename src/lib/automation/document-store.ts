// ============================================
// DOCUMENT STORAGE
// Stores generated CVs, essays, cover letters per opportunity
// ============================================

import { Opportunity } from './opportunity-store';
import { generateAllContent, TailoredContent } from './content-tailor';
import { DEFAULT_PROFILE, UserProfile } from './user-profile';
import { browserManager } from './browser';

export interface StoredDocument {
    id: string;
    opportunityId: string;
    opportunityTitle: string;
    organization: string;
    type: 'cv' | 'essay' | 'cover_letter';
    content: string;
    createdAt: Date;
    opportunityType: 'job' | 'scholarship';
    opportunityUrl: string;
    matchScore: number;
}

export interface OpportunityDocuments {
    opportunity: Opportunity;
    cv: StoredDocument | null;
    essay: StoredDocument | null;
    coverLetter: StoredDocument | null;
    generatedAt: Date;
}

// In-memory document storage (persists during session)
const documentStore: Map<string, OpportunityDocuments> = new Map();

/**
 * Generate and store all documents for an opportunity
 */
export function generateAndStoreDocuments(
    opportunity: Opportunity,
    profile: UserProfile = DEFAULT_PROFILE
): OpportunityDocuments {
    const existing = documentStore.get(opportunity.id);
    if (existing) {
        browserManager.log(`📄 Documents already exist for: ${opportunity.title}`);
        return existing;
    }

    browserManager.log(`📝 Generating documents for: ${opportunity.title} @ ${opportunity.organization}`);

    const tailored = generateAllContent(opportunity, profile);
    const now = new Date();

    const docs: OpportunityDocuments = {
        opportunity,
        cv: tailored.cv ? {
            id: `doc_cv_${opportunity.id}`,
            opportunityId: opportunity.id,
            opportunityTitle: opportunity.title,
            organization: opportunity.organization,
            type: 'cv',
            content: tailored.cv,
            createdAt: now,
            opportunityType: opportunity.type,
            opportunityUrl: opportunity.url,
            matchScore: opportunity.matchScore,
        } : null,
        essay: tailored.essay ? {
            id: `doc_essay_${opportunity.id}`,
            opportunityId: opportunity.id,
            opportunityTitle: opportunity.title,
            organization: opportunity.organization,
            type: 'essay',
            content: tailored.essay,
            createdAt: now,
            opportunityType: opportunity.type,
            opportunityUrl: opportunity.url,
            matchScore: opportunity.matchScore,
        } : null,
        coverLetter: tailored.coverLetter ? {
            id: `doc_cover_${opportunity.id}`,
            opportunityId: opportunity.id,
            opportunityTitle: opportunity.title,
            organization: opportunity.organization,
            type: 'cover_letter',
            content: tailored.coverLetter,
            createdAt: now,
            opportunityType: opportunity.type,
            opportunityUrl: opportunity.url,
            matchScore: opportunity.matchScore,
        } : null,
        generatedAt: now,
    };

    documentStore.set(opportunity.id, docs);
    browserManager.log(`✅ Documents generated for: ${opportunity.title}`);

    return docs;
}

/**
 * Get all stored documents
 */
export function getAllDocuments(): OpportunityDocuments[] {
    return Array.from(documentStore.values()).sort(
        (a, b) => b.opportunity.matchScore - a.opportunity.matchScore
    );
}

/**
 * Get documents for a specific opportunity
 */
export function getDocumentsForOpportunity(opportunityId: string): OpportunityDocuments | null {
    return documentStore.get(opportunityId) || null;
}

/**
 * Get all CVs
 */
export function getAllCVs(): StoredDocument[] {
    return getAllDocuments()
        .filter(d => d.cv !== null)
        .map(d => d.cv!);
}

/**
 * Get all essays
 */
export function getAllEssays(): StoredDocument[] {
    return getAllDocuments()
        .filter(d => d.essay !== null)
        .map(d => d.essay!);
}

/**
 * Get all cover letters
 */
export function getAllCoverLetters(): StoredDocument[] {
    return getAllDocuments()
        .filter(d => d.coverLetter !== null)
        .map(d => d.coverLetter!);
}

/**
 * Get document stats
 */
export function getDocumentStats(): {
    totalOpportunities: number;
    totalCVs: number;
    totalEssays: number;
    totalCoverLetters: number;
    jobDocuments: number;
    scholarshipDocuments: number;
} {
    const all = getAllDocuments();
    return {
        totalOpportunities: all.length,
        totalCVs: all.filter(d => d.cv !== null).length,
        totalEssays: all.filter(d => d.essay !== null).length,
        totalCoverLetters: all.filter(d => d.coverLetter !== null).length,
        jobDocuments: all.filter(d => d.opportunity.type === 'job').length,
        scholarshipDocuments: all.filter(d => d.opportunity.type === 'scholarship').length,
    };
}

/**
 * Get document by ID
 */
export function getDocumentById(docId: string): StoredDocument | null {
    for (const docs of documentStore.values()) {
        if (docs.cv?.id === docId) return docs.cv;
        if (docs.essay?.id === docId) return docs.essay;
        if (docs.coverLetter?.id === docId) return docs.coverLetter;
    }
    return null;
}

/**
 * Clear all documents
 */
export function clearAllDocuments(): void {
    documentStore.clear();
    browserManager.log('🗑️ All documents cleared');
}

/**
 * Export all documents as JSON (for download)
 */
export function exportAllDocuments(): string {
    const all = getAllDocuments();
    return JSON.stringify(all, null, 2);
}
