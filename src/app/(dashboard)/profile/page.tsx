'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Briefcase,
  GraduationCap,
  Code,
  MapPin,
  DollarSign,
  Github,
  Linkedin,
  Globe,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample profile data
const sampleProfile = {
  name: 'John Doe',
  email: 'john@example.com',
  headline: 'Senior Frontend Engineer',
  summary: 'Passionate software engineer with 5+ years of experience building scalable web applications. Specialized in React, TypeScript, and modern frontend architectures.',
  location: 'San Francisco, CA',
  remotePreference: 'remote',
  salaryMin: 150000,
  salaryMax: 200000,
  yearsOfExperience: 5,
  githubUrl: 'https://github.com/johndoe',
  linkedinUrl: 'https://linkedin.com/in/johndoe',
  portfolioUrl: 'https://johndoe.dev',
  completionScore: 72,
};

const sampleSkills = [
  { id: '1', name: 'React', category: 'technical', proficiency: 5, yearsOfExp: 5 },
  { id: '2', name: 'TypeScript', category: 'technical', proficiency: 5, yearsOfExp: 4 },
  { id: '3', name: 'Next.js', category: 'framework', proficiency: 4, yearsOfExp: 3 },
  { id: '4', name: 'Node.js', category: 'technical', proficiency: 4, yearsOfExp: 4 },
  { id: '5', name: 'PostgreSQL', category: 'technical', proficiency: 3, yearsOfExp: 3 },
  { id: '6', name: 'AWS', category: 'tool', proficiency: 3, yearsOfExp: 2 },
];

const sampleExperiences = [
  {
    id: '1',
    company: 'TechCorp',
    title: 'Senior Frontend Engineer',
    location: 'San Francisco, CA',
    startDate: new Date('2021-01-01'),
    endDate: null,
    isCurrent: true,
    description: 'Leading frontend development for the main product.',
    achievements: [
      'Reduced bundle size by 40% improving load times',
      'Led migration from JavaScript to TypeScript',
      'Mentored 3 junior developers',
    ],
  },
  {
    id: '2',
    company: 'StartupXYZ',
    title: 'Frontend Developer',
    location: 'Remote',
    startDate: new Date('2019-03-01'),
    endDate: new Date('2020-12-31'),
    isCurrent: false,
    description: 'Built customer-facing web applications.',
    achievements: [
      'Implemented real-time collaboration features',
      'Increased test coverage from 20% to 80%',
    ],
  },
];

const sampleEducation = [
  {
    id: '1',
    institution: 'University of California, Berkeley',
    degree: "Bachelor's",
    field: 'Computer Science',
    startDate: new Date('2015-09-01'),
    endDate: new Date('2019-05-31'),
    gpa: 3.8,
  },
];

function SectionHeader({
  title,
  icon: Icon,
  onAdd,
}: {
  title: string;
  icon: React.ElementType;
  onAdd?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={20} className="text-[var(--accent-primary)]" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="p-2 rounded-lg text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
        >
          <Plus size={18} />
        </button>
      )}
    </div>
  );
}

function SkillBadge({
  skill,
}: {
  skill: typeof sampleSkills[0];
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg group">
      <span className="font-medium text-sm">{skill.name}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              level <= skill.proficiency ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)]'
            )}
          />
        ))}
      </div>
      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--bg-hover)] rounded transition-all">
        <X size={12} className="text-[var(--text-muted)]" />
      </button>
    </div>
  );
}

function ExperienceCard({ experience }: { experience: typeof sampleExperiences[0] }) {
  return (
    <div className="p-4 bg-[var(--bg-tertiary)] rounded-xl group">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{experience.title}</h3>
          <p className="text-[var(--text-secondary)]">{experience.company}</p>
          <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {experience.location}
            </span>
            <span>
              {experience.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {' - '}
              {experience.isCurrent
                ? 'Present'
                : experience.endDate?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
            <Edit2 size={14} />
          </button>
          <button className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {experience.achievements.length > 0 && (
        <ul className="mt-3 space-y-1">
          {experience.achievements.map((achievement, i) => (
            <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
              <span className="text-[var(--accent-primary)] mt-1">•</span>
              {achievement}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage your professional profile
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={cn(
            'btn-secondary flex items-center gap-2',
            isEditing && 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
          )}
        >
          {isEditing ? (
            <>
              <Save size={18} />
              Save Changes
            </>
          ) : (
            <>
              <Edit2 size={18} />
              Edit Profile
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <SectionHeader title="Basic Information" icon={User} />

            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                {sampleProfile.name.split(' ').map((n) => n[0]).join('')}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{sampleProfile.name}</h2>
                  <p className="text-[var(--accent-primary)]">{sampleProfile.headline}</p>
                </div>

                <p className="text-[var(--text-secondary)] text-sm">
                  {sampleProfile.summary}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {sampleProfile.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={14} />
                    {sampleProfile.yearsOfExperience} years exp
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={14} />
                    ${sampleProfile.salaryMin.toLocaleString()} - ${sampleProfile.salaryMax.toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-3">
                  {sampleProfile.githubUrl && (
                    <a
                      href={sampleProfile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <Github size={18} />
                    </a>
                  )}
                  {sampleProfile.linkedinUrl && (
                    <a
                      href={sampleProfile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <Linkedin size={18} />
                    </a>
                  )}
                  {sampleProfile.portfolioUrl && (
                    <a
                      href={sampleProfile.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <Globe size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Experience */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <SectionHeader title="Experience" icon={Briefcase} onAdd={() => {}} />
            <div className="space-y-4">
              {sampleExperiences.map((exp) => (
                <ExperienceCard key={exp.id} experience={exp} />
              ))}
            </div>
          </motion.div>

          {/* Education */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <SectionHeader title="Education" icon={GraduationCap} onAdd={() => {}} />
            <div className="space-y-4">
              {sampleEducation.map((edu) => (
                <div key={edu.id} className="p-4 bg-[var(--bg-tertiary)] rounded-xl">
                  <h3 className="font-semibold">{edu.institution}</h3>
                  <p className="text-[var(--text-secondary)]">
                    {edu.degree} in {edu.field}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-muted)]">
                    <span>
                      {edu.startDate.getFullYear()} - {edu.endDate?.getFullYear()}
                    </span>
                    {edu.gpa && <span>GPA: {edu.gpa}</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Skills & Completion */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-4">Profile Strength</h3>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="var(--bg-tertiary)"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="url(#profileGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${sampleProfile.completionScore * 3.52} 352`}
                />
                <defs>
                  <linearGradient id="profileGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{sampleProfile.completionScore}%</span>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)] text-center">
              Add more details to improve your match score
            </p>
          </motion.div>

          {/* Skills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <SectionHeader title="Skills" icon={Code} onAdd={() => {}} />
            <div className="flex flex-wrap gap-2">
              {sampleSkills.map((skill) => (
                <SkillBadge key={skill.id} skill={skill} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
