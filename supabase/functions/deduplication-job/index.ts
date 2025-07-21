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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { similarity_threshold = 0.95, dry_run = true } = await req.json()

    // Find potential duplicates based on perceptual hash similarity
    const { data: images, error } = await supabaseClient
      .from('images')
      .select('id, perceptual_hash, image_url, camera_module_id, test_campaign, created_at')
      .not('perceptual_hash', 'is', null)
      .order('created_at', { ascending: true })

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch images', details: error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const duplicateGroups = []
    const processed = new Set()

    // Simple hash-based deduplication (exact matches)
    const hashGroups = new Map()
    
    for (const image of images) {
      if (processed.has(image.id)) continue

      const hash = image.perceptual_hash
      if (!hashGroups.has(hash)) {
        hashGroups.set(hash, [])
      }
      hashGroups.get(hash).push(image)
    }

    // Find groups with duplicates
    for (const [hash, imageGroup] of hashGroups.entries()) {
      if (imageGroup.length > 1) {
        // Keep the oldest image, mark others as duplicates
        const sorted = imageGroup.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        const keepImage = sorted[0]
        const duplicates = sorted.slice(1)

        duplicateGroups.push({
          hash,
          keep: keepImage,
          duplicates: duplicates,
          similarity: 1.0 // Exact hash match
        })

        duplicates.forEach(img => processed.add(img.id))
      }
    }

    const summary = {
      total_images_scanned: images.length,
      duplicate_groups_found: duplicateGroups.length,
      total_duplicates: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      space_savings_estimate: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0) + ' files',
      dry_run: dry_run
    }

    if (!dry_run) {
      // Actually remove duplicates
      const idsToDelete = duplicateGroups.flatMap(group => group.duplicates.map(img => img.id))
      
      if (idsToDelete.length > 0) {
        // Delete from database
        const { error: deleteError } = await supabaseClient
          .from('images')
          .delete()
          .in('id', idsToDelete)

        if (deleteError) {
          return new Response(JSON.stringify({ 
            error: 'Failed to delete duplicate records', 
            details: deleteError,
            summary: summary 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Delete from storage
        const filesToDelete = duplicateGroups.flatMap(group => 
          group.duplicates.map(img => {
            const urlParts = img.image_url.split('/camera-validation-images/')
            return urlParts[1] // Get the file path part
          }).filter(Boolean)
        )

        if (filesToDelete.length > 0) {
          const { error: storageError } = await supabaseClient.storage
            .from('camera-validation-images')
            .remove(filesToDelete)

          if (storageError) {
            console.error('Storage deletion error:', storageError)
            // Don't fail the whole operation for storage errors
          }
        }

        summary.deleted_count = idsToDelete.length
        summary.storage_files_deleted = filesToDelete.length
      }
    }

    return new Response(JSON.stringify({
      success: true,
      summary: summary,
      duplicate_groups: dry_run ? duplicateGroups : undefined
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
