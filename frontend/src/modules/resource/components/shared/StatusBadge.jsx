/**
 * StatusBadge — colored pill for various status/category fields.
 *
 * Props:
 *   status  — the value to display
 *   type    — 'material_category' | 'equipment_status' | 'worker_role' | 'purchase_status'
 */

const CONFIGS = {
  material_category: {
    CEMENT:     { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200' },
    STEEL:      { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
    SAND:       { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
    BRICK:      { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
    WOOD:       { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200' },
    ELECTRICAL: { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200' },
    PLUMBING:   { bg: 'bg-cyan-50',    text: 'text-cyan-700',   border: 'border-cyan-200' },
    OTHER:      { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200' },
  },
  equipment_status: {
    AVAILABLE:   { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    IN_USE:      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
    MAINTENANCE: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    RETIRED:     { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  },
  worker_role: {
    MASON:       { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
    CARPENTER:   { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    ELECTRICIAN: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    PLUMBER:     { bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200' },
    PAINTER:     { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    HELPER:      { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200' },
    SUPERVISOR:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    ENGINEER:    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    OTHER:       { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200' },
  },
  purchase_status: {
    DRAFT:      { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200' },
    ORDERED:    { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
    RECEIVED:   { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    CANCELLED:  { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  },
};

const DEFAULT_STYLE = { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };

export default function StatusBadge({ status, type }) {
  const typeMap = CONFIGS[type] || {};
  const style   = typeMap[status] || DEFAULT_STYLE;

  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-black rounded-full border ${style.bg} ${style.text} ${style.border}`}
    >
      {status}
    </span>
  );
}
