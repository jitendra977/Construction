import StructureTopNav from './StructureTopNav';
import ManagementTabs from '../../../../components/desktop/manage/ManagementTabs';

export default function StructureLayout({ children }) {
    return (
        <div className="flex flex-col min-h-full" style={{ background: 'var(--t-bg)' }}>
            <ManagementTabs />
            <StructureTopNav />
            <main className="flex-1 p-6 pb-28">
                {children}
            </main>
        </div>
    );
}
