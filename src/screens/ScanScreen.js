// src/screens/ScanScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, ScrollView, StatusBar,
  Dimensions, Platform,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { scanImage } from '../services/api';

const { width } = Dimensions.get('window');

export default function ScanScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [scanning, setScanning] = useState(false);

  
  const pickFromGallery = () => {
  launchImageLibrary(
    {
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 1,
      includeBase64: false,
    },
    (response) => {
      if (response.didCancel) {
        console.log('User cancelled');
        return;
      }
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Unknown error');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setImageUri(uri);
      }
    },
  );
};

  // ─── Take Photo ──────────────────────────────────────────
  const takePhoto = () => {
    launchCamera(
      { mediaType: 'photo', quality: 1, saveToPhotos: false },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const uri = response.assets[0].uri;
        setImageUri(uri);
      },
    );
  };

  // ─── Scan Image via FastAPI ───────────────────────────────
  const handleScan = async () => {
    if (!imageUri) {
      Alert.alert('No Image', 'Please select or capture an image first.');
      return;
    }
    setScanning(true);
    try {
      const result = await scanImage(imageUri);
      if (result.error) {
        Alert.alert('Scan Failed', result.error);
      } else {
        navigation.navigate('Result', {
          imageUri,
          extractedText: result.text || '',
          imagePath: result.imagePath || '',
        });
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not reach the OCR server.\n\nMake sure main.py is running and your IP is correct in api.js');
    } finally {
      setScanning(false);
    }
  };

  // ─── Clear ────────────────────────────────────────────────
  const clearImage = () => setImageUri(null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>OCR</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>Serial Scanner</Text>
          <Text style={styles.headerSub}>Industrial OCR · FastAPI</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Image Preview ─────────────────────────────────── */}
        <View style={styles.previewContainer}>
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
              <TouchableOpacity style={styles.clearBtn} onPress={clearImage}>
                <Text style={styles.clearBtnText}>✕ Clear</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>No image selected</Text>
              <Text style={styles.placeholderSub}>Use the buttons below to add an image</Text>
            </View>
          )}
        </View>

        {/* ── Action Buttons ────────────────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.cameraBtn]} onPress={takePhoto}>
            <Text style={styles.actionBtnIcon}>📸</Text>
            <Text style={styles.actionBtnLabel}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.galleryBtn]} onPress={pickFromGallery}>
            <Text style={styles.actionBtnIcon}>🖼️</Text>
            <Text style={styles.actionBtnLabel}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* ── Scan Button ───────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.scanBtn, (!imageUri || scanning) && styles.scanBtnDisabled]}
          onPress={handleScan}
          disabled={!imageUri || scanning}
          activeOpacity={0.85}
        >
          {scanning ? (
            <View style={styles.scanBtnInner}>
              <ActivityIndicator color="#0D0D0D" size="small" />
              <Text style={styles.scanBtnText}>  Scanning...</Text>
            </View>
          ) : (
            <Text style={styles.scanBtnText}>⚡ Scan for Serial Numbers</Text>
          )}
        </TouchableOpacity>

        {/* ── Info Card ─────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoStep}><Text style={styles.infoNum}>01</Text><Text style={styles.infoText}>Take a photo or pick from gallery</Text></View>
          <View style={styles.infoStep}><Text style={styles.infoNum}>02</Text><Text style={styles.infoText}>Tap Scan — image sent to your FastAPI OCR server</Text></View>
          <View style={styles.infoStep}><Text style={styles.infoNum}>03</Text><Text style={styles.infoText}>Select the correct serial & model number</Text></View>
          <View style={styles.infoStep}><Text style={styles.infoNum}>04</Text><Text style={styles.infoText}>Save to the shared MySQL database</Text></View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  headerBadge: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center',
  },
  headerBadgeText: { color: '#0D0D0D', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: '#555', fontSize: 11, marginTop: 1, letterSpacing: 0.5 },

  // Body
  body: { padding: 20, paddingBottom: 40 },

  // Preview
  previewContainer: {
    width: '100%', height: 260, borderRadius: 16,
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    overflow: 'hidden', marginBottom: 16, justifyContent: 'center', alignItems: 'center',
  },
  preview: { width: '100%', height: '100%' },
  clearBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#333',
  },
  clearBtnText: { color: '#FF4444', fontSize: 12, fontWeight: '700' },
  placeholder: { alignItems: 'center', gap: 8 },
  placeholderIcon: { fontSize: 48 },
  placeholderText: { color: '#666', fontSize: 16, fontWeight: '600' },
  placeholderSub: { color: '#333', fontSize: 12, textAlign: 'center' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1, height: 64, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', gap: 4,
    borderWidth: 1,
  },
  cameraBtn: { backgroundColor: '#141414', borderColor: '#00E5FF' },
  galleryBtn: { backgroundColor: '#141414', borderColor: '#333' },
  actionBtnIcon: { fontSize: 22 },
  actionBtnLabel: { color: '#CCC', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Scan button
  scanBtn: {
    backgroundColor: '#00E5FF', height: 56, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  scanBtnDisabled: { backgroundColor: '#1A1A1A' },
  scanBtnInner: { flexDirection: 'row', alignItems: 'center' },
  scanBtnText: { color: '#0D0D0D', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },

  // Info card
  infoCard: {
    backgroundColor: '#111', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  infoTitle: { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' },
  infoStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  infoNum: { color: '#00E5FF', fontSize: 11, fontWeight: '900', width: 20, letterSpacing: 1 },
  infoText: { color: '#666', fontSize: 13, flex: 1, lineHeight: 18 },
});
