import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function formatSalary(min?: number, max?: number, currency = 'USD'): string {
  if (!min && !max) return 'Not specified';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }
  if (min) return `${formatter.format(min)}+`;
  if (max) return `Up to ${formatter.format(max)}`;
  return 'Not specified';
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function calculateMatchScore(
  userSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[]
): { score: number; matched: string[]; missing: string[] } {
  const normalizedUserSkills = userSkills.map((s) => s.toLowerCase());

  const matchedRequired = requiredSkills.filter((skill) =>
    normalizedUserSkills.some((us) => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us))
  );

  const matchedPreferred = preferredSkills.filter((skill) =>
    normalizedUserSkills.some((us) => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us))
  );

  const requiredWeight = 0.7;
  const preferredWeight = 0.3;

  const requiredScore = requiredSkills.length > 0
    ? (matchedRequired.length / requiredSkills.length) * 100
    : 100;

  const preferredScore = preferredSkills.length > 0
    ? (matchedPreferred.length / preferredSkills.length) * 100
    : 100;

  const score = Math.round(requiredScore * requiredWeight + preferredScore * preferredWeight);

  const matched = [...matchedRequired, ...matchedPreferred];
  const missing = requiredSkills.filter((skill) => !matchedRequired.includes(skill));

  return { score, matched, missing };
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    applied: 'bg-blue-500/20 text-blue-400',
    screening: 'bg-yellow-500/20 text-yellow-400',
    phone_screen: 'bg-purple-500/20 text-purple-400',
    interview: 'bg-indigo-500/20 text-indigo-400',
    technical: 'bg-cyan-500/20 text-cyan-400',
    onsite: 'bg-pink-500/20 text-pink-400',
    offer: 'bg-green-500/20 text-green-400',
    negotiation: 'bg-orange-500/20 text-orange-400',
    accepted: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
    withdrawn: 'bg-gray-500/20 text-gray-400',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400';
}

export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    linkedin: 'linkedin',
    indeed: 'briefcase',
    glassdoor: 'building',
    wellfound: 'rocket',
    weworkremotely: 'globe',
    remoteok: 'wifi',
    hackernews: 'terminal',
    manual: 'edit',
  };
  return icons[platform.toLowerCase()] || 'link';
}
