import { useEffect, useState } from 'react';

interface Props {
  startHour?: number;
  endHour?: number;
}

export default function CurrentTimeLine({ startHour = 0, endHour = 24 }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const totalMinutes = (endHour - startHour) * 60;
  const startMinutes = startHour * 60;
  const top = ((currentMinutes - startMinutes) / totalMinutes) * 100;

  if (top < 0 || top > 100) return null;

  return (
    <div
      className="absolute left-12 right-2 z-10 pointer-events-none current-time-line"
      style={{ top: `${top}%` }}
    >
      <div className="h-0.5 bg-red-500 w-full" />
    </div>
  );
}
