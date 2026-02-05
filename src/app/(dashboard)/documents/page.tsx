'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Trash2,
  Plus,
  Search,
  Filter,
  Eye,
  Copy,
  MoreVertical,
  Sparkles,
  FileCheck,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

// Document type configuration
const documentTypes = {
  resume: { label: 'Resume', icon: FileText, color: 'blue' },
  cover_letter: { label: 'Cover Letter', icon: Mail, color: 'purple' },
  thank_you: { label: 'Thank You', icon: CheckCircle, color: 'emerald' },
  follow_up: { label: 'Follow Up', icon: Clock, color: 'orange' },
  portfolio: { label: 'Portfolio', icon: FileCheck, color: 'cyan' },
  other: { label: 'Other', icon: FileText, color: 'gray' },
};

type DocumentType = keyof typeof documentTypes;

// Sample documents
const sampleDocuments = [
  {
    id: '1',
    type: 'resume' as DocumentType,
    name: 'Resume_John_Doe_2024.pdf',
    isDefault: true,
    forCompany: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    atsScore: 92,
  },
  {
    id: '2',
    type: 'cover_letter' as DocumentType,
    name: 'Cover_Letter_Vercel.pdf',
    isDefault: false,
    forCompany: 'Vercel',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    atsScore: null,
  },
  {
    id: '3',
    type: 'cover_letter' as DocumentType,
    name: 'Cover_Letter_Stripe.pdf',
    isDefault: false,
    forCompany: 'Stripe',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    atsScore: null,
  },
  {
    id: '4',
    type: 'thank_you' as DocumentType,
    name: 'Thank_You_Google.pdf',
    isDefault: false,
    forCompany: 'Google',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    atsScore: null,
  },
  {
    id: '5',
    type: 'resume' as DocumentType,
    name: 'Resume_Backend_Focus.pdf',
    isDefault: false,
    forCompany: null,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    atsScore: 88,
  },
];

// Resume templates
const resumeTemplates = [
  { id: '1', name: 'Modern Professional', description: 'Clean, ATS-friendly design', popular: true },
  { id: '2', name: 'Creative', description: 'Stand out with unique styling', popular: false },
  { id: '3', name: 'Executive', description: 'For senior positions', popular: false },
  { id: '4', name: 'Technical', description: 'Highlight technical skills', popular: true },
];

function DocumentCard({ doc }: { doc: typeof sampleDocuments[0] }) {
  const config = documentTypes[doc.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-subtle p-4 hover:border-[var(--accent-primary)]/30 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'p-3 rounded-xl',
            config.color === 'blue' && 'bg-blue-500/20 text-blue-400',
            config.color === 'purple' && 'bg-purple-500/20 text-purple-400',
            config.color === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
            config.color === 'orange' && 'bg-orange-500/20 text-orange-400',
            config.color === 'cyan' && 'bg-cyan-500/20 text-cyan-400',
            config.color === 'gray' && 'bg-gray-500/20 text-gray-400'
          )}
        >
          <Icon size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium truncate">{doc.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[var(--text-muted)]">{config.label}</span>
                {doc.isDefault && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded">
                    Default
                  </span>
                )}
                {doc.forCompany && (
                  <span className="text-xs text-[var(--text-muted)]">
                    for {doc.forCompany}
                  </span>
                )}
              </div>
            </div>

            {doc.atsScore && (
              <div className="text-right">
                <div className="text-sm font-semibold text-emerald-400">{doc.atsScore}%</div>
                <div className="text-[10px] text-[var(--text-muted)]">ATS Score</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-[var(--text-muted)]">
              {formatRelativeTime(doc.createdAt)}
            </span>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <Eye size={14} />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <Download size={14} />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <Copy size={14} />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GenerateModal({
  isOpen,
  onClose,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  type: DocumentType;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const config = documentTypes[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative glass-card p-6 w-full max-w-lg"
      >
        <h2 className="text-xl font-bold mb-4">Generate {config.label}</h2>

        {type === 'resume' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Template</label>
              <div className="grid grid-cols-2 gap-3">
                {resumeTemplates.map((template) => (
                  <button
                    key={template.id}
                    className="p-3 text-left rounded-xl border border-[var(--glass-border)] hover:border-[var(--accent-primary)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{template.name}</span>
                      {template.popular && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Target Job (Optional)</label>
              <select className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm">
                <option value="">General purpose resume</option>
                <option value="1">Senior Frontend Engineer at Vercel</option>
                <option value="2">Full Stack Developer at Stripe</option>
              </select>
            </div>
          </div>
        )}

        {(type === 'cover_letter' || type === 'thank_you' || type === 'follow_up') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Job</label>
              <select className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm">
                <option value="">Select a job...</option>
                <option value="1">Senior Frontend Engineer at Vercel</option>
                <option value="2">Full Stack Developer at Stripe</option>
                <option value="3">Software Engineer at Linear</option>
              </select>
            </div>

            {type === 'thank_you' && (
              <div>
                <label className="block text-sm font-medium mb-2">Interviewer Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Sarah Johnson"
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Tone</label>
              <div className="flex gap-2">
                {['Professional', 'Friendly', 'Enthusiastic'].map((tone) => (
                  <button
                    key={tone}
                    className="px-3 py-1.5 text-sm rounded-lg border border-[var(--glass-border)] hover:border-[var(--accent-primary)] transition-colors"
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => setIsGenerating(true)}
            disabled={isGenerating}
            className="btn-gradient flex-1 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');
  const [generateModalType, setGenerateModalType] = useState<DocumentType | null>(null);

  const filteredDocs = sampleDocuments.filter((doc) => {
    if (selectedType !== 'all' && doc.type !== selectedType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(query) ||
        doc.forCompany?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group documents by type
  const groupedDocs = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<DocumentType, typeof sampleDocuments>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage your resumes, cover letters, and more
          </p>
        </div>
      </div>

      {/* Quick Generate Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { type: 'resume' as DocumentType, label: 'New Resume', icon: FileText },
          { type: 'cover_letter' as DocumentType, label: 'Cover Letter', icon: Mail },
          { type: 'thank_you' as DocumentType, label: 'Thank You', icon: CheckCircle },
          { type: 'follow_up' as DocumentType, label: 'Follow Up', icon: Clock },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => setGenerateModalType(item.type)}
            className="glass-card-subtle p-4 flex items-center gap-3 hover:border-[var(--accent-primary)]/30 transition-all group"
          >
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)]/20 transition-colors">
              <item.icon size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-[var(--text-muted)]">AI Generate</p>
            </div>
            <Sparkles size={14} className="ml-auto text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DocumentType | 'all')}
            className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          >
            <option value="all">All Types</option>
            {Object.entries(documentTypes).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {selectedType === 'all' ? (
        // Grouped view
        <div className="space-y-8">
          {Object.entries(groupedDocs).map(([type, docs]) => {
            const config = documentTypes[type as DocumentType];
            return (
              <div key={type}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <config.icon size={20} className="text-[var(--text-muted)]" />
                  {config.label}s
                  <span className="text-sm font-normal text-[var(--text-muted)]">
                    ({docs.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docs.map((doc) => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Flat view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {filteredDocs.length === 0 && (
        <div className="glass-card p-12 text-center">
          <FileText size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents found</h3>
          <p className="text-[var(--text-muted)] mb-4">
            Generate your first document with AI
          </p>
          <button
            onClick={() => setGenerateModalType('resume')}
            className="btn-gradient inline-flex items-center gap-2"
          >
            <Sparkles size={18} />
            Generate Resume
          </button>
        </div>
      )}

      {/* Generate Modal */}
      <GenerateModal
        isOpen={generateModalType !== null}
        onClose={() => setGenerateModalType(null)}
        type={generateModalType || 'resume'}
      />
    </div>
  );
}
