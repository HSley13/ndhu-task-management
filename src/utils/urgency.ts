import { differenceInDays, parseISO, startOfDay } from "date-fns";
import type { Task } from "../types";

function timeUrgency(task: Task): number {
    if (!task.due_date) return 5;
    const today = startOfDay(new Date());
    const due = startOfDay(parseISO(task.due_date));
    const diff = differenceInDays(due, today); // negative = overdue
    if (diff < 0) return 100;
    if (diff === 0) return 95;
    if (diff === 1) return 85;
    if (diff <= 3) return 70;
    if (diff <= 7) return 52;
    if (diff <= 14) return 32;
    if (diff <= 30) return 15;
    return 5;
}

export function computeUrgencyScore(task: Task): number {
    const tu = timeUrgency(task);
    const ef = task.effort * 20;           // 1→20, 5→100
    const pin = task.is_pinned ? 10 : 0;
    return Math.min(100, Math.round(tu * 0.6 + ef * 0.3 + pin));
}

export type UrgencyLevel = "critical" | "high" | "medium" | "low";

export function urgencyLevel(score: number): UrgencyLevel {
    if (score >= 85) return "critical";
    if (score >= 65) return "high";
    if (score >= 40) return "medium";
    return "low";
}

export const URGENCY_COLOR: Record<UrgencyLevel, string> = {
    critical: "#FF4D6A",
    high: "#FB923C",
    medium: "#F59E0B",
    low: "#55556A",
};

export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
};
