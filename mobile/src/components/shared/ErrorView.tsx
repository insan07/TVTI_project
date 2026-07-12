import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorView({ message = 'Something went wrong.', onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Icon name="alert-circle-outline" size={48} color="#EF4444" />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
  },
  message: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
