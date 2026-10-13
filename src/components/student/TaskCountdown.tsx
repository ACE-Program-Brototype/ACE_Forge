"use client";

import { useState, useEffect } from "react";
import { RiTimeLine, RiAlertLine } from "react-icons/ri";

interface TaskCountdownProps {
  dueAt: string | Date;
  status: string;
}

export default function TaskCountdown({ dueAt, status }: TaskCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false });

  useEffect(() => {
    function calculate() {
      const now = new Date().getTime();
      const target = new Date(dueAt).getTime();
      const difference = target - now;

      if (difference <= 0) {
        const absDiff = Math.abs(difference);
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((absDiff / 1000 / 60) % 60);
        setTimeLeft({ days, hours, minutes, seconds: 0, isOverdue: true });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isOverdue: false });
      }
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [dueAt]);

  if (status === "SUBMITTED" || status === "REVIEWED") {
    return (
      <span className="text-xs text-muted flex items-center gap-1">
        Due: {new Date(dueAt).toLocaleDateString()}
      </span>
    );
  }

  if (timeLeft.isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
        <RiAlertLine className="text-sm" />
        Overdue by {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}{timeLeft.hours}h {timeLeft.minutes}m
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${
        timeLeft.days === 0
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-surface-container text-secondary border-outline-variant"
      }`}
    >
      <RiTimeLine className="text-xs" />
      {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
      {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.days === 0 ? `${timeLeft.seconds}s` : ""} remaining
    </span>
  );
}
