import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

interface UseTimelineOptions {
  userId?: string;
  isPublic?: boolean;
}

interface TimelineState {
  posts: any[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: string | null;
  page: number;
}

export default function useTimeline({ userId, isPublic = false }: UseTimelineOptions = {}) {
  const [state, setState] = useState<TimelineState>({
    posts: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    error: null,
    page: 1,
  });

  const fetchTimeline = useCallback(
    async (page: number = 1, isRefresh = false) => {
      try {
        setState(prev => ({
          ...prev,
          loading: page === 1 && !isRefresh,
          refreshing: isRefresh,
          error: null,
        }));

        let response;
        if (userId) {
          response = await apiService.getUserTimeline(userId, page);
        } else if (isPublic) {
          response = await apiService.getPublicTimeline(page);
        } else {
          response = await apiService.getTimeline(page);
        }

        const { timeline, hasMore: apiHasMore } = response;

        setState(prev => ({
          ...prev,
          posts: page === 1 ? timeline : [...prev.posts, ...timeline],
          hasMore: apiHasMore || timeline.length >= 20,
          page: page,
          loading: false,
          refreshing: false,
        }));
      } catch (error) {
        console.error('Timeline fetch error:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'タイムラインの取得に失敗しました',
          loading: false,
          refreshing: false,
        }));
      }
    },
    [userId, isPublic]
  );

  const refresh = useCallback(() => {
    fetchTimeline(1, true);
  }, [fetchTimeline]);

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      fetchTimeline(state.page + 1);
    }
  }, [fetchTimeline, state.loading, state.hasMore, state.page]);

  const invalidateTimeline = useCallback(() => {
    // Force refresh the timeline (useful when user posts or likes something)
    fetchTimeline(1, false);
  }, [fetchTimeline]);

  // Initial load
  useEffect(() => {
    fetchTimeline(1);
  }, [fetchTimeline]);

  return {
    ...state,
    refresh,
    loadMore,
    invalidateTimeline,
  };
}