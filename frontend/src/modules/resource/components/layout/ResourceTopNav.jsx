/**
 * ResourceTopNav — horizontal tab bar replacing the left sidebar.
 * Uses ABSOLUTE paths to prevent route nesting bugs.
 */
import { NavLink } from 'react-router-dom';
import { usePlatformBase } from '../../../../shared/utils/platformNav';
import { useResource } from '../../context/ResourceContext';


export default function ResourceTopNav() {
    const base = usePlatformBase();
    const isMobile = base.includes('/mobile');
    const BASE = `${base}/resource`;
    const TABS = [
        { to: `${base}/home`,               icon: '🏠', label: 'Home',       end: false },
        { to: BASE,                       icon: '📊', label: 'Dashboard',  end: true },
        { to: `${base}/resource/materials`, icon: '🧱', label: 'Materials' },
        { to: `${base}/resource/equipment`, icon: '🚜', label: 'Equipment' },
        { to: `${base}/resource/labor`,     icon: '👷', label: 'Labor'     },
        { to: `${base}/resource/suppliers`, icon: '🏪', label: 'Suppliers' },
        { to: `${base}/resource/purchases`, icon: '📦', label: 'Purchases' },
        { to: `${base}/resource/help`,      icon: '📖', label: 'सहायता'   },
    ];
  const { materials, loading } = useResource();
  const totalMaterials = materials.length;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
      {/* Module header row */}
      <div className={`flex items-center justify-between ${isMobile ? 'px-3 py-2.5' : 'px-6 py-3'} border-b border-gray-100 gap-3`}>
        <div className="flex items-center gap-2">
          <span className={isMobile ? 'text-base' : 'text-lg'}>🏗️</span>
          <div>
            <p className={`${isMobile ? 'text-[11px]' : 'text-xs'} font-black text-gray-800 uppercase tracking-wider leading-none`}>Resource</p>
            <p className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} text-gray-400 leading-none mt-0.5`}>स्रोत व्यवस्थापन</p>
          </div>
        </div>

        {/* Materials count pill */}
        {!loading && totalMaterials > 0 && (
          <div className={`${isMobile ? 'px-2.5 py-1' : 'px-3 py-1.5'} bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-2 shrink-0`}>
            <p className={`${isMobile ? 'text-[8px]' : 'text-[9px]'} font-bold text-gray-500 uppercase tracking-wider`}>सामग्री</p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-black text-gray-700`}>{totalMaterials}</p>
          </div>
        )}
      </div>

      {/* Tab row */}
      <div className={`flex items-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-4'} overflow-x-auto scrollbar-hide`}>
        {TABS.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center ${isMobile ? 'flex-col gap-1 px-3 py-2 min-w-[70px] rounded-xl border' : 'gap-1.5 px-3 py-3 border-b-2'} text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? isMobile ? 'border-black text-gray-900 bg-gray-50' : 'border-black text-gray-900'
                  : isMobile ? 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50' : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
              }`
            }
          >
            <span className={isMobile ? 'text-base leading-none' : 'text-sm'}>{icon}</span>
            <span className={isMobile ? 'text-[9px] leading-tight text-center uppercase tracking-wide' : ''}>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
