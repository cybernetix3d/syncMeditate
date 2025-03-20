import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthProvider';
import { UserProfile } from '../context/AuthProvider';

interface DailyMeditationStats {
  sessionCount: number;
  totalMinutes: number;
}

const isUserProfile = (user: boolean | UserProfile | null): user is UserProfile => {
  return typeof user !== 'boolean' && user !== null && 'id' in user;
};

export const useDailyMeditations = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DailyMeditationStats>({
    sessionCount: 0,
    totalMinutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyStats = async () => {
    if (!isUserProfile(user)) {
      setLoading(false);
      return;
    }

    try {
      // Get today's date at midnight UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('meditation_completions')
        .select('duration')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', today.toISOString());

      if (error) throw error;

      if (data) {
        const totalMinutes = data.reduce((sum, session) => sum + (session.duration / 60), 0);
        setStats({
          sessionCount: data.length,
          totalMinutes: Math.round(totalMinutes),
        });
      }
    } catch (err: any) {
      console.error('Error fetching daily meditation stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to changes in meditation_completions
  useEffect(() => {
    if (!isUserProfile(user)) {
      setLoading(false);
      return;
    }

    fetchDailyStats();

    const subscription = supabase
      .channel('daily-meditations')
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'meditation_completions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch stats when there are changes
          fetchDailyStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    stats,
    loading,
    error,
    refetch: fetchDailyStats
  };
}; 