
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  responseData?: any;
}

class APITester {
  private results: TestResult[] = [];
  private authToken: string | null = null;
  private testUserId: string | null = null;

  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting API Tests...');
    
    // Step 1: Test Authentication
    await this.testAuthentication();
    
    // Step 2: Test Image Upload
    await this.testImageUpload();
    
    // Step 3: Test Metrics Ingestion
    await this.testMetricsIngestion();
    
    // Step 4: Test Image Querying
    await this.testImageQuerying();
    
    // Step 5: Test Tag Updates
    await this.testTagUpdates();
    
    // Step 6: Test Dataset Export
    await this.testDatasetExport();
    
    // Step 7: Test Deduplication
    await this.testDeduplication();
    
    this.printResults();
    return this.results;
  }

  private async testAuthentication() {
    try {
      console.log('🔐 Testing Authentication...');
      
      // Try to get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        this.authToken = session.access_token;
        this.testUserId = session.user.id;
        this.addResult('Authentication', 'GET', 'PASS', 'Successfully retrieved auth token from existing session');
      } else {
        // Try to sign up a test user
        const testEmail = 'ridwanabdsalam@gmail.com';
        const testPassword = 'testpassword123';
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
        });
        
        if (signUpError) {
          // If signup fails because user exists, try to sign in instead
          if (signUpError.message.includes('User already registered') || signUpError.message.includes('already exists')) {
            console.log('User already exists, attempting to sign in...');
            
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: testEmail,
              password: testPassword,
            });
            
            if (signInError) {
              this.addResult('Authentication', 'POST', 'FAIL', `Sign in failed: ${signInError.message}`);
              return;
            }
            
            if (signInData.session?.access_token) {
              this.authToken = signInData.session.access_token;
              this.testUserId = signInData.session.user.id;
              this.addResult('Authentication', 'POST', 'PASS', 'Successfully signed in existing user and got auth token');
            } else {
              this.addResult('Authentication', 'POST', 'FAIL', 'Sign in succeeded but no session token received');
            }
          } else {
            this.addResult('Authentication', 'POST', 'FAIL', `Sign up failed: ${signUpError.message}`);
          }
          return;
        }
        
        if (data.session?.access_token) {
          this.authToken = data.session.access_token;
          this.testUserId = data.session.user.id;
          this.addResult('Authentication', 'POST', 'PASS', 'Successfully created test user and got auth token');
        } else {
          this.addResult('Authentication', 'POST', 'SKIP', 'User created but needs email confirmation');
        }
      }
    } catch (error) {
      this.addResult('Authentication', 'POST', 'FAIL', `Auth error: ${error}`);
    }
  }

  private async testImageUpload() {

    try {
      console.log('📸 Testing Image Upload...');
      
      // Create a simple test image blob
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(0, 0, 100, 100);
      }
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          this.addResult('Image Upload', 'POST', 'FAIL', 'Failed to create test image blob');
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, 'test-image.png');
        formData.append('metadata', JSON.stringify({
          camera_module_id: "test-api-module",
          camera_type: "RGB",
          test_campaign: "api-test-campaign",
          scene_type: "studio",
          lighting_condition: "D65",
          tags: ["api-test", "automated"],
          notes: "Automated API test upload"
        }));

        try {
          const response = await fetch('https://rwglezvdogarnffuokig.supabase.co/functions/v1/image-upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.authToken}`,
            },
            body: formData,
          });

          const data = await response.json();
          
          if (response.ok && data.success) {
            this.addResult('Image Upload', 'POST', 'PASS', 'Successfully uploaded test image', data);
          } else {
            this.addResult('Image Upload', 'POST', 'FAIL', `Upload failed: ${data.error || 'Unknown error'}`);
          }
        } catch (error) {
          this.addResult('Image Upload', 'POST', 'FAIL', `Network error: ${error}`);
        }
      }, 'image/png');
    } catch (error) {
      this.addResult('Image Upload', 'POST', 'FAIL', `Test setup error: ${error}`);
    }
  }

  private async testMetricsIngestion() {

    try {
      console.log('📊 Testing Metrics Ingestion...');
      
      // First, get an existing image ID from our database
      const { data: images, error: queryError } = await supabase
        .from('images')
        .select('id')
        .limit(1);

      if (queryError || !images || images.length === 0) {
        this.addResult('Metrics Ingestion', 'POST', 'SKIP', 'No test images available for metrics ingestion');
        return;
      }

      const testImageId = images[0].id;
      const metricsData = {
        image_id: testImageId,
        metrics: {
          sharpness: 0.85,
          noise: 0.12,
          flare_index: 0.03,
          chromatic_aberration: 0.08,
          white_balance_error: 0.05,
          exposure_level: 0.65,
          focus_score: 0.92,
          motion_blur_score: 0.15,
          dynamic_range: 0.78,
          contrast_ratio: 0.82,
          edge_acutance: 0.75,
          saturation_deviation: 0.10,
          eye_tracking_accuracy: 0.88,
          depth_map_quality: 0.79,
          passthrough_alignment_error: 0.06
        }
      };

      const response = await fetch('https://rwglezvdogarnffuokig.supabase.co/functions/v1/metrics-ingest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metricsData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        this.addResult('Metrics Ingestion', 'POST', 'PASS', 'Successfully ingested metrics data', data);
      } else {
        this.addResult('Metrics Ingestion', 'POST', 'FAIL', `Metrics ingestion failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Metrics Ingestion', 'POST', 'FAIL', `Error: ${error}`);
    }
  }

  private async testImageQuerying() {

    try {
      console.log('🔍 Testing Image Querying...');
      
      // Test basic query
      const response = await fetch('https://rwglezvdogarnffuokig.supabase.co/functions/v1/query-images?camera_type=RGB&limit=5', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      const data = await response.json();
      
      if (response.ok && data.images) {
        this.addResult('Image Querying', 'GET', 'PASS', `Successfully queried images. Found ${data.images.length} images.`, {
          count: data.images.length,
          hasMetrics: data.images.some((img: any) => img.image_metrics)
        });
      } else {
        this.addResult('Image Querying', 'GET', 'FAIL', `Query failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Image Querying', 'GET', 'FAIL', `Error: ${error}`);
    }
  }

  private async testTagUpdates() {

    try {
      console.log('🏷️ Testing Tag Updates...');
      
      // Get an existing image ID
      const { data: images, error: queryError } = await supabase
        .from('images')
        .select('id')
        .limit(1);

      if (queryError || !images || images.length === 0) {
        this.addResult('Tag Updates', 'POST', 'SKIP', 'No test images available for tag updates');
        return;
      }

      const testImageId = images[0].id;
      const updateData = {
        image_id: testImageId,
        tags: ["api-test", "updated", "automated"],
        notes: "Updated via API test",
        action: "replace"
      };

      const response = await fetch('https://rwglezvdogarnffuokig.supabase.co/functions/v1/update-tags', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        this.addResult('Tag Updates', 'POST', 'PASS', 'Successfully updated tags and notes', data);
      } else {
        this.addResult('Tag Updates', 'POST', 'FAIL', `Tag update failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Tag Updates', 'POST', 'FAIL', `Error: ${error}`);
    }
  }

  private async testDatasetExport() {

    try {
      console.log('📦 Testing Dataset Export...');
      
      const exportData = {
        filters: {
          camera_types: ["RGB", "Depth"],
        },
        format: "json",
        include_signed_urls: true
      };

      const response = await fetch('https://rwglezvdogarnffuokig.supabase.co/functions/v1/export-dataset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      const data = await response.json();
      
      if (response.ok && data.export_id) {
        this.addResult('Dataset Export', 'POST', 'PASS', 'Successfully initiated dataset export', {
          export_id: data.export_id,
          total_images: data.total_images
        });
      } else {
        this.addResult('Dataset Export', 'POST', 'FAIL', `Export failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Dataset Export', 'POST', 'FAIL', `Error: ${error}`);
    }
  }

  private async testDeduplication() {

    try {
      console.log('🔄 Testing Deduplication...');
      
      const dedupData = {
        similarity_threshold: 0.95,
        dry_run: true
      };

      const response = await fetch('https://rwglezvdogarnffuokig.supabase.co/functions/v1/deduplication-job', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dedupData),
      });

      const data = await response.json();
      
      if (response.ok && data.job_id) {
        this.addResult('Deduplication', 'POST', 'PASS', 'Successfully initiated deduplication job', {
          job_id: data.job_id,
          potential_duplicates: data.potential_duplicates
        });
      } else {
        this.addResult('Deduplication', 'POST', 'FAIL', `Deduplication failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Deduplication', 'POST', 'FAIL', `Error: ${error}`);
    }
  }

  private addResult(endpoint: string, method: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, responseData?: any) {
    this.results.push({ endpoint, method, status, message, responseData });
  }

  private printResults() {
    console.log('\n📋 API Test Results Summary:');
    console.log('================================');
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    this.results.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`${statusIcon} ${result.method} ${result.endpoint}: ${result.message}`);
      
      if (result.responseData) {
        console.log(`   Response: ${JSON.stringify(result.responseData, null, 2)}`);
      }
      
      if (result.status === 'PASS') passed++;
      else if (result.status === 'FAIL') failed++;
      else skipped++;
    });
    
    console.log('\n📊 Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`📈 Success Rate: ${passed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0}%`);
  }
}

export const runAPITests = async (): Promise<TestResult[]> => {
  const tester = new APITester();
  return await tester.runAllTests();
};

// Export for console usage
(window as any).runAPITests = runAPITests;
