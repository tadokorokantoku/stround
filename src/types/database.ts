export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          music_id: string | null;
          created_at: string;
          updated_at: string;
          like_count: number;
          comment_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          music_id?: string | null;
          created_at?: string;
          updated_at?: string;
          like_count?: number;
          comment_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          music_id?: string | null;
          created_at?: string;
          updated_at?: string;
          like_count?: number;
          comment_count?: number;
        };
      };
      music: {
        Row: {
          id: string;
          spotify_id: string;
          title: string;
          artist: string;
          album: string | null;
          image_url: string | null;
          preview_url: string | null;
          external_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          spotify_id: string;
          title: string;
          artist: string;
          album?: string | null;
          image_url?: string | null;
          preview_url?: string | null;
          external_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          spotify_id?: string;
          title?: string;
          artist?: string;
          album?: string | null;
          image_url?: string | null;
          preview_url?: string | null;
          external_url?: string;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}