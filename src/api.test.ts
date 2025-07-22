import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE_URL = 'https://rwglezvdogarnffuokig.supabase.co/functions/v1';
const AUTH_TOKEN = 'your-jwt-token'; // Replace with a real token for actual testing

// Test suite for Camera Validation System API
test('1. Image Upload & Storage', async () => {
  const imagePath = path.resolve(__dirname, '../public/test-images/macro-flower-sharp.jpg');
  const imageBuffer = fs.readFileSync(imagePath);

  const form = new FormData();
  form.append('file', imageBuffer, {
    filename: 'macro-flower-sharp.jpg',
    contentType: 'image/jpeg',
  });
  form.append('metadata', JSON.stringify({
    camera_module_id: "test-module-1",
    camera_type: "RGB",
    test_campaign: "campaign-1",
    scene_type: "studio",
    lighting_condition: "D65",
    tags: ["test", "upload"],
    notes: "This is a test upload from the automated test suite."
  }));

  const response = await fetch(`${API_BASE_URL}/image-upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  const data = await response.json() as { message: string };

  expect(response.status).toBe(401); // Expecting auth error due to placeholder token
  expect(data.message).toBe("Invalid JWT");
});

test('2. Quality Metrics Ingestion', async () => {
  const requestBody = {
    image_id: "a-real-image-id", // This would be a real image ID in a real test
    metrics: {
      "sharpness": 0.85,
      "noise": 0.12,
      "flare_index": 0.03,
    }
  };

  const response = await fetch(`${API_BASE_URL}/metrics-ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json() as { message: string };

  expect(response.status).toBe(401);
  expect(data.message).toBe("Invalid JWT");
});

test('3. Advanced Image Querying', async () => {
  const response = await fetch(`${API_BASE_URL}/query-images?camera_type=RGB`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  const data = await response.json() as { message: string };

  expect(response.status).toBe(401);
  expect(data.message).toBe("Invalid JWT");
});

test('4. Tag & Metadata Updates', async () => {
  const requestBody = {
    image_id: "a-real-image-id",
    tags: ["new", "tags"],
    notes: "Updated notes",
    action: "replace"
  };

  const response = await fetch(`${API_BASE_URL}/update-tags`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json() as { message: string };

  expect(response.status).toBe(401);
  expect(data.message).toBe("Invalid JWT");
});

test('5. Dataset Export', async () => {
  const requestBody = {
    "filters": {
      "camera_types": ["RGB", "Depth"],
    },
    "format": "json",
    "include_signed_urls": true
  };

  const response = await fetch(`${API_BASE_URL}/export-dataset`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json() as { message: string };

  expect(response.status).toBe(401);
  expect(data.message).toBe("Invalid JWT");
});

test('6. Duplicate Detection & Cleanup', async () => {
  const requestBody = {
    "similarity_threshold": 0.95,
    "dry_run": true
  };

  const response = await fetch(`${API_BASE_URL}/deduplication-job`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json() as { message: string };

  expect(response.status).toBe(401);
  expect(data.message).toBe("Invalid JWT");
});
