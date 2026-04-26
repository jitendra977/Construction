/** Formats a number as NPR currency. */
export default function AmountDisplay({ value, className = '', size = 'md', colorize = false }) {
  const num = Number(value || 0);
  const formatted = 'NPR ' + Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const sizeClass = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg', xl: 'text-2xl' }[size] || 'text-sm';
  const colorClass = colorize
    ? num < 0 ? 'text-red-600' : num > 0 ? 'text-green-600' : 'text-gray-500'
    : '';

  return (
    <span className={`font-bold tabular-nums ${sizeClass} ${colorClass} ${className}`}>
      {formatted}
    </span>
  );
}
