-- Create ENUMs for camera validation system
CREATE TYPE public.camera_type AS ENUM (
  'RGB', 'NIR', 'Depth', 'IR', 'Eye_Tracking', 'Passthrough', 
  'CV_Module', 'Multispectral', 'Stereo'
);

CREATE TYPE public.scene_type AS ENUM (
  'indoor_lab', 'outdoor', 'darkroom', 'studio', 'dynamic_range_chart',
  'motion_tracking_scene', 'calibration_rig', 'low_light', 'bright_backlight', 'natural_daylight'
);

CREATE TYPE public.lighting_condition AS ENUM (
  'D65', 'tungsten', 'sunlight', 'fluorescent', 'LED', 'mixed_lighting',
  'candlelight', 'monochromatic_IR', 'low_lux', 'HDR_lightbox'
);

-- Create storage bucket for camera validation images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('camera-validation-images', 'camera-validation-images', true);

-- Create images table
CREATE TABLE public.images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  camera_module_id TEXT NOT NULL,
  camera_type public.camera_type NOT NULL,
  test_campaign TEXT NOT NULL,
  scene_type public.scene_type NOT NULL,
  lighting_condition public.lighting_condition NOT NULL,
  capture_time TIMESTAMP WITH TIME ZONE NOT NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create image_metrics table
CREATE TABLE public.image_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  sharpness FLOAT,
  noise FLOAT,
  flare_index FLOAT,
  chromatic_aberration FLOAT,
  white_balance_error FLOAT,
  exposure_level FLOAT,
  focus_score FLOAT,
  motion_blur_score FLOAT,
  dynamic_range FLOAT,
  contrast_ratio FLOAT,
  edge_acutance FLOAT,
  saturation_deviation FLOAT,
  eye_tracking_accuracy FLOAT,
  depth_map_quality FLOAT,
  passthrough_alignment_error FLOAT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for images table
CREATE POLICY "Users can view their own images" 
ON public.images 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own images" 
ON public.images 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own images" 
ON public.images 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own images" 
ON public.images 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create RLS policies for image_metrics table
CREATE POLICY "Users can view metrics for their images" 
ON public.image_metrics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.images 
  WHERE images.id = image_metrics.image_id 
  AND images.created_by = auth.uid()
));

CREATE POLICY "Users can create metrics for their images" 
ON public.image_metrics 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.images 
  WHERE images.id = image_metrics.image_id 
  AND images.created_by = auth.uid()
));

CREATE POLICY "Users can update metrics for their images" 
ON public.image_metrics 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.images 
  WHERE images.id = image_metrics.image_id 
  AND images.created_by = auth.uid()
));

CREATE POLICY "Users can delete metrics for their images" 
ON public.image_metrics 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.images 
  WHERE images.id = image_metrics.image_id 
  AND images.created_by = auth.uid()
));

-- Create storage policies for camera validation images
CREATE POLICY "Users can view their own images in storage" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'camera-validation-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'camera-validation-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own images in storage" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'camera-validation-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images in storage" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'camera-validation-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for automatic timestamp updates on images
CREATE TRIGGER update_images_updated_at
BEFORE UPDATE ON public.images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_images_camera_module_id ON public.images(camera_module_id);
CREATE INDEX idx_images_camera_type ON public.images(camera_type);
CREATE INDEX idx_images_test_campaign ON public.images(test_campaign);
CREATE INDEX idx_images_scene_type ON public.images(scene_type);
CREATE INDEX idx_images_lighting_condition ON public.images(lighting_condition);
CREATE INDEX idx_images_created_by ON public.images(created_by);
CREATE INDEX idx_images_capture_time ON public.images(capture_time);
CREATE INDEX idx_images_tags ON public.images USING GIN(tags);
CREATE INDEX idx_image_metrics_image_id ON public.image_metrics(image_id);