import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useVideoPlayer, VideoView, type VideoPlayerStatus } from 'expo-video';
import { API_URL } from '../../config/constants';
import { COLORS } from '../../config/theme';
import { getUploadThumbnail, uploadDocumentUrl, type UploadItem } from '../../utils/uploadLibrary';

function VideoFrame({ uri }: { uri: string }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer(uri, instance => {
    instance.muted = true;
  });

  useEffect(() => {
    let positioned = false;
    const update = (status: VideoPlayerStatus) => {
      if (status === 'readyToPlay' && !positioned) {
        positioned = true;
        player.currentTime = player.duration > 0 ? Math.min(1, player.duration / 2) : 0.1;
      } else if (status === 'error') {
        setFailed(true);
      }
    };
    const subscription = player.addListener('statusChange', event => update(event.status));
    update(player.status);
    return () => subscription.remove();
  }, [player]);

  return (
    <View style={styles.fill} pointerEvents="none">
      {!failed && (
        <VideoView
          player={player}
          nativeControls={false}
          allowsPictureInPicture={false}
          contentFit="cover"
          surfaceType="textureView"
          onFirstFrameRender={() => setReady(true)}
          style={styles.fill}
        />
      )}
      {!ready && !failed && <ActivityIndicator style={styles.fill} color={COLORS.secondary} />}
    </View>
  );
}

export default function UploadVideoPreview({ video }: { video: UploadItem }) {
  const thumbnail = getUploadThumbnail(video);
  const derivedThumbnail = getUploadThumbnail({ ...video, thumbnail: undefined });
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const source = video.youtube_url || video.cloudinary_url || '';
  const thumbnailUrl = [thumbnail, derivedThumbnail].find(url => url && !failedImages.includes(url));

  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={styles.fallback}>
        <Icon name="film-outline" size={52} color="rgba(245, 130, 32, 0.35)" />
      </View>
      {thumbnailUrl ? (
        <Image
          source={{ uri: uploadDocumentUrl(thumbnailUrl, API_URL) }}
          accessibilityLabel={`Thumbnail for ${video.title}`}
          resizeMode="cover"
          style={styles.fill}
          onError={() => setFailedImages(previous => [...previous, thumbnailUrl])}
        />
      ) : source && !/youtu(?:be|\.be)/i.test(source) ? (
        <VideoFrame key={source} uri={uploadDocumentUrl(source, API_URL)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202020',
  },
});
