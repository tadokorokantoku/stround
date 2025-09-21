import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Appbar, SegmentedButtons } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import useTimeline from '../../hooks/useTimeline';
import { useNewReleases } from '../../hooks/useOptimizedApi';
import TimelineList from '../../components/timeline/TimelineList';
import NewReleasesList from '../../components/music/NewReleasesList';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [timelineType, setTimelineType] = React.useState('new-releases');

  const personalTimeline = useTimeline();
  const publicTimeline = useTimeline({ isPublic: true });
  const { data: newReleases, isLoading: newReleasesLoading, refetch: refetchNewReleases } = useNewReleases();

  const getCurrentContent = () => {
    switch (timelineType) {
      case 'personal':
        return (
          <TimelineList
            posts={personalTimeline.posts}
            loading={personalTimeline.loading}
            refreshing={personalTimeline.refreshing}
            hasMore={personalTimeline.hasMore}
            currentUserId={user?.id}
            onRefresh={personalTimeline.refresh}
            onLoadMore={personalTimeline.loadMore}
            onPostUpdate={personalTimeline.invalidateTimeline}
          />
        );
      case 'public':
        return (
          <TimelineList
            posts={publicTimeline.posts}
            loading={publicTimeline.loading}
            refreshing={publicTimeline.refreshing}
            hasMore={publicTimeline.hasMore}
            currentUserId={user?.id}
            onRefresh={publicTimeline.refresh}
            onLoadMore={publicTimeline.loadMore}
            onPostUpdate={publicTimeline.invalidateTimeline}
          />
        );
      case 'new-releases':
        return (
          <NewReleasesList
            tracks={newReleases?.tracks || []}
            loading={newReleasesLoading}
            onRefresh={refetchNewReleases}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="ホーム" />
      </Appbar.Header>

      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={timelineType}
          onValueChange={setTimelineType}
          style={styles.segment}
          buttons={[
            { value: 'new-releases', label: '新着楽曲' },
            { value: 'personal', label: 'フォロー中' },
            { value: 'public', label: 'みんな' },
          ]}
        />
      </View>

      {getCurrentContent()}
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