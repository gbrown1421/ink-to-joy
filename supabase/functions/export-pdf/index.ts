import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Difficulty = "Quick and Easy" | "Beginner" | "Intermediate";

function normalizeDifficulty(raw: string | null): Difficulty {
  const v = (raw || "").toLowerCase().replace(/[&\s]/g, "");
  if (v === "quickandeasy" || v === "quick" || v === "quickeasy") return "Quick and Easy";
  if (v === "beginner") return "Beginner";
  return "Intermediate";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { bookId } = await req.json();

    if (!bookId) {
      return new Response(
        JSON.stringify({ error: 'Book ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get book details
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return new Response(
        JSON.stringify({ error: 'Book not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const difficulty = normalizeDifficulty(book.difficulty as string | null);

    // Get all pages marked as keep, ordered
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('book_id', bookId)
      .eq('keep', true)
      .eq('status', 'ready')
      .order('page_order');

    if (pagesError) {
      console.error('Error fetching pages:', pagesError);
      return new Response(
        JSON.stringify({ error: pagesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pages || pages.length === 0) {
      return new Response(
        JSON.stringify({ bookName: book.name, pages: [], status: 'empty' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select the correct image URL based on difficulty
    const getImageUrlForDifficulty = (page: any) => {
      if (difficulty === "Quick and Easy") {
        return page.easy_image_url || page.coloring_image_url || page.intermediate_image_url;
      } else if (difficulty === "Beginner") {
        return page.beginner_image_url || page.coloring_image_url || page.intermediate_image_url;
      } else {
        // Intermediate
        return page.intermediate_image_url || page.coloring_image_url || page.beginner_image_url || page.easy_image_url;
      }
    };

    // For v1, return the page data - PDF generation will be implemented on client side
    return new Response(
      JSON.stringify({ 
        bookName: book.name,
        pages: pages.map(p => ({
          coloringImageUrl: getImageUrlForDifficulty(p),
          borderStyle: p.border_style,
          headingText: p.heading_text,
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in export-pdf:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
