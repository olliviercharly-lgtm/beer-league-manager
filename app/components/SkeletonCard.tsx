export default function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="blm-card" style={{ marginBottom: 16 }}>
      <div className="blm-skeleton" style={{ width: '35%', height: 12, marginBottom: 12 }} />
      <div className="blm-skeleton" style={{ width: '70%', height: 18, marginBottom: 16 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="blm-skeleton"
          style={{ width: i === lines - 1 ? '55%' : '100%', height: 12, marginBottom: 8 }}
        />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </>
  )
}
