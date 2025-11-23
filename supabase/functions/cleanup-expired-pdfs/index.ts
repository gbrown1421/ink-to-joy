import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting PDF cleanup job...');

    // Find all books with expired PDFs
    const { data: expiredBooks, error: queryError } = await supabase
      .from('books')
      .select('id, pdf_url')
      .eq('status', 'completed')
      .eq('pdf_deleted', false)
      .lt('pdf_expires_at', new Date().toISOString())
      .not('pdf_url', 'is', null);

    if (queryError) {
      console.error('Error querying expired books:', queryError);
      throw queryError;
    }

    if (!expiredBooks || expiredBooks.length === 0) {
      console.log('No expired PDFs found');
      return new Response(
        JSON.stringify({ message: 'No expired PDFs to clean up', deletedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredBooks.length} expired PDFs to delete`);

    let deletedCount = 0;
    let errorCount = 0;

    // Delete each expired PDF
    for (const book of expiredBooks) {
      try {
        // Extract file path from URL (e.g., books/abc-123/book.pdf)
        const urlParts = book.pdf_url.split('/');
        const pathStart = urlParts.findIndex((part: string) => part === 'book-pdfs');
        if (pathStart === -1) {
          console.error(`Invalid PDF URL format for book ${book.id}: ${book.pdf_url}`);
          errorCount++;
          continue;
        }
        
        const filePath = urlParts.slice(pathStart + 1).join('/');
        console.log(`Deleting PDF for book ${book.id}: ${filePath}`);

        // Delete from storage
        const { error: deleteError } = await supabase
          .storage
          .from('book-pdfs')
          .remove([filePath]);

        if (deleteError) {
          console.error(`Error deleting PDF for book ${book.id}:`, deleteError);
          errorCount++;
          continue;
        }

        // Update database
        const { error: updateError } = await supabase
          .from('books')
          .update({
            pdf_url: null,
            pdf_deleted: true,
          })
          .eq('id', book.id);

        if (updateError) {
          console.error(`Error updating book ${book.id}:`, updateError);
          errorCount++;
          continue;
        }

        deletedCount++;
        console.log(`Successfully deleted PDF for book ${book.id}`);
      } catch (error) {
        console.error(`Exception processing book ${book.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Cleanup complete: ${deletedCount} PDFs deleted, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        message: 'PDF cleanup completed',
        deletedCount,
        errorCount,
        totalProcessed: expiredBooks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cleanup-expired-pdfs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
