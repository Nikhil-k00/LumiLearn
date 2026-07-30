"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";

export interface StudentData {
  name: string;
  age: number;
  avatarId: string;
  xp: number;
  coins: number;
  level: number;
  streak: number;
}

export interface ProfileData {
  phonicsScore: number;
  readingScore: number;
  memoryScore: number;
  speechScore?: number;
  writingScore?: number;
  weakAreas: string[];
  strongAreas?: string[];
  currentDifficulty?: Record<string, number>;
}

export interface DashboardData {
  student: StudentData;
  profile: ProfileData | null;
  recentAchievements: Array<{ name: string; emoji: string }>;
}

export function useDashboardData(userId: string | null | undefined) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshCounterRef = useRef(0);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/students/${userId}/dashboard`);
      setData(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch dashboard data";
      setError(message);
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch on mount or userId change
  useEffect(() => {
    fetchDashboardData();
  }, [userId, fetchDashboardData]);

  // Refresh function that can be called manually
  const refetch = useCallback(async () => {
    refreshCounterRef.current += 1;
    await fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, error, refetch };
}
