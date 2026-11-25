const colors = {
  success: 'bg-green-100 text-green-900',
  pending: 'bg-turmeric/30 text-brown',
  cancelled: 'bg-red-100 text-red-800',
};

export default function OrderBadge({ status }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status.tone]}`}>{status.label}</span>;
}
