import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Card, 
  Title,
  Avatar,
  IconButton,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

interface ProfileFormData {
  displayName: string;
  bio: string;
}

interface ProfileEditScreenProps {
  navigation: any;
}

export default function ProfileEditScreen({ navigation }: ProfileEditScreenProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      displayName: user?.user_metadata?.display_name || '',
      bio: user?.user_metadata?.bio || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: data.displayName,
          bio: data.bio,
        },
      });

      if (error) throw error;

      Alert.alert('更新完了', 'プロフィールが更新されました', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('更新エラー', error.message || 'プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Title style={styles.title}>プロフィール編集</Title>
        <View style={styles.placeholder} />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.avatarSection}>
            <Avatar.Text
              size={100}
              label={user?.user_metadata?.username?.charAt(0)?.toUpperCase() || 'U'}
              style={styles.avatar}
            />
            <Button mode="text" onPress={() => {}}>
              写真を変更
            </Button>
          </View>

          <Text style={styles.label}>ユーザー名</Text>
          <Text style={styles.readOnlyText}>
            {user?.user_metadata?.username || 'ユーザー'}
          </Text>
          <Text style={styles.readOnlyNote}>
            ユーザー名は変更できません
          </Text>

          <Text style={styles.label}>メールアドレス</Text>
          <Text style={styles.readOnlyText}>{user?.email}</Text>
          <Text style={styles.readOnlyNote}>
            メールアドレスは変更できません
          </Text>

          <Controller
            control={control}
            name="displayName"
            rules={{
              maxLength: {
                value: 50,
                message: '表示名は50文字以下で入力してください',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="表示名"
                mode="outlined"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.displayName}
                style={styles.input}
                placeholder="表示名を入力してください"
              />
            )}
          />
          {errors.displayName && (
            <Text style={styles.errorText}>{errors.displayName.message}</Text>
          )}

          <Controller
            control={control}
            name="bio"
            rules={{
              maxLength: {
                value: 200,
                message: '自己紹介は200文字以下で入力してください',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="自己紹介"
                mode="outlined"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.bio}
                multiline
                numberOfLines={4}
                style={styles.input}
                placeholder="自己紹介を入力してください"
              />
            )}
          />
          {errors.bio && (
            <Text style={styles.errorText}>{errors.bio.message}</Text>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            保存
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  card: {
    margin: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  readOnlyNote: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: '#B00020',
    fontSize: 12,
    marginBottom: 16,
  },
  button: {
    marginTop: 24,
  },
});