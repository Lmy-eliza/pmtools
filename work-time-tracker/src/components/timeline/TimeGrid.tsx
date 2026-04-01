interface Props {
  startHour?: number;
  endHour?: number;
}

export default function TimeGrid({ startHour = 0, endHour = 24 }: Props) {
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {hours.map((hour) => (
        <div key={hour}>
          {/* 整点线 */}
          <div
            className="absolute left-0 right-0 border-t border-gray-100"
            style={{ top: `${((hour - startHour) / (endHour - startHour)) * 100}%` }}
          >
            <span className="absolute -top-2.5 left-2 text-xs text-gray-400 font-mono bg-white/80 px-1 rounded">
              {String(hour).padStart(2, '0')}:00
            </span>
          </div>
          {/* 半点虚线 */}
          <div
            className="absolute left-14 right-0 border-t border-dashed border-gray-100/60"
            style={{ top: `${((hour - startHour + 0.5) / (endHour - startHour)) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}
