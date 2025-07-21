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

    const formData = await req.formData()
    const file = formData.get('file') as File
    const metadata = JSON.parse(formData.get('metadata') as string)

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate unique filename
    const imageId = crypto.randomUUID()
    const fileExtension = file.name.split('.').pop()
    const filePath = `${metadata.camera_module_id}/${metadata.test_campaign}/image_${imageId}.${fileExtension}`

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('camera-validation-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      return new Response(JSON.stringify({ error: 'Upload failed', details: uploadError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate perceptual hash (simplified implementation)
    const arrayBuffer = await file.arrayBuffer()
    const hashInput = new Uint8Array(arrayBuffer.slice(0, 1024)) // Use first 1KB for hash
    const hash = await crypto.subtle.digest('SHA-256', hashInput)
    const perceptualHash = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 16) // Use first 16 chars as simplified perceptual hash

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('camera-validation-images')
      .getPublicUrl(filePath)

    // Insert image metadata
    const { data: imageData, error: dbError } = await supabaseClient
      .from('images')
      .insert({
        id: imageId,
        image_url: urlData.publicUrl,
        camera_module_id: metadata.camera_module_id,
        camera_type: metadata.camera_type,
        test_campaign: metadata.test_campaign,
        scene_type: metadata.scene_type,
        lighting_condition: metadata.lighting_condition,
        capture_time: metadata.capture_time || new Date().toISOString(),
        tags: metadata.tags || [],
        notes: metadata.notes || '',
        perceptual_hash: perceptualHash,
        created_by: user.id
      })
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabaseClient.storage
        .from('camera-validation-images')
        .remove([filePath])

      return new Response(JSON.stringify({ error: 'Database insert failed', details: dbError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      image: imageData,
      storage_path: filePath
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