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

    const { filters, format = 'json', include_signed_urls = true } = await req.json()

    // Build query based on filters (dataset recipe)
    let query = supabaseClient
      .from('images')
      .select(`
        *,
        image_metrics (*)
      `)

    // Apply dataset recipe filters
    if (filters.camera_types?.length) {
      query = query.in('camera_type', filters.camera_types)
    }
    
    if (filters.scene_types?.length) {
      query = query.in('scene_type', filters.scene_types)
    }
    
    if (filters.lighting_conditions?.length) {
      query = query.in('lighting_condition', filters.lighting_conditions)
    }

    if (filters.test_campaigns?.length) {
      query = query.in('test_campaign', filters.test_campaigns)
    }

    if (filters.tags?.length) {
      query = query.overlaps('tags', filters.tags)
    }

    // Date range
    if (filters.capture_time_start) {
      query = query.gte('capture_time', filters.capture_time_start)
    }
    
    if (filters.capture_time_end) {
      query = query.lte('capture_time', filters.capture_time_end)
    }

    const { data: images, error } = await query

    if (error) {
      return new Response(JSON.stringify({ error: 'Export query failed', details: error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Filter by metric thresholds if specified
    let filteredImages = images || []

    if (filters.metrics) {
      filteredImages = filteredImages.filter(image => {
        if (!image.image_metrics?.length) return false

        const metrics = image.image_metrics[0] // Assuming one metric record per image
        
        return Object.entries(filters.metrics).every(([metric, threshold]) => {
          if (typeof threshold === 'object') {
            const min = threshold.min ?? -Infinity
            const max = threshold.max ?? Infinity
            const value = metrics[metric]
            return value !== null && value >= min && value <= max
          } else {
            return metrics[metric] >= threshold
          }
        })
      })
    }

    // Generate signed URLs if requested
    if (include_signed_urls) {
      for (const image of filteredImages) {
        const filePath = image.image_url.split('/camera-validation-images/')[1]
        if (filePath) {
          const { data: signedUrlData } = await supabaseClient.storage
            .from('camera-validation-images')
            .createSignedUrl(filePath, 3600) // 1 hour expiry

          if (signedUrlData) {
            image.signed_url = signedUrlData.signedUrl
          }
        }
      }
    }

    // Format response based on requested format
    if (format === 'csv') {
      const csvHeaders = [
        'id', 'camera_module_id', 'camera_type', 'test_campaign', 
        'scene_type', 'lighting_condition', 'capture_time', 
        'tags', 'notes', 'image_url', 'signed_url',
        'sharpness', 'noise', 'flare_index', 'motion_blur_score'
      ]

      const csvRows = filteredImages.map(image => {
        const metrics = image.image_metrics?.[0] || {}
        return [
          image.id,
          image.camera_module_id,
          image.camera_type,
          image.test_campaign,
          image.scene_type,
          image.lighting_condition,
          image.capture_time,
          JSON.stringify(image.tags),
          `"${(image.notes || '').replace(/"/g, '""')}"`,
          image.image_url,
          image.signed_url || '',
          metrics.sharpness || '',
          metrics.noise || '',
          metrics.flare_index || '',
          metrics.motion_blur_score || ''
        ].join(',')
      })

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n')

      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="camera_validation_export_${Date.now()}.csv"`
        }
      })
    }

    // Default JSON format
    const exportData = {
      export_metadata: {
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        filters_applied: filters,
        total_images: filteredImages.length,
        format: format
      },
      images: filteredImages
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="camera_validation_export_${Date.now()}.json"`
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})