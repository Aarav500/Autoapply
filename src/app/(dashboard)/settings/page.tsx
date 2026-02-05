'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Key,
  Bell,
  Mail,
  Phone,
  Shield,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface APIConnection {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  isConnected: boolean;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password';
    placeholder: string;
    value: string;
  }[];
  docsUrl?: string;
}

const initialConnections: APIConnection[] = [
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS and WhatsApp notifications',
    icon: Phone,
    isConnected: false,
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'ACxxxxxxxx', value: '' },
      { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: 'Your auth token', value: '' },
      { key: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '+1234567890', value: '' },
    ],
    docsUrl: 'https://www.twilio.com/docs/usage/api',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email notifications and digests',
    icon: Mail,
    isConnected: true,
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'SG.xxxxxxxx', value: '••••••••••••' },
      { key: 'fromEmail', label: 'From Email', type: 'text', placeholder: 'notifications@yourdomain.com', value: 'jobs@autoapply.io' },
    ],
    docsUrl: 'https://docs.sendgrid.com/api-reference/how-to-use-the-sendgrid-v3-api',
  },
  {
    id: 'claude',
    name: 'Claude API',
    description: 'AI-powered features (job matching, cover letters)',
    icon: Key,
    isConnected: true,
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-ant-xxxxxxxx', value: '••••••••••••' },
    ],
    docsUrl: 'https://docs.anthropic.com/en/api',
  },
];

function ConnectionCard({
  connection,
  onUpdate,
  onTest,
}: {
  connection: APIConnection;
  onUpdate: (id: string, fields: APIConnection['fields']) => void;
  onTest: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState(connection.fields);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);

  const Icon = connection.icon;

  const handleSave = () => {
    onUpdate(connection.id, fields);
    setIsEditing(false);
  };

  const handleTest = async () => {
    setIsTesting(true);
    await onTest(connection.id);
    setIsTesting(false);
  };

  return (
    <motion.div
      layout
      className="glass-card overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={cn(
              'p-3 rounded-xl',
              connection.isConnected
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            )}>
              <Icon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{connection.name}</h3>
                {connection.isConnected ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1">
                    <Check size={12} />
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs flex items-center gap-1">
                    <AlertCircle size={12} />
                    Not configured
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {connection.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connection.docsUrl && (
              <a
                href={connection.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ExternalLink size={18} />
              </a>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isEditing
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'border border-[var(--glass-border)] hover:bg-[var(--bg-hover)]'
              )}
            >
              {isEditing ? 'Cancel' : 'Configure'}
            </button>
          </div>
        </div>

        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-6 pt-6 border-t border-[var(--glass-border)]"
          >
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-2">{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...fields];
                        newFields[index] = { ...field, value: e.target.value };
                        setFields(newFields);
                      }}
                      placeholder={field.placeholder}
                      className="input-field pr-10"
                    />
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {showSecrets[field.key] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="px-4 py-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
              <button
                onClick={handleSave}
                className="btn-gradient"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const [connections, setConnections] = useState(initialConnections);
  const [activeTab, setActiveTab] = useState<'connections' | 'account' | 'privacy'>('connections');

  const updateConnection = (id: string, fields: APIConnection['fields']) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, fields, isConnected: fields.every((f) => f.value.length > 0) }
          : c
      )
    );
  };

  const testConnection = async (id: string) => {
    // Simulate API test
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Testing connection:', id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Manage your account and API connections
        </p>
      </div>

      {/* Tabs */}
      <div className="glass-card-subtle p-1.5 inline-flex gap-1">
        <button
          onClick={() => setActiveTab('connections')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'connections'
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          <Key size={18} />
          API Connections
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'account'
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          <Settings size={18} />
          Account
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'privacy'
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          <Shield size={18} />
          Privacy
        </button>
      </div>

      {/* Content */}
      {activeTab === 'connections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">API Connections</h2>
            <span className="text-sm text-[var(--text-muted)]">
              {connections.filter((c) => c.isConnected).length}/{connections.length} connected
            </span>
          </div>

          <div className="space-y-4">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onUpdate={updateConnection}
                onTest={testConnection}
              />
            ))}
          </div>

          <div className="glass-card p-5 border-l-4 border-blue-500">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Secure Storage</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  All API keys are encrypted and stored securely. We never share your credentials
                  and they are only used to provide the services you&apos;ve enabled.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Account Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  defaultValue="John Doe"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  defaultValue="john@example.com"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  defaultValue="+1 (555) 123-4567"
                  className="input-field"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="btn-gradient">Save Changes</button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <input
                  type="password"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="btn-gradient">Update Password</button>
            </div>
          </div>

          <div className="glass-card p-6 border-l-4 border-red-500">
            <h3 className="font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      )}

      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Data & Privacy</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                <div>
                  <h4 className="font-medium">Analytics</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Help us improve by sharing anonymous usage data
                  </p>
                </div>
                <button className="w-12 h-7 rounded-full bg-[var(--accent-primary)] relative">
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                <div>
                  <h4 className="font-medium">Marketing Emails</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Receive updates about new features and tips
                  </p>
                </div>
                <button className="w-12 h-7 rounded-full bg-[var(--bg-elevated)] relative">
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                <div>
                  <h4 className="font-medium">Profile Visibility</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Make your profile visible to recruiters
                  </p>
                </div>
                <button className="w-12 h-7 rounded-full bg-[var(--accent-primary)] relative">
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Export Your Data</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Download a copy of all your data including profile, applications, documents, and settings.
            </p>
            <button className="px-4 py-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--bg-hover)] transition-colors">
              Request Data Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
