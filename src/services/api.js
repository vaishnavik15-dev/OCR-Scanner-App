// src/services/api.js

const API_BASE_URL = 'http://192.168.34.13:8000'; //System IP  

import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// ─── SCAN IMAGE ────────────────────────────────────
export const scanImage = async (imageUri) => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'scan.jpg',
  });

  const response = await api.post('/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data; // { text: "...", error?: "..." }
};

// ─── SAVE SCAN RESULT ──────────────────────────────
export const saveScanResult = async (payload) => {
  // payload: { imagePath, extractedText, serialNumber, modelNumber }
  const response = await api.post('/save', payload);
  return response.data;
};

// ─── GET HISTORY ───────────────────────────────────
export const getScanHistory = async () => {
  const response = await api.get('/history');
  return response.data; // Array of scan results
};

// ─── DELETE SCAN ───────────────────────────────────
export const deleteScan = async (id) => {
  const response = await api.delete(`/history/${id}`);
  return response.data;
};
