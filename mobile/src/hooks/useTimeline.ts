import { useMemo } from 'react';
import { useTimeline as useTimelineQuery, usePublicTimeline, useUserTimeline } from './useOptimizedApi';

interface UseTimelineOptions {
  userId?: string;
  isPublic?: boolean;
}

export default function useTimeline({ userId, isPublic = false }: UseTimelineOptions = {}) {
  const query = useMemo(() => {
    if (userId) {
      return useUserTimeline(userId);
    } else if (isPublic) {
      return usePublicTimeline();
    } else {
      return useTimelineQuery();
    }
  }, [userId, isPublic]);

  const {
    data,
    isLoading,
    isFetching,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  } = query;

  const posts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.timeline || []);
  }, [data]);

  const refresh = () => {
    refetch();
  };

  const loadMore = () => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  };

  const invalidateTimeline = () => {
    refetch();
  };

  return {
    posts,
    loading: isLoading,
    refreshing: isRefetching,
    hasMore: hasNextPage || false,
    error: error?.message || null,
    page: data?.pages?.length || 1,
    refresh,
    loadMore,
    invalidateTimeline,
  };
}