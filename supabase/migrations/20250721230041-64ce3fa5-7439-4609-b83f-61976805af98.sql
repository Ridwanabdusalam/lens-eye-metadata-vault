-- Create RPC function for complex metric-based queries with proper ENUM handling
CREATE OR REPLACE FUNCTION public.query_images_with_metrics(
  p_camera_type TEXT DEFAULT NULL,
  p_scene_type TEXT DEFAULT NULL,
  p_test_campaign TEXT DEFAULT NULL,
  p_lighting_condition TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_capture_time_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_capture_time_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_sharpness_min FLOAT DEFAULT 0,
  p_sharpness_max FLOAT DEFAULT 1,
  p_noise_min FLOAT DEFAULT 0,
  p_noise_max FLOAT DEFAULT 1,
  p_flare_index_min FLOAT DEFAULT 0,
  p_flare_index_max FLOAT DEFAULT 1,
  p_motion_blur_score_min FLOAT DEFAULT 0,
  p_motion_blur_score_max FLOAT DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  image_url TEXT,
  camera_module_id TEXT,
  camera_type_val TEXT,
  test_campaign_val TEXT,
  scene_type_val TEXT,
  lighting_condition_val TEXT,
  capture_time TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  notes TEXT,
  perceptual_hash TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  metrics JSONB
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    i.id,
    i.image_url,
    i.camera_module_id,
    i.camera_type::TEXT as camera_type_val,
    i.test_campaign as test_campaign_val,
    i.scene_type::TEXT as scene_type_val,
    i.lighting_condition::TEXT as lighting_condition_val,
    i.capture_time,
    i.tags,
    i.notes,
    i.perceptual_hash,
    i.created_by,
    i.created_at,
    i.updated_at,
    to_jsonb(m.*) as metrics
  FROM public.images i
  LEFT JOIN public.image_metrics m ON i.id = m.image_id
  WHERE 
    i.created_by = auth.uid()
    AND (p_camera_type IS NULL OR i.camera_type::TEXT = p_camera_type)
    AND (p_scene_type IS NULL OR i.scene_type::TEXT = p_scene_type)
    AND (p_test_campaign IS NULL OR i.test_campaign = p_test_campaign)
    AND (p_lighting_condition IS NULL OR i.lighting_condition::TEXT = p_lighting_condition)
    AND (p_tags IS NULL OR i.tags && p_tags)
    AND (p_capture_time_start IS NULL OR i.capture_time >= p_capture_time_start)
    AND (p_capture_time_end IS NULL OR i.capture_time <= p_capture_time_end)
    AND (m.sharpness IS NULL OR (m.sharpness >= p_sharpness_min AND m.sharpness <= p_sharpness_max))
    AND (m.noise IS NULL OR (m.noise >= p_noise_min AND m.noise <= p_noise_max))
    AND (m.flare_index IS NULL OR (m.flare_index >= p_flare_index_min AND m.flare_index <= p_flare_index_max))
    AND (m.motion_blur_score IS NULL OR (m.motion_blur_score >= p_motion_blur_score_min AND m.motion_blur_score <= p_motion_blur_score_max));
$$;

-- Create function to find similar images by hash (simplified version)
CREATE OR REPLACE FUNCTION public.find_similar_images(
  target_hash TEXT,
  similarity_threshold FLOAT DEFAULT 0.8
)
RETURNS TABLE (
  id UUID,
  perceptual_hash TEXT,
  similarity_score FLOAT,
  image_url TEXT,
  camera_module_id TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    i.id,
    i.perceptual_hash,
    CASE 
      WHEN i.perceptual_hash = target_hash THEN 1.0
      ELSE 0.9 -- Simplified similarity for exact matches
    END as similarity_score,
    i.image_url,
    i.camera_module_id
  FROM public.images i
  WHERE 
    i.created_by = auth.uid()
    AND i.perceptual_hash IS NOT NULL
    AND i.perceptual_hash = target_hash; -- Exact matches only for now
$$;

-- Create function for batch archival (simulate lifecycle management)
CREATE OR REPLACE FUNCTION public.mark_images_for_archival(
  archive_before_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  id UUID,
  image_url TEXT,
  archive_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    i.id,
    i.image_url,
    'ready_for_archival' as archive_status
  FROM public.images i
  WHERE 
    i.created_by = auth.uid()
    AND i.capture_time < archive_before_date;
$$;