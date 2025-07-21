import { supabase } from '../lib/supabase';

const API_BASE_URL = 'http://localhost:8787/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Timeline endpoints
  async getTimeline(page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/timeline?page=${page}&limit=${limit}`);
  }

  async getPublicTimeline(page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/timeline/public?page=${page}&limit=${limit}`);
  }

  async getUserTimeline(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/timeline/user/${userId}?page=${page}&limit=${limit}`);
  }

  // Follow endpoints
  async followUser(userId: string): Promise<any> {
    return this.request(`/follows/${userId}`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string): Promise<any> {
    return this.request(`/follows/${userId}`, {
      method: 'DELETE',
    });
  }

  async getFollowStatus(followerId: string, followingId: string): Promise<any> {
    return this.request(`/follows/status/${followerId}/${followingId}`);
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/follows/followers/${userId}?page=${page}&limit=${limit}`);
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/follows/following/${userId}?page=${page}&limit=${limit}`);
  }

  async getFollowCounts(userId: string): Promise<any> {
    return this.request(`/follows/counts/${userId}`);
  }

  // Like endpoints
  async likeUserTrack(userTrackId: string): Promise<any> {
    return this.request('/likes', {
      method: 'POST',
      body: JSON.stringify({ user_track_id: userTrackId }),
    });
  }

  async unlikeUserTrack(userTrackId: string): Promise<any> {
    return this.request(`/likes/${userTrackId}`, {
      method: 'DELETE',
    });
  }

  async getLikes(userTrackId: string, page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/likes/user-track/${userTrackId}?page=${page}&limit=${limit}`);
  }

  // Comment endpoints
  async createComment(userTrackId: string, content: string, parentCommentId?: string): Promise<any> {
    return this.request('/comments', {
      method: 'POST',
      body: JSON.stringify({ 
        user_track_id: userTrackId, 
        content,
        parent_comment_id: parentCommentId 
      }),
    });
  }

  async createReply(userTrackId: string, content: string, parentCommentId: string): Promise<any> {
    return this.createComment(userTrackId, content, parentCommentId);
  }

  async getComments(userTrackId: string, page: number = 1, limit: number = 50): Promise<any> {
    return this.request(`/comments/user-track/${userTrackId}?page=${page}&limit=${limit}`);
  }

  async getComment(commentId: string): Promise<any> {
    return this.request(`/comments/${commentId}`);
  }

  async updateComment(commentId: string, content: string): Promise<any> {
    return this.request(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(commentId: string): Promise<any> {
    return this.request(`/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // User track endpoints
  async getUserTracks(userId?: string, categoryId?: string, page: number = 1, limit: number = 20): Promise<any> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (userId) params.append('user_id', userId);
    if (categoryId) params.append('category_id', categoryId);
    
    return this.request(`/user-tracks?${params.toString()}`);
  }

  async createUserTrack(categoryId: string, spotifyTrackId: string, comment?: string): Promise<any> {
    return this.request('/user-tracks', {
      method: 'POST',
      body: JSON.stringify({ 
        category_id: categoryId, 
        spotify_track_id: spotifyTrackId,
        comment 
      }),
    });
  }

  // Category endpoints
  async getCategories(): Promise<any> {
    return this.request('/categories');
  }

  // Music endpoints
  async searchTracks(query: string, limit: number = 20): Promise<any> {
    return this.request(`/music/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getTrack(trackId: string): Promise<any> {
    return this.request(`/music/track/${trackId}`);
  }
}

export const apiService = new ApiService();