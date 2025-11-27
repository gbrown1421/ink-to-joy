import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Upload page handler
 * Accepts a photo upload, stores it, and creates a page record for processing
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const formData = await req.formData();
    const bookId = formData.get('bookId') as string;
    const imageFile = formData.get('image') as File;

    if (!bookId || !imageFile) {
      return new Response(
        JSON.stringify({ error: 'bookId and image are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing upload for book:', bookId);

    // Get next page order
    const { data: existingPages } = await supabase
      .from('pages')
      .select('page_order')
      .eq('book_id', bookId)
      .order('page_order', { ascending: false })
      .limit(1);

    const nextOrder = existingPages && existingPages.length > 0 
      ? existingPages[0].page_order + 1 
      : 1;

    // Upload original image to storage
    const fileName = `${crypto.randomUUID()}.${imageFile.name.split('.').pop()}`;
    const storagePath = `books/${bookId}/pages/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('book-images')
      .upload(storagePath, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(storagePath);

    console.log('Original uploaded to:', publicUrl);

    // Create page record with status "processing"
    const { data: newPage, error: pageError } = await supabase
      .from('pages')
      .insert({
        book_id: bookId,
        original_image_url: publicUrl,
        page_order: nextOrder,
        status: 'processing',
      })
      .select()
      .single();

    if (pageError) {
      console.error('Page creation error:', pageError);
      throw new Error('Failed to create page record');
    }

    console.log('Page created:', newPage.id);

    return new Response(
      JSON.stringify({
        pageId: newPage.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in upload-page:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
