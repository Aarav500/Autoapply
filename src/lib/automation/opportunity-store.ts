// Opportunity storage and management

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  location?: string;
  description: string;
  requirements?: string[];
  skills?: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  url: string;
  source: string;
  postedAt?: Date;
  scrapedAt: Date;
  isRemote?: boolean;
  experienceLevel?: string;
  employmentType?: string;
}

export interface OpportunityStore {
  opportunities: Map<string, Opportunity>;
  add(opportunity: Opportunity): void;
  get(id: string): Opportunity | undefined;
  getAll(): Opportunity[];
  remove(id: string): void;
  clear(): void;
}

// In-memory opportunity store
class InMemoryOpportunityStore implements OpportunityStore {
  opportunities: Map<string, Opportunity> = new Map();

  add(opportunity: Opportunity): void {
    this.opportunities.set(opportunity.id, opportunity);
  }

  get(id: string): Opportunity | undefined {
    return this.opportunities.get(id);
  }

  getAll(): Opportunity[] {
    return Array.from(this.opportunities.values());
  }

  remove(id: string): void {
    this.opportunities.delete(id);
  }

  clear(): void {
    this.opportunities.clear();
  }
}

// Singleton instance
export const opportunityStore = new InMemoryOpportunityStore();
