import React, { useState, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface CommentInputProps {
  userTrackId: string;
  onCommentPosted: () => void;
  placeholder?: string;
  parentCommentId?: string; // 返信の場合に設定
}

export interface CommentInputRef {
  focus: () => void;
  clear: () => void;
}

export const CommentInput = forwardRef<CommentInputRef, CommentInputProps>(({
  userTrackId,
  onCommentPosted,
  placeholder = 'コメントを入力...',
  parentCommentId,
}, ref) => {
  const { user } = useAuthStore();
  const [comment, setComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const inputRef = React.useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      setComment('');
    },
  }));

  const handlePost = async () => {
    if (!comment.trim()) {
      Alert.alert('エラー', 'コメントを入力してください');
      return;
    }

    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    setIsPosting(true);
    try {
      if (parentCommentId) {
        await apiService.createReply(userTrackId, comment.trim(), parentCommentId);
      } else {
        await apiService.createComment(userTrackId, comment.trim());
      }

      setComment('');
      Keyboard.dismiss();
      onCommentPosted();
    } catch (error) {
      console.error('Comment posting failed:', error);
      Alert.alert('エラー', 'コメントの投稿に失敗しました');
    } finally {
      setIsPosting(false);
    }
  };

  const isValid = comment.trim().length > 0 && comment.trim().length <= 500;
  const isReply = !!parentCommentId;

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          textAlignVertical="top"
          returnKeyType="default"
          blurOnSubmit={false}
        />
        <View style={styles.actions}>
          <Text style={[
            styles.charCount,
            comment.length > 400 && styles.charCountWarning,
            comment.length > 480 && styles.charCountDanger,
          ]}>
            {comment.length}/500
          </Text>
          <TouchableOpacity
            style={[
              styles.postButton,
              !isValid && styles.postButtonDisabled,
            ]}
            onPress={handlePost}
            disabled={!isValid || isPosting}
          >
            {isPosting ? (
              <Ionicons name="ellipsis-horizontal" size={16} color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
            <Text style={styles.postButtonText}>
              {isPosting ? '投稿中...' : isReply ? '返信' : '投稿'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

CommentInput.displayName = 'CommentInput';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 12,
  },
  replyContainer: {
    backgroundColor: '#f8f9fa',
    marginTop: 8,
    borderRadius: 8,
    borderTopWidth: 0,
  },
  inputContainer: {
    flexDirection: 'column',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
  },
  charCountWarning: {
    color: '#ff9500',
  },
  charCountDanger: {
    color: '#ff3b30',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});