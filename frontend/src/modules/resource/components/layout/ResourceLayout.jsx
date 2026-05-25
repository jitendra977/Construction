import ResourceTopNav from './ResourceTopNav';
import ManagementTabs from '../../../../components/desktop/manage/ManagementTabs';
import { useResource } from '../../context/ResourceContext';
import { usePlatformBase } from '../../../../shared/utils/platformNav';

export default function ResourceLayout({ children }) {
  const { error } = useResource();
  const base = usePlatformBase();
  const isMobile = base.includes('/mobile');

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {!isMobile && <ManagementTabs />}
      <ResourceTopNav />

      <main className={`flex-1 ${isMobile ? 'px-3 py-3 pb-24' : 'p-6 pb-28'}`}>
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
