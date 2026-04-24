export default function EmptyState({ icon = '📭', title, description, action }) {
  // action can be a JSX element OR { label, onClick }
  const actionEl = action
    ? typeof action === 'object' && action.label
      ? (
        <button
          onClick={action.onClick}
          className="mt-2 px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors"
        >
          {action.label}
        </button>
      )
      : action
    : null;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4 opacity-40">{icon}</div>
      <h3 className="text-sm font-bold text-gray-500 mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-400 mb-4 max-w-xs">{description}</p>}
      {actionEl}
    </div>
  );
}
