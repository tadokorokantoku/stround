export interface User {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Track {
  spotifyId: string;
  title: string;
  artist: string;
  album?: string;
  imageUrl?: string;
  previewUrl?: string;
  externalUrl?: string;
  durationMs?: number;
  createdAt: string;
}

export interface UserTrack {
  id: string;
  userId: string;
  categoryId: string;
  spotifyTrackId: string;
  comment?: string;
  createdAt: string;
  user?: User;
  category?: Category;
  track?: Track;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  userTrackId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  user?: User;
  replies?: Comment[];
}

export interface Like {
  userTrackId: string;
  userId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}