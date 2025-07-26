import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Card, 
  Title,
  Paragraph,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../stores/authStore';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((state) => state.signIn);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      await signIn(data.email, data.password);
      // Navigation will be handled by auth state change
    } catch (error: any) {
      Alert.alert('ログインエラー', error.message || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Stround</Title>
          <Paragraph style={styles.subtitle}>音楽で繋がるSNS</Paragraph>

          <Controller
            control={control}
            name="email"
            rules={{
              required: 'メールアドレスを入力してください',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: '有効なメールアドレスを入力してください',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="メールアドレス"
                mode="outlined"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            )}
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email.message}</Text>
          )}

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'パスワードを入力してください',
              minLength: {
                value: 6,
                message: 'パスワードは6文字以上で入力してください',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="パスワード"
                mode="outlined"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.password}
                secureTextEntry
                style={styles.input}
              />
            )}
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            ログイン
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            style={styles.textButton}
          >
            アカウントをお持ちでない方はこちら
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
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
    marginTop: 16,
    marginBottom: 8,
  },
  textButton: {
    marginTop: 8,
  },
});