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

    const { image_id, tags, notes, action = 'replace' } = await req.json()

    if (!image_id) {
      return new Response(JSON.stringify({ error: 'Missing image_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify user owns the image
    const { data: imageData, error: imageError } = await supabaseClient
      .from('images')
      .select('id, tags, notes, created_by')
      .eq('id', image_id)
      .eq('created_by', user.id)
      .single()

    if (imageError || !imageData) {
      return new Response(JSON.stringify({ error: 'Image not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let updatedTags = imageData.tags || []
    let updatedNotes = imageData.notes

    // Handle tag operations
    if (tags !== undefined) {
      switch (action) {
        case 'add':
          updatedTags = [...new Set([...updatedTags, ...tags])]
          break
        case 'remove':
          updatedTags = updatedTags.filter(tag => !tags.includes(tag))
          break
        case 'replace':
        default:
          updatedTags = tags
          break
      }
    }

    // Handle notes update
    if (notes !== undefined) {
      updatedNotes = notes
    }

    // Update the image
    const { data: updatedData, error: updateError } = await supabaseClient
      .from('images')
      .update({
        tags: updatedTags,
        notes: updatedNotes
      })
      .eq('id', image_id)
      .eq('created_by', user.id)
      .select()
      .single()

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Update failed', details: updateError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      image: updatedData
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