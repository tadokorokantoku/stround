import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useTimeline() {
  return useInfiniteQuery({
    queryKey: ['timeline'],
    queryFn: ({ pageParam = 1 }) => apiService.getTimeline(pageParam, 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2分
    gcTime: 5 * 60 * 1000, // 5分
  });
}

export function usePublicTimeline() {
  return useInfiniteQuery({
    queryKey: ['timeline', 'public'],
    queryFn: ({ pageParam = 1 }) => apiService.getPublicTimeline(pageParam, 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUserTimeline(userId: string) {
  return useInfiniteQuery({
    queryKey: ['timeline', 'user', userId],
    queryFn: ({ pageParam = 1 }) => apiService.getUserTimeline(userId, pageParam, 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useUserTracks(userId?: string, categoryId?: string) {
  return useInfiniteQuery({
    queryKey: ['userTracks', userId, categoryId],
    queryFn: ({ pageParam = 1 }) => apiService.getUserTracks(userId, categoryId, pageParam, 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.tracks?.length === 20 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useComments(userTrackId: string) {
  return useQuery({
    queryKey: ['comments', userTrackId],
    queryFn: () => apiService.getComments(userTrackId, 1, 50),
    enabled: !!userTrackId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiService.getNotifications(),
    staleTime: 1 * 60 * 1000, // 1分
    gcTime: 3 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // 2分毎に自動更新
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiService.getUnreadNotificationCount(),
    staleTime: 30 * 1000, // 30秒
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000, // 1分毎に自動更新
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiService.getCategories(),
    staleTime: 30 * 60 * 1000, // 30分
    gcTime: 60 * 60 * 1000, // 1時間
  });
}

export function useSearchTracks(query: string, enabled = true) {
  return useQuery({
    queryKey: ['tracks', 'search', query],
    queryFn: () => apiService.searchTracks(query, 20),
    enabled: enabled && query.length > 2,
    staleTime: 10 * 60 * 1000, // 10分
    gcTime: 30 * 60 * 1000,
  });
}

export function useFollowCounts(userId: string) {
  return useQuery({
    queryKey: ['follows', 'counts', userId],
    queryFn: () => apiService.getFollowCounts(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Mutation hooks
export function useLikeUserTrack() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userTrackId: string) => apiService.likeUserTrack(userTrackId),
    onSuccess: () => {
      // タイムラインとユーザートラックのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['userTracks'] });
    },
  });
}

export function useUnlikeUserTrack() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userTrackId: string) => apiService.unlikeUserTrack(userTrackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['userTracks'] });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userTrackId, content, parentCommentId }: {
      userTrackId: string;
      content: string;
      parentCommentId?: string;
    }) => apiService.createComment(userTrackId, content, parentCommentId),
    onSuccess: (_, { userTrackId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', userTrackId] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useCreateUserTrack() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ categoryId, spotifyTrackId, comment }: {
      categoryId: string;
      spotifyTrackId: string;
      comment?: string;
    }) => apiService.createUserTrack(categoryId, spotifyTrackId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['userTracks'] });
    },
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => apiService.followUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => apiService.unfollowUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => apiService.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiService.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}