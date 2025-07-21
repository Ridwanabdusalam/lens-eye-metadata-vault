-- Add perceptual hash field for duplicate detection
ALTER TABLE public.images 
ADD COLUMN perceptual_hash TEXT;

-- Create index for perceptual hash lookups
CREATE INDEX idx_images_perceptual_hash ON public.images(perceptual_hash);

-- Add audit logging trigger function
CREATE OR REPLACE FUNCTION public.log_image_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert audit record when metadata changes
  INSERT INTO public.audit_log (
    table_name, 
    record_id, 
    action, 
    old_values, 
    new_values, 
    changed_by, 
    changed_at
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid(),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit log table
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create audit log policies
CREATE POLICY "Users can view audit logs for their data" 
ON public.audit_log 
FOR SELECT 
USING (
  changed_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.images 
    WHERE images.id = audit_log.record_id 
    AND images.created_by = auth.uid()
  )
);

-- Create triggers for audit logging
CREATE TRIGGER audit_images_changes
AFTER UPDATE ON public.images
FOR EACH ROW
EXECUTE FUNCTION public.log_image_changes();

CREATE TRIGGER audit_metrics_changes
AFTER INSERT OR UPDATE ON public.image_metrics
FOR EACH ROW
EXECUTE FUNCTION public.log_image_changes();