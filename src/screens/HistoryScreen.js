// src/screens/HistoryScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, ActivityIndicator, RefreshControl,
  Platform, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getScanHistory, deleteScan } from '../services/api';

// ───  PC'S IP FOR REAL DEVICE ─────────────────
const SERVER_URL = 'http://192.168.34.13:8000';

export default function HistoryScreen() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getScanHistory();
      if (Array.isArray(data)) setScans(data);
    } catch (err) {
      Alert.alert('Error', 'Could not load scan history.\n' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const handleDelete = (id) => {
    Alert.alert('Delete Scan', 'Remove this record from the database?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteScan(id);
            setScans(prev => prev.filter(s => s.Id !== id));
          } catch (err) {
            Alert.alert('Error', 'Could not delete scan.');
          }
        },
      },
    ]);
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // Build correct image URL from server path
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    // If already a full URL return as is
    if (imagePath.startsWith('http')) return imagePath;
    // Convert server path like "uploads/image.jpg" to full URL
    const filename = imagePath.replace(/\\/g, '/').split('/').pop();
    return `${SERVER_URL}/uploads/${filename}`;
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
      </View>

      {/* Image */}
      {item.ImagePath ? (
        <Image
          source={{ uri: getImageUrl(item.ImagePath) }}
          style={styles.thumb}
          resizeMode="cover"
          defaultSource={{ uri: 'https://via.placeholder.com/70' }}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={{ fontSize: 24 }}>🖼️</Text>
        </View>
      )}

      {/* Details */}
      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>SERIAL</Text>
          <Text style={styles.serialValue} numberOfLines={1}>{item.SerialNumber || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>MODEL</Text>
          <Text style={styles.modelValue} numberOfLines={1}>{item.ModelNumber || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>SOURCE</Text>
          <Text style={[
            styles.sourceValue,
            item.Source === 'mobile' ? styles.sourceMobile : styles.sourceWeb
          ]}>
            {item.Source === 'mobile' ? '📱 Mobile' : '🖥️ Web'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>DATE</Text>
          <Text style={styles.dateValue}>{formatDate(item.CreatedAt)}</Text>
        </View>
        {item.ExtractedText ? (
          <Text style={styles.textPreview} numberOfLines={2}>{item.ExtractedText}</Text>
        ) : null}
      </View>

      {/* Delete button */}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.Id)}>
        <Text style={styles.deleteBtnText}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No Scans Yet</Text>
      <Text style={styles.emptySub}>Scan an image and save it to see history here.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Scan History</Text>
          <Text style={styles.headerSub}>{scans.length} record{scans.length !== 1 ? 's' : ''} in database</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadHistory()}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00E5FF" size="large" />
          <Text style={styles.loadingText}>Loading from database...</Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => String(item.Id)}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadHistory(true); }}
              tintColor="#00E5FF"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: '#444', fontSize: 12, marginTop: 2 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    justifyContent: 'center', alignItems: 'center',
  },
  refreshBtnText: { color: '#00E5FF', fontSize: 20 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#111', borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#1A1A1A',
    gap: 12,
  },
  indexBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center',
    position: 'absolute', top: 10, left: 10, zIndex: 1,
  },
  indexText: { color: '#333', fontSize: 10, fontWeight: '900' },
  thumb: {
    width: 70, height: 70, borderRadius: 10,
    backgroundColor: '#1A1A1A', marginTop: 6,
  },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { color: '#333', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, width: 44 },
  serialValue: { color: '#00E5FF', fontSize: 14, fontWeight: '800', flex: 1 },
  modelValue: { color: '#AAA', fontSize: 13, fontWeight: '600', flex: 1 },
  sourceWeb: { color: '#888' },
  sourceMobile: { color: '#00FF88' },
  sourceValue: { fontSize: 11, fontWeight: '700', flex: 1 },
  dateValue: { color: '#555', fontSize: 11, flex: 1 },
  textPreview: {
    color: '#333', fontSize: 11, lineHeight: 16,
    marginTop: 4, fontStyle: 'italic',
  },
  deleteBtn: { padding: 6, borderRadius: 8, backgroundColor: '#1A1A1A' },
  deleteBtnText: { fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#444', fontSize: 13 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100, gap: 10 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: '#555', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#333', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});