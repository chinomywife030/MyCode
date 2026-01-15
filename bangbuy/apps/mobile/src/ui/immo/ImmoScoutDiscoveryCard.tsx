import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { CountryChip } from '@/src/components/CountryChip';
import { immoColors, immoSpacing, immoRadius, immoTypography, immoShadows } from './theme';
import { ImmoDiscoveryDisplayModel } from './immoAdapters';

interface ImmoScoutDiscoveryCardProps {
  display: ImmoDiscoveryDisplayModel;
  onPress: () => void;
  onInterestPress?: () => void;
  showInterestButton?: boolean;
  currentUserId?: string;
}

export function ImmoScoutDiscoveryCard({
  display,
  onPress,
  onInterestPress,
  showInterestButton = true,
  currentUserId,
}: ImmoScoutDiscoveryCardProps) {
  const imageList = display.images && display.images.length > 0 
    ? display.images 
    : display.image 
      ? [display.image] 
      : [];
  
  const coverImage = imageList[0] || null;
  const isOwnDiscovery = currentUserId && display.authorId && currentUserId === display.authorId;
  const locationText = [display.city, display.country].filter(Boolean).join(', ') || display.country || '';

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {coverImage ? (
          <ExpoImage source={{ uri: coverImage }} style={styles.image} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.imagePlaceholder}><Text style={styles.placeholderText}>無圖片</Text></View>
        )}
        {display.country && (
          <View style={styles.countryBadge}><CountryChip countryCode={display.country} size="sm" /></View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0, 0, 0, 0.7)']} style={styles.gradientOverlay}>
          <View style={styles.overlayContent}>
            <Text style={styles.overlayTitle} numberOfLines={2}>{display.title}</Text>
            <View style={styles.overlayTag}>
              <Text style={styles.overlayTagText}>{display.country ? `旅途發現 · ${display.country}` : '旅途發現'}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.content}>
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}><Text style={styles.authorInitial}>{display.authorInitial}</Text></View>
          <Text style={styles.authorName}>{display.authorName}</Text>
        </View>
        {locationText && <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>}
        {showInterestButton && (
          <TouchableOpacity
            style={[styles.messageButton, isOwnDiscovery && styles.messageButtonDisabled]}
            onPress={isOwnDiscovery ? undefined : (onInterestPress || onPress)}
            disabled={isOwnDiscovery}
            activeOpacity={0.8}
          >
            <Text style={styles.messageButtonText}>{isOwnDiscovery ? '這是你發布的' : '私訊'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: immoColors.white, borderRadius: immoRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: immoColors.borderLight, ...immoShadows.card },
  imageContainer: { width: '100%', aspectRatio: 4 / 3, position: 'relative', backgroundColor: immoColors.background },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: immoColors.background, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: immoTypography.fontSize.sm, color: immoColors.textMuted },
  countryBadge: { position: 'absolute', top: immoSpacing.sm, left: immoSpacing.sm, zIndex: 10 },
  gradientOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', justifyContent: 'flex-end', paddingHorizontal: immoSpacing.md, paddingBottom: immoSpacing.md },
  overlayContent: { gap: immoSpacing.xs },
  overlayTitle: { color: immoColors.white, fontSize: immoTypography.fontSize.base, fontWeight: immoTypography.fontWeight.bold, lineHeight: 22, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  overlayTag: { alignSelf: 'flex-start', paddingHorizontal: immoSpacing.sm, paddingVertical: immoSpacing.xs / 2, borderRadius: immoRadius.sm, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  overlayTagText: { color: immoColors.white, fontSize: immoTypography.fontSize.xs, fontWeight: immoTypography.fontWeight.medium },
  content: { padding: immoSpacing.md, backgroundColor: immoColors.white },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: immoSpacing.xs, marginBottom: immoSpacing.xs },
  authorAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: immoColors.tripPrimary, alignItems: 'center', justifyContent: 'center' },
  authorInitial: { fontSize: immoTypography.fontSize.xs, fontWeight: immoTypography.fontWeight.semibold, color: immoColors.white },
  authorName: { fontSize: immoTypography.fontSize.sm, color: immoColors.textMuted, flex: 1 },
  locationText: { fontSize: immoTypography.fontSize.sm, color: immoColors.textSecondary, marginBottom: immoSpacing.sm },
  messageButton: { backgroundColor: immoColors.tripPrimary, borderRadius: immoRadius.md, paddingVertical: immoSpacing.md, paddingHorizontal: immoSpacing.md, alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: immoSpacing.xs },
  messageButtonDisabled: { backgroundColor: immoColors.borderLight, opacity: 0.6 },
  messageButtonText: { fontSize: immoTypography.fontSize.base, fontWeight: immoTypography.fontWeight.semibold, color: immoColors.white },
});

export default ImmoScoutDiscoveryCard;
