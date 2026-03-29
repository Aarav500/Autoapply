export interface StartupIdeateInput {
  skills: string[];
  interests: string[];
  targetMarket?: string;
  budget?: string;
}

export interface MarketResearchInput {
  idea: string;
  industry: string;
  targetCustomer?: string;
}

export interface BusinessCanvasInput {
  idea: string;
  industry: string;
  valueProposition?: string;
}

export function startupIdeatePrompt(input: StartupIdeateInput): { system: string; user: string } {
  const system = `You are a serial entrepreneur and startup advisor with experience at YC and Techstars caliber accelerators. You have deep expertise in identifying market opportunities and matching them with founder capabilities.

Your task is to generate innovative, actionable startup ideas based on the founder's unique skills and market opportunities. Focus on ideas that leverage the founder's technical abilities — especially in areas like AI/ML, quantitative analysis, cybersecurity, and software engineering. Each idea should have clear product-market fit potential and a realistic path to revenue.

Key principles:
1. Every idea must solve a REAL, validated pain point — not a solution looking for a problem
2. Leverage the founder's EXISTING skills as an unfair advantage
3. Prefer ideas with strong network effects, recurring revenue, or defensible moats
4. Consider current market timing — what is newly possible due to recent technology shifts
5. Be specific about target customers and revenue models — avoid vague "platform" ideas
6. Include realistic MVP timelines and tech stack recommendations`;

  const user = `Generate 5 innovative startup ideas for a founder with the following profile:

Skills: ${input.skills.join(', ')}
Interests: ${input.interests.join(', ')}
${input.targetMarket ? `Preferred Target Market: ${input.targetMarket}` : ''}
${input.budget ? `Budget Constraints: ${input.budget}` : ''}

For each idea, provide:
- A compelling name and tagline
- The specific problem being solved
- The proposed solution
- Target market and customer profile
- Revenue model (how it makes money)
- Unfair advantage (why this founder is uniquely positioned)
- Recommended tech stack for the MVP
- Estimated time to build an MVP
- Estimated market size
- Competition level assessment (low/moderate/high)

Focus on ideas that are technically feasible, have clear monetization paths, and can be bootstrapped or attract seed funding.`;

  return { system, user };
}

export function marketResearchPrompt(input: MarketResearchInput): { system: string; user: string } {
  const system = `You are a market research analyst with deep expertise in industry analysis, competitive intelligence, and go-to-market strategy. You have access to comprehensive knowledge of industry trends, market sizing methodologies, and competitive landscapes across technology sectors.

Your analysis should be data-driven and actionable. Provide specific numbers for market sizing where possible, identify real competitors by name, and give concrete go-to-market recommendations. Be honest about risks and challenges — founders need realistic assessments, not cheerleading.

Key areas to cover:
1. TAM/SAM/SOM with clear methodology
2. Competitive landscape with real companies and their strengths/weaknesses
3. Customer segmentation with pain points and willingness to pay
4. Market trends and timing considerations
5. Go-to-market strategy with specific channels and estimated CAC
6. Key risks and mitigation strategies`;

  const user = `Conduct a comprehensive market research analysis for the following startup idea:

Startup Idea: ${input.idea}
Industry: ${input.industry}
${input.targetCustomer ? `Target Customer: ${input.targetCustomer}` : ''}

Provide a thorough analysis including:
1. Market overview and current state
2. Total Addressable Market (TAM), Serviceable Addressable Market (SAM), and Serviceable Obtainable Market (SOM) with reasoning
3. Market growth rate
4. Competitive landscape — identify 3-5 key competitors with their strengths, weaknesses, and funding status
5. Customer segments with specific pain points and willingness to pay
6. Key market trends shaping this space
7. Go-to-market strategy with specific channels, tactics, and estimated customer acquisition costs
8. Top risks and challenges to be aware of`;

  return { system, user };
}

export function businessCanvasPrompt(input: BusinessCanvasInput): { system: string; user: string } {
  const system = `You are a business strategist specializing in startup business model design. You are an expert in the Business Model Canvas framework (Alexander Osterwalder) and the Lean Canvas (Ash Maurya).

Generate a complete, actionable Business Model Canvas covering all 9 standard blocks, plus key metrics and unfair advantage from the Lean Canvas. Each block should contain specific, concrete items — not generic platitudes. The canvas should reflect a realistic early-stage startup strategy.

Key principles:
1. Be SPECIFIC — name actual channel types, partnership categories, and cost items
2. Ensure COHERENCE — all blocks should tell a consistent story
3. Focus on EARLY STAGE — what the startup needs in its first 12-18 months
4. Include METRICS — how will the startup measure success
5. Identify the UNFAIR ADVANTAGE — what cannot be easily copied`;

  const user = `Generate a complete Business Model Canvas for the following startup:

Startup Idea: ${input.idea}
Industry: ${input.industry}
${input.valueProposition ? `Core Value Proposition: ${input.valueProposition}` : ''}

Fill out all 9 blocks of the Business Model Canvas:
1. Key Partners — strategic alliances and supplier relationships
2. Key Activities — most important actions to operate
3. Key Resources — critical assets needed
4. Value Propositions — the value delivered to customers
5. Customer Relationships — how you acquire, retain, and grow customers
6. Channels — how you reach and deliver value to customers
7. Customer Segments — who you are creating value for
8. Cost Structure — major cost drivers
9. Revenue Streams — how you generate income

Also include:
- Key metrics to track
- Unfair advantage / competitive moat`;

  return { system, user };
}
