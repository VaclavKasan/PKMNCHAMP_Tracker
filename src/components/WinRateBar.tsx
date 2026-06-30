export function WinRateBar({ rate, height = 6 }: { rate: number; height?: number }) {
  const color = rate >= 60 ? 'bg-green-500' : rate >= 40 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div>
      <div className="w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200" style={{ height }}>
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}
