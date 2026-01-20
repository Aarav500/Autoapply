'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ============================================
// REDIRECT TO TRANSFER HUB
// The old essay system has been replaced with the ultimate Transfer Hub
// ============================================

export default function EssaysRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to Transfer Hub
        router.push('/transfer');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Redirecting to Transfer Hub...
                </h2>
                <p className="text-slate-600">
                    We've upgraded the essay system!
                </p>
            </div>
        </div>
    );
}
