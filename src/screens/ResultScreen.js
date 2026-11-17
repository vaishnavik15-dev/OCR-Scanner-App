// src/screens/ResultScreen.js
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Alert, ActivityIndicator,
  Platform, StatusBar,
} from 'react-native';
import { saveScanResult } from '../services/api';

function extractSerialNumbers(text) {
  if (!text) return [];
  const pattern = /[A-Z0-9\-]{5,25}/g;
  const matches = text.match(pattern) || [];
  return [...new Set(matches)];
}

export default function ResultScreen({ navigation, route }) {
  const { imageUri, extractedText, imagePath } = route.params;

  const tokens = useMemo(() => extractSerialNumbers(extractedText), [extractedText]);

  const [serialValue, setSerialValue] = useState(tokens[0] || '');
  const [originalSerial, setOriginalSerial] = useState(tokens[0] || '');
  const [modelValue, setModelValue] = useState('None');
  const [editingSerial, setEditingSerial] = useState(false);
  const [editingModel, setEditingModel] = useState(false);
  const [displayText, setDisplayText] = useState(extractedText);
  const [saving, setSaving] = useState(false);

  // Model tokens ALWAYS exclude current serialValue (live update)
  const modelTokens = useMemo(() => {
    return tokens.filter(t => t !== serialValue.trim() && t !== originalSerial.trim());
  }, [tokens, serialValue, originalSerial]);

  // Select serial from radio
  const handleSerialSelect = (token) => {
    setSerialValue(token);
    setOriginalSerial(token);
    setEditingSerial(false);
    if (modelValue === token) {
      setModelValue('None');
    }
  };

  // Select model from radio
  const handleModelSelect = (opt) => {
    setModelValue(opt);
    setEditingModel(false);
  };

  // Confirm serial edit
  const confirmSerialEdit = () => {
    const trimmed = serialValue.trim();
    if (!trimmed) {
      Alert.alert('Invalid', 'Serial number cannot be empty.');
      return;
    }

    // Replace original serial in the displayed extracted text
    const updatedText = displayText.replace(
      new RegExp(originalSerial.replace(/[-]/g, '\\$&'), 'g'),
      trimmed
    );
    setDisplayText(updatedText);

    // Update original to new value
    setOriginalSerial(trimmed);
    setSerialValue(trimmed);

    // Reset model if it matches new serial
    if (modelValue === trimmed) {
      setModelValue('None');
    }

    setEditingSerial(false);
  };

  // Confirm model edit
  const confirmModelEdit = () => {
    const trimmed = modelValue.trim();
    if (trimmed === serialValue.trim()) {
      Alert.alert('Invalid', 'Model number cannot be same as serial number!');
      return;
    }
    setModelValue(trimmed);
    setEditingModel(false);
  };

  // Save
  const handleSave = async () => {
    const serial = serialValue.trim();
    const model = modelValue.trim();

    if (!serial) {
      Alert.alert('Required', 'Please select or enter a serial number.');
      return;
    }
    if (serial === model && model !== 'None') {
      Alert.alert('Invalid', 'Serial number and model number cannot be the same.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveScanResult({
        imagePath: imagePath || imageUri,
        extractedText: displayText,
        serialNumber: serial,
        modelNumber: model,
        source: 'mobile',
      });
      if (result.success) {
        Alert.alert('Saved ✓', `Saved successfully!\nID: ${result.id}`, [
          { text: 'Go to History', onPress: () => navigation.navigate('Main', { screen: 'History' }) },
          { text: 'Scan Again', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Save Failed', result.error || 'Unknown error');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not save.\n' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Result</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Image */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SCANNED IMAGE</Text>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        </View>

        {/* Extracted Text — updates when serial is edited */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EXTRACTED TEXT</Text>
          <View style={styles.textBox}>
            <Text style={styles.extractedText}>{displayText || 'No text detected'}</Text>
          </View>
        </View>

        {/* Serial Number */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECT SERIAL NUMBER</Text>

          {tokens.length === 0 && (
            <Text style={styles.noTokensText}>No tokens detected. Enter manually below.</Text>
          )}

          {tokens.map((token) => (
            <TouchableOpacity
              key={token}
              style={[
                styles.tokenRow,
                originalSerial === token && !editingSerial && styles.tokenRowSelected,
              ]}
              onPress={() => handleSerialSelect(token)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.radio,
                originalSerial === token && !editingSerial && styles.radioSelected,
              ]}>
                {originalSerial === token && !editingSerial && <View style={styles.radioDot} />}
              </View>
              <Text style={[
                styles.tokenText,
                originalSerial === token && !editingSerial && styles.tokenTextSelected,
              ]}>
                {token}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Edit serial */}
          <View style={styles.editRow}>
            <Text style={styles.editLabel}>
              {editingSerial ? '✏️ Editing — tap ✓ to confirm:' : 'Edit Serial Number:'}
            </Text>
            <View style={styles.editInputRow}>
              <TextInput
                style={[styles.editInput, editingSerial && styles.editInputActive]}
                value={serialValue}
                onChangeText={(text) => {
                  const upper = text.toUpperCase();
                  setSerialValue(upper);
                  setEditingSerial(true);
                  if (modelValue === upper) {
                    setModelValue('None');
                  }
                }}
                placeholder="Edit serial number"
                placeholderTextColor="#333"
                autoCapitalize="characters"
              />
              {editingSerial && (
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmSerialEdit}>
                  <Text style={styles.confirmBtnText}>✓</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingSerial && (
              <Text style={styles.editHint}>
                ⚠️ Tapping ✓ will also update the extracted text above
              </Text>
            )}
          </View>
        </View>

        {/* Model Number */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECT MODEL NUMBER</Text>
          <Text style={styles.modelHint}>ℹ️ Selected serial number is excluded</Text>

          {/* None always first */}
          <TouchableOpacity
            style={[
              styles.tokenRow,
              modelValue === 'None' && !editingModel && styles.tokenRowSelected,
            ]}
            onPress={() => handleModelSelect('None')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.radio,
              modelValue === 'None' && !editingModel && styles.radioSelected,
            ]}>
              {modelValue === 'None' && !editingModel && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.tokenText, styles.tokenTextNone]}>None</Text>
          </TouchableOpacity>

          {/* Model tokens — serial excluded */}
          {modelTokens.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.tokenRow,
                modelValue === opt && !editingModel && styles.tokenRowSelected,
              ]}
              onPress={() => handleModelSelect(opt)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.radio,
                modelValue === opt && !editingModel && styles.radioSelected,
              ]}>
                {modelValue === opt && !editingModel && <View style={styles.radioDot} />}
              </View>
              <Text style={[
                styles.tokenText,
                modelValue === opt && !editingModel && styles.tokenTextSelected,
              ]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Edit model */}
          <View style={styles.editRow}>
            <Text style={styles.editLabel}>
              {editingModel ? '✏️ Editing — tap ✓ to confirm:' : 'Edit Model Number:'}
            </Text>
            <View style={styles.editInputRow}>
              <TextInput
                style={[styles.editInput, editingModel && styles.editInputActive]}
                value={modelValue}
                onChangeText={(text) => {
                  setModelValue(text.toUpperCase());
                  setEditingModel(true);
                }}
                placeholder="Edit model number"
                placeholderTextColor="#333"
                autoCapitalize="characters"
              />
              {editingModel && (
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmModelEdit}>
                  <Text style={styles.confirmBtnText}>✓</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>SAVE SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Serial Number</Text>
            <Text style={styles.summaryValue}>{serialValue || '—'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Model Number</Text>
            <Text style={styles.summaryValue}>{modelValue}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Source</Text>
            <Text style={styles.sourceValue}>📱 Mobile</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <View style={styles.saveBtnInner}>
              <ActivityIndicator color="#0D0D0D" size="small" />
              <Text style={styles.saveBtnText}>  Saving...</Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>💾 Save to Database</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  backBtnText: { color: '#00E5FF', fontSize: 14, fontWeight: '700' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 24 },
  sectionLabel: {
    color: '#444', fontSize: 10, fontWeight: '800',
    letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase',
  },
  image: {
    width: '100%', height: 200, borderRadius: 12,
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
  },
  textBox: {
    backgroundColor: '#111', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  extractedText: { color: '#AAA', fontSize: 13, lineHeight: 20 },
  noTokensText: { color: '#555', fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  modelHint: { color: '#333', fontSize: 11, marginBottom: 8, fontStyle: 'italic' },
  tokenRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111', borderRadius: 10, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#1E1E1E',
  },
  tokenRowSelected: { borderColor: '#00E5FF', backgroundColor: '#001A1F' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: '#00E5FF' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00E5FF' },
  tokenText: { color: '#666', fontSize: 14, fontWeight: '600', flex: 1 },
  tokenTextSelected: { color: '#00E5FF' },
  tokenTextNone: { color: '#444', fontStyle: 'italic' },
  editRow: { marginTop: 10 },
  editLabel: { color: '#444', fontSize: 11, marginBottom: 6, fontWeight: '600', letterSpacing: 0.5 },
  editHint: { color: '#00E5FF', fontSize: 10, marginTop: 6, fontStyle: 'italic' },
  editInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: {
    flex: 1, backgroundColor: '#111', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#222', color: '#FFF', fontSize: 14,
  },
  editInputActive: { borderColor: '#00E5FF' },
  confirmBtn: {
    width: 40, height: 44, borderRadius: 10,
    backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center',
  },
  confirmBtnText: { color: '#0D0D0D', fontSize: 18, fontWeight: '900' },
  summary: {
    backgroundColor: '#111', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1E1E1E', marginBottom: 20,
  },
  summaryTitle: {
    color: '#333', fontSize: 9, fontWeight: '900',
    letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 4,
  },
  summaryDivider: { height: 1, backgroundColor: '#1E1E1E', marginVertical: 8 },
  summaryKey: { color: '#555', fontSize: 12, fontWeight: '600' },
  summaryValue: {
    color: '#00E5FF', fontSize: 14, fontWeight: '800',
    maxWidth: '60%', textAlign: 'right',
  },
  sourceValue: { color: '#00FF88', fontSize: 13, fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#00E5FF', height: 56, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#1A1A1A' },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center' },
  saveBtnText: { color: '#0D0D0D', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});