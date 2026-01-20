'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { ToastContainer, OfflineIndicator } from '@/components/Notifications';
import { ErrorBoundary } from '@/lib/error-handling';

interface ClientLayoutProps {
    children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
    return (
        <>
            <OfflineIndicator />
            <ToastContainer />
            <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 p-8 overflow-auto">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
        </>
    );
}
