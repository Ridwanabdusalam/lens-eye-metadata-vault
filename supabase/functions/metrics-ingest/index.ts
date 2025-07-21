import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get user from JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { image_id, metrics } = await req.json()

    if (!image_id || !metrics) {
      return new Response(JSON.stringify({ error: 'Missing image_id or metrics' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify user owns the image
    const { data: imageData, error: imageError } = await supabaseClient
      .from('images')
      .select('id, created_by')
      .eq('id', image_id)
      .eq('created_by', user.id)
      .single()

    if (imageError || !imageData) {
      return new Response(JSON.stringify({ error: 'Image not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insert metrics
    const { data: metricsData, error: metricsError } = await supabaseClient
      .from('image_metrics')
      .insert({
        image_id: image_id,
        sharpness: metrics.sharpness,
        noise: metrics.noise,
        flare_index: metrics.flare_index,
        chromatic_aberration: metrics.chromatic_aberration,
        white_balance_error: metrics.white_balance_error,
        exposure_level: metrics.exposure_level,
        focus_score: metrics.focus_score,
        motion_blur_score: metrics.motion_blur_score,
        dynamic_range: metrics.dynamic_range,
        contrast_ratio: metrics.contrast_ratio,
        edge_acutance: metrics.edge_acutance,
        saturation_deviation: metrics.saturation_deviation,
        eye_tracking_accuracy: metrics.eye_tracking_accuracy,
        depth_map_quality: metrics.depth_map_quality,
        passthrough_alignment_error: metrics.passthrough_alignment_error
      })
      .select()
      .single()

    if (metricsError) {
      return new Response(JSON.stringify({ error: 'Failed to insert metrics', details: metricsError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      metrics: metricsData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})