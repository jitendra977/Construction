import React from 'react';
import StructureTopNav from './StructureTopNav';

export default function StructureLayout({ children }) {
    return (
        <div className="flex flex-col min-h-full" style={{ background: 'var(--t-bg)' }}>
            <StructureTopNav />
            <main className="flex-1 p-6">
                {children}
            </main>
        </div>
    );
}
