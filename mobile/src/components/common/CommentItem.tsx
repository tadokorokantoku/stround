import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../services/api';

interface CommentProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  user_track_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  profiles: CommentProfile;
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  userTrackId: string;
  depth?: number;
  onReply: (commentId: string, content: string) => void;
  onUpdate: () => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  userTrackId,
  depth = 0,
  onReply,
  onUpdate,
}) => {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const maxDepth = 3; // 最大ネスト深度

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return '今';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}時間前`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  };

  const handleUpdate = async () => {
    if (!editContent.trim()) return;

    setIsUpdating(true);
    try {
      await apiService.updateComment(comment.id, editContent.trim());
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Comment update failed:', error);
      Alert.alert('エラー', 'コメントの更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'コメントを削除',
      'このコメントとすべての返信を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await apiService.deleteComment(comment.id);
              onUpdate();
            } catch (error) {
              console.error('Comment deletion failed:', error);
              Alert.alert('エラー', 'コメントの削除に失敗しました');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    setIsReplying(true);
    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setShowReplyInput(false);
      onUpdate();
    } catch (error) {
      console.error('Reply failed:', error);
      Alert.alert('エラー', '返信の投稿に失敗しました');
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <View style={[styles.container, { marginLeft: depth * 20 }]}>
      <View style={styles.commentHeader}>
        <Text style={styles.username}>
          {comment.profiles.display_name || comment.profiles.username}
        </Text>
        <Text style={styles.timestamp}>{formatDate(comment.created_at)}</Text>
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleUpdate}
              disabled={isUpdating}
            >
              <Text style={styles.saveButtonText}>
                {isUpdating ? '更新中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.content}>{comment.content}</Text>
      )}

      <View style={styles.actions}>
        {depth < maxDepth && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowReplyInput(!showReplyInput)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#666" />
            <Text style={styles.actionText}>返信</Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil-outline" size={16} color="#666" />
              <Text style={styles.actionText}>編集</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={16} color="#666" />
              <Text style={styles.actionText}>
                {isDeleting ? '削除中...' : '削除'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {showReplyInput && (
        <View style={styles.replyContainer}>
          <TextInput
            style={styles.replyInput}
            value={replyContent}
            onChangeText={setReplyContent}
            placeholder="返信を入力..."
            multiline
            maxLength={500}
          />
          <View style={styles.replyActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowReplyInput(false);
                setReplyContent('');
              }}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.replyButton]}
              onPress={handleReply}
              disabled={!replyContent.trim() || isReplying}
            >
              <Text style={styles.replyButtonText}>
                {isReplying ? '投稿中...' : '返信'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              userTrackId={userTrackId}
              depth={depth + 1}
              onReply={onReply}
              onUpdate={onUpdate}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginVertical: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  editContainer: {
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  replyContainer: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  repliesContainer: {
    marginTop: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
    paddingLeft: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  replyButton: {
    backgroundColor: '#34C759',
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});