import { useState, useEffect, useRef } from 'react';

export function useChallengeSession(hints: string[]) {
    const [timeSeconds, setTimeSeconds] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [showHint, setShowHint] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(true);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setTimeSeconds(prev => prev + 1);
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning]);

    const stopTimer = () => setIsRunning(false);
    const resetSession = () => {
        setIsRunning(true);
        setTimeSeconds(0);
        setHintsUsed(0);
        setShowHint(null);
    };

    const requestHint = () => {
        if (hintsUsed < hints.length) {
            setShowHint(hints[hintsUsed]);
            setHintsUsed(prev => prev + 1);
        } else {
            setShowHint('No hay más pistas disponibles para este desafío.');
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return {
        timeSeconds,
        formattedTime: formatTime(timeSeconds),
        hintsUsed,
        showHint,
        requestHint,
        stopTimer,
        resetSession,
        totalHints: hints.length
    };
}
