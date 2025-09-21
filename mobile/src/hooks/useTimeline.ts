import { useMemo } from "react";
import {
  usePublicTimeline,
  useTimeline as useTimelineQuery,
  useUserTimeline,
} from "./useOptimizedApi";

interface UseTimelineOptions {
  userId?: string;
  isPublic?: boolean;
}

export default function useTimeline({
  userId,
  isPublic = false,
}: UseTimelineOptions = {}) {
  // 常にすべてのHooksを呼び出す（Hooksの順序を一定に保つ）
  const personalTimelineQuery = useTimelineQuery();
  const publicTimelineQuery = usePublicTimeline();
  const userTimelineQuery = useUserTimeline(userId || "");

  const query = useMemo(() => {
    if (userId) {
      return userTimelineQuery;
    } else if (isPublic) {
      return publicTimelineQuery;
    } else {
      return personalTimelineQuery;
    }
  }, [
    userId,
    isPublic,
    userTimelineQuery,
    publicTimelineQuery,
    personalTimelineQuery,
  ]);

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
    return data.pages.flatMap((page) => {
      // エラーレスポンスやundefinedの場合を考慮
      if (!page || page.error) {
        return [];
      }
      // page.timeline が配列であることを確認
      const timeline = page.timeline;
      if (Array.isArray(timeline)) {
        // 必要なプロパティを持つpostのみフィルタリング
        return timeline.filter(
          (post) => post && post.id && post.profiles && post.categories,
        );
      }
      return [];
    });
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
    page: data?.pages && Array.isArray(data.pages) ? data.pages.length : 1,
    refresh,
    loadMore,
    invalidateTimeline,
  };
}
