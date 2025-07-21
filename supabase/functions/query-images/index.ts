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

    const url = new URL(req.url)
    const searchParams = url.searchParams

    // Build query filters
    let query = supabaseClient
      .from('images')
      .select(`
        *,
        image_metrics (*)
      `)

    // Apply filters
    if (searchParams.get('camera_type')) {
      query = query.eq('camera_type', searchParams.get('camera_type'))
    }
    
    if (searchParams.get('scene_type')) {
      query = query.eq('scene_type', searchParams.get('scene_type'))
    }
    
    if (searchParams.get('test_campaign')) {
      query = query.eq('test_campaign', searchParams.get('test_campaign'))
    }
    
    if (searchParams.get('lighting_condition')) {
      query = query.eq('lighting_condition', searchParams.get('lighting_condition'))
    }

    // Tag filtering (array contains)
    if (searchParams.get('tags')) {
      const tags = searchParams.get('tags')!.split(',')
      query = query.overlaps('tags', tags)
    }

    // Date range filtering
    if (searchParams.get('capture_time_start')) {
      query = query.gte('capture_time', searchParams.get('capture_time_start'))
    }
    
    if (searchParams.get('capture_time_end')) {
      query = query.lte('capture_time', searchParams.get('capture_time_end'))
    }

    // Metric thresholds (requires joining with image_metrics)
    const metricFilters = [
      'sharpness_min', 'sharpness_max',
      'noise_min', 'noise_max',
      'flare_index_min', 'flare_index_max',
      'motion_blur_score_min', 'motion_blur_score_max'
    ]

    const hasMetricFilters = metricFilters.some(filter => searchParams.get(filter))

    if (hasMetricFilters) {
      // Use RPC function for complex metric filtering
      const filters = {
        camera_type: searchParams.get('camera_type'),
        scene_type: searchParams.get('scene_type'),
        test_campaign: searchParams.get('test_campaign'),
        lighting_condition: searchParams.get('lighting_condition'),
        tags: searchParams.get('tags')?.split(',') || [],
        capture_time_start: searchParams.get('capture_time_start'),
        capture_time_end: searchParams.get('capture_time_end'),
        sharpness_min: parseFloat(searchParams.get('sharpness_min') || '0'),
        sharpness_max: parseFloat(searchParams.get('sharpness_max') || '1'),
        noise_min: parseFloat(searchParams.get('noise_min') || '0'),
        noise_max: parseFloat(searchParams.get('noise_max') || '1'),
        flare_index_min: parseFloat(searchParams.get('flare_index_min') || '0'),
        flare_index_max: parseFloat(searchParams.get('flare_index_max') || '1'),
        motion_blur_score_min: parseFloat(searchParams.get('motion_blur_score_min') || '0'),
        motion_blur_score_max: parseFloat(searchParams.get('motion_blur_score_max') || '1')
      }

      const { data, error } = await supabaseClient.rpc('query_images_with_metrics', filters)
      
      if (error) {
        return new Response(JSON.stringify({ error: 'Query failed', details: error }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        images: data,
        count: data.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return new Response(JSON.stringify({ error: 'Query failed', details: error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      images: data,
      count: count,
      page: page,
      limit: limit
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