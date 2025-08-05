import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { nanoid } from 'https://esm.sh/nanoid@4.0.0'

// Basic SHA-256 hashing for prototyping - NOT SECURE FOR PRODUCTION
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexHash;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { host_password, creator_fingerprint } = await req.json()

    if (!host_password) {
      console.error('Error: Host password is required.');
      throw new Error('Host password is required.')
    }

    if (!creator_fingerprint) {
      console.error('Error: Creator fingerprint is required.');
      throw new Error('Creator fingerprint is required.')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const party_code = nanoid(6) // Generate a 6-character unique code
    const host_password_hash = await sha256(host_password + party_code); // Basic hashing with party_code as salt

    // Create party with creator automatically set as host
    const { data, error } = await supabase
      .from('parties')
      .insert([{ 
        party_code, 
        host_password_hash,
        host_fingerprint: creator_fingerprint  // Set creator as host immediately
      }])
      .select()

    if (error) {
      console.error('Supabase insert error:', error);
      throw error
    }

    return new Response(JSON.stringify({ party: data[0] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})