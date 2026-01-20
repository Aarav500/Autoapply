// ============================================
// EXAMPLE: Generate 15 CVs from Single Profile
// ============================================

import { CVCompiler, CVTarget, buildTargetList } from '@/lib/cv-compiler-v2';
import { extractExperienceGraph } from '@/lib/cv-compiler';

/**
 * STEP 1: Define your activities (as you already have them)
 */
const activities = [
  {
    id: '1',
    name: 'Supply Chain Optimization with Quantum Computing',
    role: 'ML Research Intern',
    organization: 'SAP',
    startDate: '2023-01',
    endDate: '2024-01',
    description: 'Researched quantum-inspired algorithms for inventory optimization. Applied ARIMA forecasting and quantum annealing (QUBO) to 1M+ SKUs. Achieved 23% reduction in stockouts, 97% service level. Paper under review at IEEE ICSIT 2024.',
    hoursPerWeek: 20,
    weeksPerYear: 52
  },
  {
    id: '2',
    name: 'Accessible Chess Platform',
    role: 'Founder & Lead Developer',
    organization: 'Independent Project',
    startDate: '2022-06',
    endDate: 'Present',
    description: 'Built accessibility-first online chess platform for visually impaired players. Implemented screen reader integration, haptic feedback. 500+ active users, 10K+ games played. Built with React, Node.js, WebSockets.',
    hoursPerWeek: 15,
    weeksPerYear: 50
  },
  {
    id: '3',
    name: 'Afghan Curriculum Translation',
    role: 'Founder & Project Lead',
    organization: 'Volunteer Initiative',
    startDate: '2021-09',
    endDate: 'Present',
    description: 'Led translation of educational materials for Afghan refugees. Coordinated team of 12 translators across 3 provinces. Translated 200+ pages of STEM curriculum. Materials now used by 500+ students.',
    hoursPerWeek: 10,
    weeksPerYear: 48
  },
  {
    id: '4',
    name: 'F1 Race Strategy Optimizer',
    role: 'Independent Researcher',
    organization: 'Personal Project',
    startDate: '2023-06',
    endDate: '2023-12',
    description: 'Developed ML model to optimize F1 pit stop timing using historical race data. Analyzed 5 seasons of telemetry (100K+ laps). Achieved 85% accuracy predicting optimal strategy. Used Python, XGBoost, Pandas.',
    hoursPerWeek: 12,
    weeksPerYear: 26
  },
  {
    id: '5',
    name: 'Rotary Youth Exchange Program',
    role: 'Exchange Student Ambassador',
    organization: 'Rotary International',
    startDate: '2020-08',
    endDate: '2021-07',
    description: 'Represented home country as cultural ambassador. Gave 20+ presentations about culture and education system. Organized fundraiser raising $5K for local education initiatives.',
    hoursPerWeek: 5,
    weeksPerYear: 48
  }
];

const achievements = [
  {
    id: 'pub1',
    title: 'Quantum-Inspired Algorithms for Supply Chain Optimization',
    category: 'publication',
    date: '2024-03',
    description: 'Under review at IEEE International Conference on Smart IoT (ICSIT) 2024'
  },
  {
    id: 'award1',
    title: '1st Place - University Hackathon (ML Track)',
    category: 'award',
    date: '2023-11',
    description: 'Won first place for accessible technology project'
  }
];

const profile = {
  name: 'Aarav Shah',
  email: 'aarav.shah@example.com',
  phone: '+1-555-0123',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/aaravshah',
  github: 'github.com/aaravshah',
  researchPaper: 'Quantum Supply Chain Optimization (IEEE ICSIT 2024)',
  summary: 'ML researcher focused on operations research and accessible technology'
};

/**
 * STEP 2: Define 15 targets
 */
const targets: CVTarget[] = [
  // ========================================
  // RESEARCH TARGETS (PhD/Labs)
  // ========================================
  {
    id: 'mit-orc',
    name: 'MIT Operations Research Center',
    type: 'research',
    domains: ['Operations Research', 'Optimization', 'Machine Learning'],
    pageLimit: 4,
    description: 'PhD in Operations Research focusing on optimization algorithms'
  },
  {
    id: 'stanford-ai',
    name: 'Stanford AI Lab',
    type: 'research',
    domains: ['Artificial Intelligence', 'Machine Learning'],
    pageLimit: 3,
    description: 'Research in AI applications to real-world problems'
  },
  {
    id: 'berkeley-eecs',
    name: 'UC Berkeley EECS',
    type: 'research',
    domains: ['Computer Science', 'Optimization'],
    pageLimit: 3,
    description: 'Graduate research in computational optimization'
  },
  {
    id: 'cmu-ml',
    name: 'CMU Machine Learning Department',
    type: 'research',
    domains: ['Machine Learning', 'Deep Learning'],
    pageLimit: 3,
    description: 'Research in applied machine learning'
  },

  // ========================================
  // INDUSTRY TARGETS (Big Tech)
  // ========================================
  {
    id: 'google-ml',
    name: 'Google - ML Engineer',
    type: 'industry',
    description: 'Build production ML systems at scale. Requirements: Python, TensorFlow, distributed systems, ML deployment',
    keywords: ['python', 'tensorflow', 'ml', 'production', 'scale', 'distributed'],
    pageLimit: 2,
    maxExperiences: 6
  },
  {
    id: 'meta-swe',
    name: 'Meta - Software Engineer',
    type: 'industry',
    description: 'Build scalable backend systems. Requirements: Python, distributed systems, APIs, database optimization',
    keywords: ['python', 'backend', 'distributed', 'api', 'database', 'scale'],
    pageLimit: 2,
    maxExperiences: 6
  },
  {
    id: 'openai-research',
    name: 'OpenAI - Research Engineer',
    type: 'industry',
    description: 'Develop and deploy large-scale ML models. Requirements: PyTorch, transformers, distributed training',
    keywords: ['pytorch', 'ml', 'transformers', 'distributed', 'research'],
    pageLimit: 2,
    maxExperiences: 6
  },
  {
    id: 'amazon-sde',
    name: 'Amazon - SDE II',
    type: 'industry',
    description: 'Build AWS-based ML solutions for supply chain. Requirements: AWS, Python, ML, optimization',
    keywords: ['aws', 'python', 'ml', 'optimization', 'supply chain'],
    pageLimit: 2,
    maxExperiences: 6
  },
  {
    id: 'two-sigma-quant',
    name: 'Two Sigma - Quantitative Researcher',
    type: 'industry',
    description: 'Develop trading algorithms using ML. Requirements: Python, statistics, ML, optimization, algorithms',
    keywords: ['python', 'statistics', 'ml', 'optimization', 'algorithms'],
    pageLimit: 2,
    maxExperiences: 5
  },

  // ========================================
  // COLLEGE TARGETS (Undergrad Admissions)
  // ========================================
  {
    id: 'harvard',
    name: 'Harvard University',
    type: 'college',
    pageLimit: 3,
    maxExperiences: 10
  },
  {
    id: 'yale',
    name: 'Yale University',
    type: 'college',
    pageLimit: 3,
    maxExperiences: 10
  },
  {
    id: 'princeton',
    name: 'Princeton University',
    type: 'college',
    pageLimit: 3,
    maxExperiences: 10
  },
  {
    id: 'caltech',
    name: 'Caltech',
    type: 'college',
    pageLimit: 2,
    maxExperiences: 8
  },
  {
    id: 'columbia',
    name: 'Columbia University',
    type: 'college',
    pageLimit: 3,
    maxExperiences: 10
  },
  {
    id: 'uchicago',
    name: 'University of Chicago',
    type: 'college',
    pageLimit: 3,
    maxExperiences: 10
  }
];

/**
 * STEP 3: Extract experience graph
 */
const experiences = extractExperienceGraph(activities, achievements);

console.log(`📊 Extracted ${experiences.length} experience nodes:`);
experiences.forEach((exp, i) => {
  console.log(`  ${i + 1}. ${exp.title}`);
  console.log(`     Category: ${exp.category}`);
  console.log(`     Methods: ${exp.methods.join(', ') || 'None'}`);
  console.log(`     Outcomes: ${exp.outcomes.metrics.length} metrics, ${exp.outcomes.publications?.length || 0} pubs`);
  console.log('');
});

/**
 * STEP 4: Generate all CVs
 */
const compiler = new CVCompiler(experiences, profile);
const results = compiler.compileAll(targets);

console.log('\n🎯 CV Generation Complete\n');
console.log('═'.repeat(60));

results.forEach((cv, i) => {
  console.log(`\n${i + 1}. ${cv.targetName} (${cv.mode.toUpperCase()})`);
  console.log('─'.repeat(60));
  console.log(`   Signal: ${cv.metadata.signal.toUpperCase()}`);
  console.log(`   Experiences: ${cv.metadata.experienceCount}`);
  console.log(`   Publications: ${cv.metadata.publicationCount}`);
  console.log(`   Words: ${cv.metadata.wordCount}`);
  console.log(`   Pages: ${cv.metadata.pageEstimate} (limit: ${targets[i].pageLimit})`);

  if (cv.metadata.violations.length > 0) {
    console.log(`   ⚠️  Violations: ${cv.metadata.violations.length}`);
    cv.metadata.violations.forEach(v => console.log(`      - ${v}`));
  }

  if (cv.metadata.warnings.length > 0) {
    console.log(`   ⚠️  Warnings: ${cv.metadata.warnings.length}`);
    cv.metadata.warnings.slice(0, 3).forEach(w => console.log(`      - ${w}`));
    if (cv.metadata.warnings.length > 3) {
      console.log(`      ... and ${cv.metadata.warnings.length - 3} more`);
    }
  }
});

/**
 * STEP 5: Summary by mode
 */
console.log('\n\n📈 Summary by Mode\n');
console.log('═'.repeat(60));

const byMode = {
  research: results.filter(r => r.mode === 'research'),
  industry: results.filter(r => r.mode === 'industry'),
  college: results.filter(r => r.mode === 'college')
};

Object.entries(byMode).forEach(([mode, cvs]) => {
  const avgExps = cvs.reduce((sum, cv) => sum + cv.metadata.experienceCount, 0) / cvs.length;
  const avgWords = cvs.reduce((sum, cv) => sum + cv.metadata.wordCount, 0) / cvs.length;
  const elite = cvs.filter(cv => cv.metadata.signal === 'elite').length;

  console.log(`\n${mode.toUpperCase()}: ${cvs.length} CVs`);
  console.log(`  Avg Experiences: ${avgExps.toFixed(1)}`);
  console.log(`  Avg Words: ${avgWords.toFixed(0)}`);
  console.log(`  Elite Signal: ${elite}/${cvs.length}`);
});

/**
 * STEP 6: Show sample CV content (first research CV)
 */
const sampleCV = results.find(r => r.mode === 'research');
if (sampleCV) {
  console.log('\n\n📄 Sample CV: ' + sampleCV.targetName + '\n');
  console.log('═'.repeat(60));
  console.log(sampleCV.content.substring(0, 800) + '\n...\n');
}

/**
 * STEP 7: Quality check
 */
console.log('\n🔍 Quality Check\n');
console.log('═'.repeat(60));

const totalViolations = results.reduce((sum, cv) => sum + cv.metadata.violations.length, 0);
const totalWarnings = results.reduce((sum, cv) => sum + cv.metadata.warnings.length, 0);
const eliteCount = results.filter(r => r.metadata.signal === 'elite').length;
const strongCount = results.filter(r => r.metadata.signal === 'strong').length;

console.log(`\n✅ PASS Criteria:`);
console.log(`   - Zero ban list violations: ${totalViolations === 0 ? '✅' : '❌ ' + totalViolations}`);
console.log(`   - All CVs have signal: ${results.every(r => r.metadata.signal !== 'weak') ? '✅' : '❌'}`);
console.log(`   - Elite/Strong ratio: ${eliteCount + strongCount}/${results.length}`);
console.log(`   - Avg warnings per CV: ${(totalWarnings / results.length).toFixed(1)}`);

/**
 * STEP 8: Export to files (optional)
 */
console.log('\n\n💾 Export Commands:\n');
console.log('═'.repeat(60));
console.log(`
// Save all CVs to files:
results.forEach(cv => {
  const filename = \`CV_\${cv.targetId}.md\`;
  fs.writeFileSync(filename, cv.content);
  console.log(\`✓ Saved: \${filename}\`);
});

// Or send to API:
fetch('/api/cv/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    activities,
    achievements,
    profile,
    targets
  })
}).then(r => r.json()).then(data => {
  console.log('CVs generated:', data.summary);
});
`);

console.log('\n✅ Done! Generated 15 radically different CVs from same profile.\n');

/**
 * EXPECTED OUTPUT:
 *
 * - MIT ORC: 4 pages, research-heavy, publications emphasized
 * - Stanford AI: 3 pages, research + systems
 * - Google ML: 2 pages, production ML, SAP experience featured
 * - Meta SWE: 2 pages, systems + scale
 * - Harvard: 3 pages, leadership + research + service (includes Afghan project)
 * - Yale: 3 pages, similar to Harvard but different emphasis
 *
 * Each CV:
 * - Uses DIFFERENT experiences
 * - Different LENGTH
 * - Different TONE
 * - Same TRUTH
 */

export { targets, compiler, results };
