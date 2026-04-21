type OrderProgressTrackerProps = {
  status: string;
};

const TRACK_STEPS = [
  { key: 'ordered', label: 'Ordered' },
  { key: 'pending', label: 'Pending' },
  { key: 'en_route', label: 'En Route' },
  { key: 'delivered', label: 'Delivered' },
];

function normalizeStatus(status: string): string {
  const raw = status.trim().toLowerCase();
  const map: Record<string, string> = {
    order_placed: 'ordered',
    payment_confirmed: 'ordered',
    processing: 'pending',
    packed: 'pending',
    in_transit: 'en_route',
    out_for_delivery: 'en_route',
    'en-route': 'en_route',
    enroute: 'en_route',
  };
  return map[raw] || raw;
}

function resolveStepIndex(status: string): number {
  const normalized = normalizeStatus(status);
  const index = TRACK_STEPS.findIndex(step => step.key === normalized);
  return index >= 0 ? index : 0;
}

export function OrderProgressTracker({ status }: OrderProgressTrackerProps) {
  const currentIndex = resolveStepIndex(status);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', alignItems: 'center', gap: '0.4rem' }}>
        {TRACK_STEPS.map((step, idx) => {
          const isComplete = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.key} style={{ textAlign: 'center' }}>
              <div
                style={{
                  margin: '0 auto',
                  width: '28px',
                  height: '28px',
                  borderRadius: '9999px',
                  border: isComplete ? '2px solid #166534' : '2px solid #cbd5e1',
                  backgroundColor: isComplete ? '#dcfce7' : '#f8fafc',
                  color: isComplete ? '#166534' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(22, 101, 52, 0.18)' : 'none',
                }}
              >
                {idx + 1}
              </div>
              <div style={{ marginTop: '0.45rem', fontSize: '0.78rem', fontWeight: isCurrent ? 800 : 600, color: isComplete ? '#166534' : '#64748b' }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.4rem', marginTop: '0.55rem' }}>
        {TRACK_STEPS.slice(0, -1).map((step, idx) => {
          const active = idx < currentIndex;
          return (
            <div
              key={`${step.key}-line`}
              style={{
                height: '5px',
                borderRadius: '9999px',
                backgroundColor: active ? '#16a34a' : '#e2e8f0',
                transition: 'background-color 0.2s',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
