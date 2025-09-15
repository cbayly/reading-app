import React, { useEffect, useRef, useState } from 'react';

interface Plan3LoadingScreenProps {
  studentName: string;
  isVisible: boolean;
  estimatedDurationMs?: number; // purely for progress UI; not required
}

// Full-screen skeleton overlay shown while generating a 3-day plan
const Plan3LoadingScreen: React.FC<Plan3LoadingScreenProps> = ({
  studentName,
  isVisible,
  estimatedDurationMs = 45000
}) => {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      startRef.current = null;
      return;
    }

    startRef.current = Date.now();
    const id = setInterval(() => {
      if (!startRef.current) return;
      const elapsed = Date.now() - startRef.current;
      // Cap at 96% until navigation finishes to avoid "stuck at 100%" feel
      const pct = Math.min(96, Math.round((elapsed / estimatedDurationMs) * 100));
      setProgress(pct);
    }, 400);
    return () => clearInterval(id);
  }, [isVisible, estimatedDurationMs]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-white/80 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-4xl mx-4">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-6 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Plan title */}
        <div className="mb-8">
          <div className="text-xl font-semibold text-gray-800">
            Creating {studentName}'s 3‑Day Reading Plan
          </div>
          <div className="text-sm text-gray-600 mt-1">This usually takes under a minute.</div>
        </div>

        {/* Skeleton grid for 3 days */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[0,1,2].map((i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-4 bg-white">
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4/6 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-600">{progress}%</div>
        </div>
      </div>
    </div>
  );
};

export default Plan3LoadingScreen;





