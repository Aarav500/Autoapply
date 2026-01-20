// College Research Database
// Contains detailed information about each target college for personalized essay writing

export interface CollegeInfo {
    id: string;
    name: string;
    fullName: string;
    location: string;
    deadline: Date;
    deadlineType: 'priority' | 'regular' | 'rolling';
    timezone: string;

    // Essay Requirements
    essays: {
        id: string;
        title: string;
        prompt: string;
        wordLimit: number;
        required: boolean;
    }[];

    // Research Data for Personalization
    research: {
        motto: string;
        values: string[];
        culture: string;
        notablePrograms: string[];
        famousAlumni: string[];
        uniqueFeatures: string[];
        campusVibe: string;
        whatTheyLookFor: string[];
        recentNews: string[];
        studentLife: string;
    };

    // Transfer-specific info
    transferInfo: {
        acceptanceRate: string;
        avgGPA: string;
        requirements: string[];
        tips: string[];
    };

    // Application Portal
    applicationUrl: string;
    portalUrl: string;
}

export const targetColleges: CollegeInfo[] = [
    {
        id: 'mit',
        name: 'MIT',
        fullName: 'Massachusetts Institute of Technology',
        location: 'Cambridge, MA',
        deadline: new Date('2026-03-01T23:59:00-05:00'),
        deadlineType: 'regular',
        timezone: 'America/New_York',
        essays: [
            {
                id: 'mit-1',
                title: 'Why This Field',
                prompt: 'What field of study appeals to you the most right now? Tell us more about why this field of study at MIT appeals to you.',
                wordLimit: 100,
                required: true,
            },
            {
                id: 'mit-2',
                title: 'Something You Do for Pleasure',
                prompt: 'We know you lead a busy life, full of activities, many of which are required of you. Tell us about something you do simply for the pleasure of it.',
                wordLimit: 150,
                required: true,
            },
            {
                id: 'mit-3',
                title: 'Done Something Different',
                prompt: 'While some reach their goals following well-trodden paths, others blaze their own trails achieving the unexpected. In what ways have you done something different than what was expected in your educational journey?',
                wordLimit: 225,
                required: true,
            },
            {
                id: 'mit-4',
                title: 'Collaboration',
                prompt: 'MIT brings people with diverse backgrounds together to collaborate, from tackling the world\'s biggest challenges to lending a helping hand. Describe one way you have collaborated with others to learn from them, with them, or contribute to your community together.',
                wordLimit: 225,
                required: true,
            },
            {
                id: 'mit-5',
                title: 'Unexpected Situation',
                prompt: 'How did you manage a situation or challenge that you didn\'t expect? What did you learn from it?',
                wordLimit: 225,
                required: true,
            },
        ],
        research: {
            motto: 'Mens et Manus (Mind and Hand)',
            values: ['Innovation', 'Collaboration', 'Impact', 'Intellectual Curiosity', 'Hands-on Learning', 'Problem Solving'],
            culture: 'MIT celebrates "productive weirdness" - students who are deeply passionate about their interests. The culture emphasizes collaboration over competition, with students often working together on problem sets. There\'s a strong maker culture with hackerspaces and project-based learning.',
            notablePrograms: ['Computer Science (EECS)', 'Mechanical Engineering', 'Physics', 'Mathematics', 'Media Lab', 'AI/ML Research'],
            famousAlumni: ['Buzz Aldrin', 'Kofi Annan', 'Drew Houston (Dropbox)', 'Amar Bose', 'I.M. Pei'],
            uniqueFeatures: ['UROP (Undergraduate Research)', 'Pass/No Record first semester', 'IAP (Independent Activities Period)', 'Living Learning Communities', 'Strong entrepreneurship culture'],
            campusVibe: 'Quirky, intense, collaborative. Students are genuinely excited about learning. Pranks ("hacks") are celebrated as creative expression.',
            whatTheyLookFor: ['Genuine intellectual curiosity', 'Collaborative spirit', 'Hands-on problem solving', 'Initiative and self-direction', 'Authentic passion projects'],
            recentNews: ['AI research breakthroughs', 'Climate change initiatives', 'New computing building', 'Quantum computing advances'],
            studentLife: 'Tight-knit communities in dorms and fraternities. Students joke about "drinking from the firehose" - the intense academic load. But there\'s also strong support systems and genuine camaraderie.',
        },
        transferInfo: {
            acceptanceRate: '~4%',
            avgGPA: '4.0',
            requirements: ['Strong STEM background', 'Research experience preferred', 'Clear academic goals'],
            tips: ['Show genuine intellectual passion', 'Highlight collaborative projects', 'Be authentic about your interests'],
        },
        applicationUrl: 'https://apply.mitadmissions.org/',
        portalUrl: 'https://my.mit.edu/',
    },
    {
        id: 'stanford',
        name: 'Stanford',
        fullName: 'Stanford University',
        location: 'Stanford, CA',
        deadline: new Date('2026-03-15T23:59:00-08:00'),
        deadlineType: 'regular',
        timezone: 'America/Los_Angeles',
        essays: [
            {
                id: 'stanford-1',
                title: 'Transfer Statement',
                prompt: 'Please address your reasons for transferring to Stanford and the objectives you hope to achieve.',
                wordLimit: 650,
                required: true,
            },
            {
                id: 'stanford-2',
                title: 'Advice to Younger Self',
                prompt: 'What piece of advice would you share with your younger self? Describe what experience or realization led you to this understanding.',
                wordLimit: 150,
                required: true,
            },
            {
                id: 'stanford-3',
                title: 'Excited About Learning',
                prompt: 'The Stanford community is deeply curious and driven to learn in and out of the classroom. Reflect on an idea or experience that makes you genuinely excited about learning.',
                wordLimit: 250,
                required: true,
            },
            {
                id: 'stanford-4',
                title: 'Roommate Letter OR Community',
                prompt: 'Choose one: (A) Write a note to your future roommate that reveals something about you or that will help your roommate and us get to know you better, or (B) Stanford\'s community is an essential part of the undergraduate experience. How do you define community, and what contributions have you made to yours?',
                wordLimit: 250,
                required: true,
            },
        ],
        research: {
            motto: 'Die Luft der Freiheit weht (The wind of freedom blows)',
            values: ['Innovation', 'Entrepreneurship', 'Interdisciplinary Learning', 'Freedom of Thought', 'Impact'],
            culture: 'Stanford has an entrepreneurial DNA. Students are encouraged to think big and take risks. There\'s less competition and more "we\'re all figuring it out together" vibe. Silicon Valley is literally next door.',
            notablePrograms: ['Computer Science', 'Human-Computer Interaction', 'd.school (Design Thinking)', 'Stanford AI Lab', 'Graduate School of Business'],
            famousAlumni: ['Larry Page & Sergey Brin (Google)', 'Elon Musk', 'Tiger Woods', 'Reese Witherspoon', 'John F. Kennedy'],
            uniqueFeatures: ['No required courses', 'Cardinal Quarter (study abroad)', 'STVP (entrepreneurship)', 'd.school design thinking', 'StartX accelerator'],
            campusVibe: 'Sunny, optimistic, entrepreneurial. Beautiful campus with red-tile roofs. Students are ambitious but not cutthroat.',
            whatTheyLookFor: ['Intellectual vitality', 'Leadership potential', 'Diverse perspectives', 'Entrepreneurial mindset', 'Genuine curiosity'],
            recentNews: ['AI ethics research', 'Climate and sustainability initiatives', 'Knight-Hennessy Scholars program'],
            studentLife: 'Beautiful weather year-round. Strong Greek life and athletic culture. Easy access to SF and Silicon Valley for internships and networking.',
        },
        transferInfo: {
            acceptanceRate: '~2%',
            avgGPA: '3.9+',
            requirements: ['Exceptional academics', 'Clear vision for future', 'Unique perspective or experience'],
            tips: ['Be authentic and reflective', 'Show intellectual curiosity beyond grades', 'Demonstrate initiative'],
        },
        applicationUrl: 'https://admission.stanford.edu/apply/',
        portalUrl: 'https://axess.stanford.edu/',
    },
    {
        id: 'cmu',
        name: 'Carnegie Mellon',
        fullName: 'Carnegie Mellon University',
        location: 'Pittsburgh, PA',
        deadline: new Date('2026-02-16T23:59:00-05:00'),
        deadlineType: 'regular',
        timezone: 'America/New_York',
        essays: [
            {
                id: 'cmu-1',
                title: 'Passion for Major',
                prompt: 'Most students choose their intended major or area of study based on a passion or inspiration that\'s developed over time – what passion or inspiration led you to choose this area of study?',
                wordLimit: 300,
                required: true,
            },
            {
                id: 'cmu-2',
                title: 'Successful College Experience',
                prompt: 'Many students pursue college for a specific degree, career opportunity, or personal goal. Whichever it may be, learning will be critical to achieving your ultimate goal. As you think ahead to the process of learning during your college years, how will you define a successful college experience?',
                wordLimit: 300,
                required: true,
            },
            {
                id: 'cmu-3',
                title: 'What to Emphasize',
                prompt: 'Consider your application as a whole. What do you personally want to emphasize about your application for the admission committee\'s consideration? Highlight something that\'s important to you or something you haven\'t had a chance to share.',
                wordLimit: 300,
                required: true,
            },
        ],
        research: {
            motto: 'My heart is in the work',
            values: ['Technical Excellence', 'Creativity', 'Hard Work', 'Collaboration', 'Innovation'],
            culture: 'CMU is intensely rigorous but also creative. It\'s one of the few places where art and technology are equally respected. Students work incredibly hard but support each other.',
            notablePrograms: ['School of Computer Science', 'Robotics Institute', 'Human-Computer Interaction', 'Entertainment Technology Center', 'Drama School'],
            famousAlumni: ['Andy Warhol', 'John Nash', 'Randy Pausch', 'James Gosling (Java)'],
            uniqueFeatures: ['Cross-disciplinary collaboration', 'World\'s first AI degree', 'Robotics leadership', 'Strong arts + tech fusion'],
            campusVibe: 'Hardworking, creative, collaborative. The "CMU workload" is real, but students genuinely love what they do.',
            whatTheyLookFor: ['Technical aptitude', 'Creative problem solving', 'Passion for specific field', 'Strong work ethic', 'Collaborative spirit'],
            recentNews: ['AI research advances', 'New robotics innovations', 'Climate tech initiatives'],
            studentLife: 'Close-knit community in Pittsburgh. Strong project-based learning culture. Students often pull all-nighters together.',
        },
        transferInfo: {
            acceptanceRate: '~7%',
            avgGPA: '3.7+',
            requirements: ['Strong technical background', 'Clear interest in specific school', 'Problem-solving skills'],
            tips: ['Be specific about which school/program', 'Show technical projects', 'Demonstrate creativity'],
        },
        applicationUrl: 'https://apply.cmu.edu/',
        portalUrl: 'https://s3.as.cmu.edu/',
    },
    {
        id: 'nyu',
        name: 'NYU',
        fullName: 'New York University',
        location: 'New York, NY',
        deadline: new Date('2026-03-15T23:59:00-04:00'),
        deadlineType: 'regular',
        timezone: 'America/New_York',
        essays: [
            {
                id: 'nyu-1',
                title: 'Transfer Statement',
                prompt: 'Please provide a statement that addresses your reason(s) for seeking transfer and the objectives you hope to achieve. How can NYU and the particular school, college, program, and/or area of study you are applying to support those goals?',
                wordLimit: 500,
                required: true,
            },
            {
                id: 'nyu-2',
                title: 'Bridge Builders (Optional)',
                prompt: 'NYU is looking for bridge builders who can connect people, groups, and ideas. Describe how your experiences have helped you understand the qualities and efforts needed to bridge divides and foster understanding.',
                wordLimit: 250,
                required: false,
            },
        ],
        research: {
            motto: 'Perstare et praestare (To persevere and to excel)',
            values: ['Global Perspective', 'Urban Engagement', 'Diversity', 'Innovation', 'Creativity'],
            culture: 'NYU is the ultimate urban university. New York IS your campus. Students are independent, ambitious, and globally minded.',
            notablePrograms: ['Stern School of Business', 'Tisch School of the Arts', 'Tandon Engineering', 'Courant Mathematical Sciences', 'ITP (Interactive Telecommunications)'],
            famousAlumni: ['Lady Gaga', 'Spike Lee', 'Martin Scorsese', 'Anne Hathaway', 'Angelina Jolie'],
            uniqueFeatures: ['Global campuses (Abu Dhabi, Shanghai)', 'NYC as your campus', 'Strong arts programs', 'Global liberal studies'],
            campusVibe: 'Urban, independent, diverse. Students thrive on NYC energy. Less traditional campus feel.',
            whatTheyLookFor: ['Independence and initiative', 'Global perspective', 'Urban adaptability', 'Clear career goals'],
            recentNews: ['Media studies expansion', 'AI and ethics research', 'Brooklyn expansion'],
            studentLife: 'NYC offers unlimited opportunities for internships, culture, and networking. Housing is scattered around Manhattan.',
        },
        transferInfo: {
            acceptanceRate: '~24%',
            avgGPA: '3.5+',
            requirements: ['Strong academics', 'Clear connection to NYC/NYU', 'Specific school interest'],
            tips: ['Show why NYC matters to your goals', 'Be specific about NYU resources', 'Demonstrate independence'],
        },
        applicationUrl: 'https://www.nyu.edu/admissions/undergraduate-admissions.html',
        portalUrl: 'https://portal.nyu.edu/',
    },
    {
        id: 'cornell',
        name: 'Cornell',
        fullName: 'Cornell University',
        location: 'Ithaca, NY',
        deadline: new Date('2026-03-15T23:59:00-04:00'),
        deadlineType: 'regular',
        timezone: 'America/New_York',
        essays: [
            {
                id: 'cornell-1',
                title: 'Community Essay',
                prompt: 'We all contribute to, and are influenced by, the communities that are meaningful to us. Share how you\'ve been shaped by one of the communities you belong to. You may define "community" broadly to include family, school, interests, or other groups.',
                wordLimit: 350,
                required: true,
            },
            {
                id: 'cornell-2',
                title: 'College-Specific Essay',
                prompt: 'Tell us about the unique qualities that attract you to your chosen undergraduate college or school and how that curriculum would support your interests.',
                wordLimit: 650,
                required: true,
            },
        ],
        research: {
            motto: 'I would found an institution where any person can find instruction in any study',
            values: ['Accessibility', 'Excellence', 'Diversity of Thought', 'Public Engagement', 'Research'],
            culture: 'Cornell combines Ivy League prestige with land-grant accessibility. It\'s in a beautiful but isolated location, creating a tight community.',
            notablePrograms: ['Computer Science', 'Hotel Administration', 'Architecture', 'Engineering', 'Agriculture & Life Sciences'],
            famousAlumni: ['Ruth Bader Ginsburg', 'Bill Nye', 'E.B. White', 'Toni Morrison'],
            uniqueFeatures: ['Any person, any study philosophy', 'Seven undergraduate colleges', 'Beautiful campus with gorges', 'Strong Greek life'],
            campusVibe: 'Beautiful but isolated. Tight-knit community. Academically rigorous with supportive peers.',
            whatTheyLookFor: ['Specific college fit', 'Clear academic interests', 'Community contribution', 'Intellectual curiosity'],
            recentNews: ['Cornell Tech expansion in NYC', 'AI research initiatives', 'Climate research'],
            studentLife: 'Gorges create unique campus feel. Students bond over shared experience of Ithaca winters.',
        },
        transferInfo: {
            acceptanceRate: '~16%',
            avgGPA: '3.7+',
            requirements: ['College-specific requirements', 'Strong fit with chosen college', 'Clear academic goals'],
            tips: ['Research specific college thoroughly', 'Connect your interests to college values', 'Show community engagement'],
        },
        applicationUrl: 'https://admissions.cornell.edu/',
        portalUrl: 'https://portal.cornell.edu/',
    },
    {
        id: 'uwash',
        name: 'UW',
        fullName: 'University of Washington',
        location: 'Seattle, WA',
        deadline: new Date('2026-02-15T23:59:00-08:00'),
        deadlineType: 'regular',
        timezone: 'America/Los_Angeles',
        essays: [
            {
                id: 'uwash-1',
                title: 'Personal Statement',
                prompt: 'Describe your college career to date, including your educational path and choices. Explain what led you to choose your major and career aspirations. State the specific reasons you wish to transfer to UW and how UW will help you achieve your academic, career, and personal goals.',
                wordLimit: 650,
                required: true,
            },
            {
                id: 'uwash-2',
                title: 'Additional Information (Optional)',
                prompt: 'You may describe any personal or imposed challenges or hardships that have affected your educational journey.',
                wordLimit: 200,
                required: false,
            },
        ],
        research: {
            motto: 'Lux sit (Let there be light)',
            values: ['Public Good', 'Innovation', 'Diversity', 'Collaboration', 'Sustainability'],
            culture: 'UW has strong ties to Seattle\'s tech industry. Amazon, Microsoft, and countless startups are nearby. Pacific Northwest culture emphasizes sustainability and outdoor life.',
            notablePrograms: ['Computer Science', 'Medicine', 'Information Science', 'Engineering', 'Global Health'],
            famousAlumni: ['Bruce Lee', 'Jeff Dean (Google)', 'Joel McHale', 'Anna Faris'],
            uniqueFeatures: ['Direct admits to competitive majors', 'Strong tech industry connections', 'Beautiful campus', 'Husky spirit'],
            campusVibe: 'Innovative, outdoorsy, tech-forward. Students balance academics with hiking, coffee culture, and startup dreams.',
            whatTheyLookFor: ['Clear major interest', 'Community engagement', 'Personal growth', 'Resilience'],
            recentNews: ['AI research expansion', 'Climate research', 'Tech partnerships'],
            studentLife: 'Strong school spirit (Go Huskies!). Easy access to Seattle for internships. Beautiful campus with cherry blossoms.',
        },
        transferInfo: {
            acceptanceRate: '~50%',
            avgGPA: '3.5+',
            requirements: ['Major-specific requirements', 'Strong essays', 'Relevant coursework'],
            tips: ['Apply to specific major if possible', 'Show connection to Washington/PNW', 'Demonstrate initiative'],
        },
        applicationUrl: 'https://admit.washington.edu/apply/',
        portalUrl: 'https://myuw.washington.edu/',
    },
    {
        id: 'uiuc',
        name: 'UIUC',
        fullName: 'University of Illinois Urbana-Champaign',
        location: 'Champaign, IL',
        deadline: new Date('2026-02-01T23:59:00-06:00'),
        deadlineType: 'priority',
        timezone: 'America/Chicago',
        essays: [
            {
                id: 'uiuc-1',
                title: 'Why Major',
                prompt: 'Explain your interest in the major you selected. Describe how you have recently developed this interest, inside and/or outside of the classroom, and how this major relates to your professional goals.',
                wordLimit: 350,
                required: true,
            },
            {
                id: 'uiuc-2',
                title: 'Second-Choice Major (If Selected)',
                prompt: 'You have selected a second-choice major. Please explain your interest in this major.',
                wordLimit: 350,
                required: false,
            },
        ],
        research: {
            motto: 'Learning and Labor',
            values: ['Excellence', 'Innovation', 'Diversity', 'Public Engagement', 'Research'],
            culture: 'UIUC is a Big Ten powerhouse with exceptional CS and engineering programs. Strong school spirit with Midwestern friendliness.',
            notablePrograms: ['Computer Science', 'Electrical Engineering', 'Grainger Engineering', 'NCSA', 'I-School'],
            famousAlumni: ['Marc Andreessen', 'YouTube founders', 'Jack Dorsey', 'Max Levchin'],
            uniqueFeatures: ['Top 5 CS program', 'NCSA (supercomputing)', 'Strong entrepreneurship', 'Big Ten athletics'],
            campusVibe: 'Hardworking, friendly, spirited. Strong engineering culture balanced with Big Ten sports.',
            whatTheyLookFor: ['Clear major interest', 'Technical aptitude', 'Community involvement', 'Initiative'],
            recentNews: ['Quantum computing research', 'AI advances', 'Research park expansion'],
            studentLife: 'Twin cities (Champaign-Urbana) offer college town experience. Strong Greek life and sports.',
        },
        transferInfo: {
            acceptanceRate: '~63%',
            avgGPA: '3.4+',
            requirements: ['Major-specific prereqs', 'Strong STEM foundation for engineering', 'Clear goals'],
            tips: ['Strong CS/Engineering applications', 'Show relevant projects', 'Be specific about why UIUC'],
        },
        applicationUrl: 'https://admissions.illinois.edu/',
        portalUrl: 'https://myillini.illinois.edu/',
    },
    {
        id: 'gatech',
        name: 'Georgia Tech',
        fullName: 'Georgia Institute of Technology',
        location: 'Atlanta, GA',
        deadline: new Date('2026-03-02T23:59:00-05:00'),
        deadlineType: 'regular',
        timezone: 'America/New_York',
        essays: [
            {
                id: 'gatech-1',
                title: 'Why Georgia Tech',
                prompt: 'Why do you want to study your chosen major, and why do you want to study that major at Georgia Tech?',
                wordLimit: 300,
                required: true,
            },
        ],
        research: {
            motto: 'Progress and Service',
            values: ['Innovation', 'Leadership', 'Service', 'Excellence', 'Collaboration'],
            culture: 'Georgia Tech is all about "doing" - hands-on learning, real-world projects, and innovation. Students are ambitious and hardworking.',
            notablePrograms: ['Computer Science', 'Mechanical Engineering', 'Aerospace Engineering', 'Industrial Engineering', 'OMSCS'],
            famousAlumni: ['Jimmy Carter', 'John Young (astronaut)', 'Mike Duke (Walmart)'],
            uniqueFeatures: ['CREATE-X startup program', 'VIP (undergraduate research)', 'Co-op program', 'Strong industry connections'],
            campusVibe: 'Hardworking, innovative, spirited (Go Jackets!). Atlanta offers great city experience.',
            whatTheyLookFor: ['Technical excellence', 'Problem-solving ability', 'Leadership', 'Innovation mindset'],
            recentNews: ['Quantum computing research', 'Robotics advances', 'AI ethics research'],
            studentLife: 'Atlanta provides great internship and networking opportunities. Strong Greek life and athletics.',
        },
        transferInfo: {
            acceptanceRate: '~37%',
            avgGPA: '3.6+',
            requirements: ['Strong math/science background', 'Major-specific prereqs', 'Clear career goals'],
            tips: ['Show technical projects', 'Demonstrate problem-solving', 'Connect to Atlanta/industry'],
        },
        applicationUrl: 'https://admission.gatech.edu/',
        portalUrl: 'https://buzzport.gatech.edu/',
    },
    {
        id: 'usc',
        name: 'USC',
        fullName: 'University of Southern California',
        location: 'Los Angeles, CA',
        deadline: new Date('2026-02-15T23:59:00-08:00'),
        deadlineType: 'regular',
        timezone: 'America/Los_Angeles',
        essays: [
            {
                id: 'usc-1',
                title: 'Transfer Statement',
                prompt: 'Please provide a statement that addresses your reasons for transferring and the objectives you hope to achieve.',
                wordLimit: 650,
                required: true,
            },
            {
                id: 'usc-2',
                title: 'Academic Interests',
                prompt: 'Describe how you plan to pursue your academic interests and why you want to explore them at USC. Please feel free to address your first- and second-choice major selections.',
                wordLimit: 250,
                required: true,
            },
        ],
        research: {
            motto: 'Palmam qui meruit ferat (Let whoever earns the palm bear it)',
            values: ['Excellence', 'Innovation', 'Trojan Family', 'Diversity', 'Creativity'],
            culture: 'USC has an incredibly strong alumni network (Trojan Family). It\'s a blend of strong academics, entertainment industry connections, and sports culture.',
            notablePrograms: ['Cinematic Arts', 'Viterbi Engineering', 'Marshall Business', 'Annenberg Communication', 'Games (Interactive Media)'],
            famousAlumni: ['George Lucas', 'Neil Armstrong', 'Will Ferrell', 'O.J. Simpson', 'John Wayne'],
            uniqueFeatures: ['Trojan Family network', 'Entertainment industry connections', 'Beautiful LA campus', 'Strong athletics'],
            campusVibe: 'Sunny, spirited, connected. Fight On! is more than a cheer - it\'s a lifestyle.',
            whatTheyLookFor: ['Community engagement', 'Career goals', 'Leadership', 'Trojan fit'],
            recentNews: ['New campus developments', 'Tech industry partnerships', 'LA 2028 Olympics'],
            studentLife: 'LA offers endless opportunities. Strong Greek life. Amazing weather. Great football culture.',
        },
        transferInfo: {
            acceptanceRate: '~27%',
            avgGPA: '3.7+',
            requirements: ['Strong academics', 'Clear USC fit', 'Community involvement'],
            tips: ['Show Trojan Family connection', 'Be specific about programs', 'Demonstrate leadership'],
        },
        applicationUrl: 'https://apply.usc.edu/',
        portalUrl: 'https://my.usc.edu/',
    },
    {
        id: 'utaustin',
        name: 'UT Austin',
        fullName: 'University of Texas at Austin',
        location: 'Austin, TX',
        deadline: new Date('2026-03-01T23:59:00-06:00'),
        deadlineType: 'regular',
        timezone: 'America/Chicago',
        essays: [
            {
                id: 'ut-1',
                title: 'Why Major',
                prompt: 'Why are you interested in the major you indicated as your first-choice major?',
                wordLimit: 300,
                required: true,
            },
            {
                id: 'ut-2',
                title: 'Activity You Are Proud Of',
                prompt: 'Think of all the activities — both in and outside of school — that you have been involved with. Which one are you most proud of and why? This can include extracurriculars, volunteer work, employment, or family responsibilities.',
                wordLimit: 300,
                required: true,
            },
            {
                id: 'ut-3',
                title: 'Special Circumstances (Optional)',
                prompt: 'Please share background on events or special circumstances that you feel may have impacted your academic performance.',
                wordLimit: 300,
                required: false,
            },
        ],
        research: {
            motto: 'Disciplina praesidium civitatis (Education protects the state)',
            values: ['Excellence', 'Diversity', 'Innovation', 'Leadership', 'Texas Pride'],
            culture: 'UT Austin blends Southern hospitality with world-class academics. Strong school spirit with Hook \'em Horns! Austin is the live music capital.',
            notablePrograms: ['Computer Science', 'McCombs Business', 'Engineering', 'Turing Scholars (CS honors)', 'LBJ School (Policy)'],
            famousAlumni: ['Michael Dell', 'Kevin Durant', 'Matthew McConaughey', 'Lady Bird Johnson'],
            uniqueFeatures: ['Turing Scholars program', 'Austin tech scene', 'Strong state school value', 'Massive alumni network'],
            campusVibe: 'Big, diverse, spirited. Austin is weird (in a good way). Football Saturdays are sacred.',
            whatTheyLookFor: ['Academic excellence', 'Leadership', 'Clear goals', 'Community impact'],
            recentNews: ['Engineering expansion', 'AI research', 'Dell Medical School growth'],
            studentLife: 'Austin offers amazing food, music, and outdoors. 6th Street is famous. Keep Austin Weird.',
        },
        transferInfo: {
            acceptanceRate: '~29%',
            avgGPA: '3.5+',
            requirements: ['Major-specific requirements', 'Strong essays', 'Texas residency preferred'],
            tips: ['Show love for Austin/Texas', 'Be specific about major', 'Demonstrate community involvement'],
        },
        applicationUrl: 'https://admissions.utexas.edu/',
        portalUrl: 'https://my.utexas.edu/',
    },
    {
        id: 'northeastern',
        name: 'Northeastern',
        fullName: 'Northeastern University',
        location: 'Boston, MA',
        deadline: new Date('2026-04-01T23:59:00-04:00'),
        deadlineType: 'regular',
        timezone: 'America/New_York',
        essays: [
            {
                id: 'neu-1',
                title: 'Reasons for Transferring',
                prompt: 'Please explain your reasons for transferring and the goals you hope to achieve.',
                wordLimit: 600,
                required: true,
            },
            {
                id: 'neu-2',
                title: 'Northeastern Journey',
                prompt: 'What types of experiences inside and outside of the classroom do you want to engage in during your Northeastern journey?',
                wordLimit: 250,
                required: true,
            },
        ],
        research: {
            motto: 'Lux, Veritas, Virtus (Light, Truth, Courage)',
            values: ['Experiential Learning', 'Innovation', 'Global Engagement', 'Use-Inspired Research'],
            culture: 'Northeastern is the co-op capital. Students alternate between classroom and work experience. It produces career-ready graduates.',
            notablePrograms: ['Computer Science', 'Cybersecurity', 'Engineering', 'Business', 'Health Sciences'],
            famousAlumni: ['Shawn Fanning (Napster)', 'Richard Egan (EMC)', 'Wendy Williams'],
            uniqueFeatures: ['Co-op program', 'Global experience', 'Boston location', 'Career-focused'],
            campusVibe: 'Career-oriented, practical, diverse. Students are focused on future success.',
            whatTheyLookFor: ['Work experience', 'Practical mindset', 'Global perspective', 'Initiative'],
            recentNews: ['New co-op partnerships', 'Oakland expansion', 'AI research'],
            studentLife: 'Boston is a college town. Easy access to Harvard, MIT, and tech companies.',
        },
        transferInfo: {
            acceptanceRate: '~22%',
            avgGPA: '3.5+',
            requirements: ['Strong academics', 'Work/volunteer experience', 'Career goals'],
            tips: ['Emphasize experiential learning', 'Show how co-op fits goals', 'Demonstrate initiative'],
        },
        applicationUrl: 'https://admissions.northeastern.edu/',
        portalUrl: 'https://myneu.neu.edu/',
    },
    {
        id: 'nus',
        name: 'NUS',
        fullName: 'National University of Singapore',
        location: 'Singapore',
        deadline: new Date('2026-02-15T23:59:00+08:00'),
        deadlineType: 'regular',
        timezone: 'Asia/Singapore',
        essays: [
            {
                id: 'nus-1',
                title: 'Motivation for Transfer',
                prompt: 'Please tell us about your motivation for transferring to NUS, including your interests, achievements, and aspirations.',
                wordLimit: 500,
                required: true,
            },
            {
                id: 'nus-2',
                title: 'Short Response Questions',
                prompt: 'You will answer five short response questions about your interests, aptitudes, and prior preparation as part of the holistic assessment.',
                wordLimit: 200,
                required: true,
            },
        ],
        research: {
            motto: 'Towards a Global Knowledge Enterprise',
            values: ['Excellence', 'Innovation', 'Enterprise', 'Resilience', 'Global Outlook'],
            culture: 'NUS is Asia\'s top university with global reach. It combines Eastern efficiency with Western innovation. Highly competitive and career-focused.',
            notablePrograms: ['Computer Science', 'Business Analytics', 'Engineering', 'Medicine', 'NUS Overseas Colleges'],
            famousAlumni: ['Lee Hsien Loong (PM)', 'Goh Chok Tong', 'Tony Tan'],
            uniqueFeatures: ['NUS Overseas Colleges', 'Strong Asia network', 'Cutting-edge campus', 'Research focus'],
            campusVibe: 'Efficient, diverse, ambitious. Students from all over Asia and the world.',
            whatTheyLookFor: ['Academic excellence', 'Leadership', 'Global perspective', 'Clear career goals'],
            recentNews: ['AI research leadership', 'Climate tech initiatives', 'Industry partnerships'],
            studentLife: 'Singapore is safe, clean, and efficient. Great food. Strong student organizations.',
        },
        transferInfo: {
            acceptanceRate: '~15%',
            avgGPA: '3.7+',
            requirements: ['Strong academics', 'International perspective', 'Leadership experience'],
            tips: ['Show why Asia/Singapore', 'Demonstrate global mindset', 'Clear career path'],
        },
        applicationUrl: 'https://www.nus.edu.sg/oam/',
        portalUrl: 'https://myportal.nus.edu.sg/',
    },
    {
        id: 'umich',
        name: 'UMich',
        fullName: 'University of Michigan',
        location: 'Ann Arbor, MI',
        deadline: new Date('2026-02-01T23:59:00-05:00'),
        deadlineType: 'regular',
        timezone: 'America/New_York',
        essays: [
            {
                id: 'umich-1',
                title: 'Leaders and Citizens',
                prompt: 'At the University of Michigan, we are focused on developing leaders and citizens who will challenge the present and enrich the future. In your essay, share with us how you are prepared to contribute to these goals. This could include the people, places, experiences, or aspirations that have shaped your journey and future plans.',
                wordLimit: 300,
                required: true,
            },
            {
                id: 'umich-2',
                title: 'Why This College/School',
                prompt: 'Describe the unique qualities that attract you to the specific undergraduate College or School (including preferred admission and dual degree programs) to which you are applying. How would that curriculum support your interests?',
                wordLimit: 550,
                required: true,
            },
        ],
        research: {
            motto: 'Artes, Scientia, Veritas (Arts, Science, Truth)',
            values: ['Academic Excellence', 'Leaders and Best', 'Public Good', 'Diversity', 'Collaboration'],
            culture: 'Michigan is "The Leaders and Best" - it embodies excellence in everything from academics to athletics. Go Blue! is a way of life.',
            notablePrograms: ['Computer Science', 'Ross Business', 'Engineering', 'Medicine', 'LSA'],
            famousAlumni: ['Larry Page (Google)', 'Gerald Ford', 'Madonna', 'Tom Brady'],
            uniqueFeatures: ['Deep alumni network', 'Big Ten athletics', 'Ann Arbor culture', 'Strong research'],
            campusVibe: 'Ambitious, spirited, diverse. Students are proud to be Wolverines.',
            whatTheyLookFor: ['Academic excellence', 'Leadership', 'Community involvement', 'Diverse perspectives'],
            recentNews: ['Engineering expansion', 'AI research', 'Medical breakthroughs'],
            studentLife: 'Ann Arbor is a perfect college town. Football Saturdays are legendary. Great food and culture.',
        },
        transferInfo: {
            acceptanceRate: '~38%',
            avgGPA: '3.7+',
            requirements: ['Strong academics', 'Clear school fit', 'Leadership'],
            tips: ['Show "Leaders and Best" mindset', 'Be specific about school/college', 'Demonstrate impact'],
        },
        applicationUrl: 'https://admissions.umich.edu/',
        portalUrl: 'https://wolverineaccess.umich.edu/',
    },
    {
        id: 'purdue',
        name: 'Purdue',
        fullName: 'Purdue University',
        location: 'West Lafayette, IN',
        deadline: new Date('2026-03-01T23:59:00-05:00'),
        deadlineType: 'regular',
        timezone: 'America/New_York',
        essays: [
            {
                id: 'purdue-1',
                title: 'Opportunities at Purdue',
                prompt: 'How will opportunities at Purdue support your interests, both in and out of the classroom?',
                wordLimit: 250,
                required: true,
            },
            {
                id: 'purdue-2',
                title: 'Reasons for Major',
                prompt: 'Briefly discuss your reasons for choosing your major and your interest in studying at this campus location (Indianapolis or West Lafayette).',
                wordLimit: 250,
                required: true,
            },
        ],
        research: {
            motto: 'Education, Research, Service',
            values: ['Excellence', 'Innovation', 'Integrity', 'Giant Leaps', 'Boilermaker Pride'],
            culture: 'Purdue is the Cradle of Astronauts. Engineering excellence is in its DNA. Students are hardworking and humble.',
            notablePrograms: ['Engineering (all fields)', 'Computer Science', 'Pharmacy', 'Agriculture', 'Polytechnic'],
            famousAlumni: ['Neil Armstrong', 'Orville Redenbacher', 'John Wooden', 'Drew Brees'],
            uniqueFeatures: ['Cradle of Astronauts', 'Frozen tuition', 'Strong engineering', 'Purdue Global'],
            campusVibe: 'Hardworking, humble, innovative. Boilermakers get things done.',
            whatTheyLookFor: ['Technical aptitude', 'Work ethic', 'Clear goals', 'Community involvement'],
            recentNews: ['Aerospace advances', 'Semiconductor research', 'Discovery Park expansion'],
            studentLife: 'West Lafayette is a classic college town. Strong Greek life. Sports culture.',
        },
        transferInfo: {
            acceptanceRate: '~60%',
            avgGPA: '3.3+',
            requirements: ['Major-specific prereqs', 'Strong STEM foundation', 'Clear career goals'],
            tips: ['Show engineering/technical passion', 'Be specific about major', 'Demonstrate work ethic'],
        },
        applicationUrl: 'https://www.admissions.purdue.edu/',
        portalUrl: 'https://portal.mypurdue.purdue.edu/',
    },
    {
        id: 'umd',
        name: 'UMD',
        fullName: 'University of Maryland',
        location: 'College Park, MD',
        deadline: new Date('2026-03-01T23:59:00-05:00'),
        deadlineType: 'regular',
        timezone: 'America/New_York',
        essays: [
            {
                id: 'umd-1',
                title: 'Transfer Essay',
                prompt: 'Please describe your past academic experiences and your reasons for wishing to enroll at UMD at this point in your academic career.',
                wordLimit: 300,
                required: true,
            },
        ],
        research: {
            motto: 'Fatti maschii, parole femine (Manly deeds, womanly words)',
            values: ['Excellence', 'Diversity', 'Innovation', 'Community', 'Fearless Ideas'],
            culture: 'UMD combines Big Ten athletics with DC proximity. Students are ambitious and politically engaged. Terps are proud.',
            notablePrograms: ['Computer Science', 'Engineering', 'Business', 'Journalism', 'Public Policy'],
            famousAlumni: ['Larry David', 'Jim Henson', 'Sergey Brin', 'Kevin Plank (Under Armour)'],
            uniqueFeatures: ['DC proximity', 'Strong CS program', 'Big Ten athletics', 'Research park'],
            campusVibe: 'Ambitious, diverse, connected. DC is right there for internships.',
            whatTheyLookFor: ['Academic strength', 'Community engagement', 'Career orientation', 'Leadership'],
            recentNews: ['Quantum computing research', 'Cybersecurity leadership', 'DC tech connections'],
            studentLife: 'College Park is close to DC. Great for internships. Strong Terps pride.',
        },
        transferInfo: {
            acceptanceRate: '~44%',
            avgGPA: '3.4+',
            requirements: ['Major-specific prereqs', 'Strong academics', 'Clear goals'],
            tips: ['Show DC connection', 'Be specific about major', 'Demonstrate initiative'],
        },
        applicationUrl: 'https://admissions.umd.edu/',
        portalUrl: 'https://testudo.umd.edu/',
    },
];

// Helper function to get time until deadline
export function getTimeUntilDeadline(deadline: Date): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
    isUrgent: boolean;
} {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const isPast = diff < 0;
    const absDiff = Math.abs(diff);

    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

    return {
        days,
        hours,
        minutes,
        seconds,
        isPast,
        isUrgent: !isPast && days <= 7,
    };
}

// Format deadline nicely
export function formatDeadline(deadline: Date): string {
    return deadline.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    });
}
