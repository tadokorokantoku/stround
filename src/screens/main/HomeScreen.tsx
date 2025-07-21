import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Appbar, SegmentedButtons } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import useTimeline from '../../hooks/useTimeline';
import TimelineList from '../../components/timeline/TimelineList';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [timelineType, setTimelineType] = React.useState('personal');
  
  const personalTimeline = useTimeline();
  const publicTimeline = useTimeline({ isPublic: true });

  const currentTimeline = timelineType === 'personal' ? personalTimeline : publicTimeline;

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="タイムライン" />
      </Appbar.Header>
      
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={timelineType}
          onValueChange={setTimelineType}
          style={styles.segment}
          buttons={[
            { value: 'personal', label: 'フォロー中' },
            { value: 'public', label: 'みんな' },
          ]}
        />
      </View>

      <TimelineList
        posts={currentTimeline.posts}
        loading={currentTimeline.loading}
        refreshing={currentTimeline.refreshing}
        hasMore={currentTimeline.hasMore}
        currentUserId={user?.id}
        onRefresh={currentTimeline.refresh}
        onLoadMore={currentTimeline.loadMore}
        onPostUpdate={currentTimeline.invalidateTimeline}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  segment: {
    backgroundColor: '#f5f5f5',
  },
});