import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

const WeekSyncModalScreen = ({ onAction }) => {
  // Navigation handler
  const handleAction = () => {
    // Call the parent handler to update status and route back to LogsHub (Screen 2)
    if (onAction) {
      onAction();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* High-end Card View */}
      <View style={styles.card}>
        
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>✅</Text>
        </View>

        {/* Status Confirmation Text */}
        <View style={styles.textContainer}>
          <Text style={styles.headerText}>Week Log Complete & Verified!</Text>
          <Text style={styles.subText}>
            Data has been securely locked to preserve university validation metrics.
          </Text>
        </View>

        {/* Action Menu Block */}
        <View style={styles.actionBlock}>
          
          {/* Button A: Primary Black */}
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handleAction}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>📥 Export & Print This Week Now (PDF)</Text>
          </TouchableOpacity>

          {/* Button B: Secondary Bordered Outlined */}
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={handleAction}
            activeOpacity={0.6}
          >
            <Text style={styles.secondaryButtonText}>💾 Save to Cloud Space & Continue Logbook</Text>
          </TouchableOpacity>

        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dimmed overlay background
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9', // Light green background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 12,
  },
  subText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  actionBlock: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#111111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  secondaryButtonText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default WeekSyncModalScreen;
