import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface SongContext {
  currentSong?: string;
  recentSongs: Array<{
    title: string;
    playedAt: string;
  }>;
  timeContext: {
    hour: number;
    phase: string;
    timestamp: string;
  };
  fullQueue: string[];
  musicStyle?: string;
  stylePreference?: string;
}

interface SuggestedSong {
  title: string;
  artist: string;
  reason: string;
}


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const { currentSong, recentSongs, timeContext, fullQueue, musicStyle, stylePreference }: SongContext = await req.json();

    // Prepare the enhanced song context with timing and user preferences
    const songContext = [];
    
    // PRIORITY 1: User Style Preference (if provided)
    if (musicStyle && musicStyle.trim()) {
      songContext.push(`🎯 USER MUSIC STYLE PREFERENCE (HIGHEST PRIORITY): "${musicStyle}"`);
      songContext.push(`CRITICAL: ALL suggestions must align with this user preference. This overrides everything else.`);
      songContext.push('');
    }
    
    // Add subtle time context (but prioritize musical flow)
    const timePhaseDescriptions = {
      'morning': 'daytime session',
      'afternoon': 'afternoon listening',
      'early-evening': 'evening session',
      'prime-time': 'night session',
      'late-night': 'late night session',
      'after-hours': 'late session'
    };
    
    const timeDesc = timePhaseDescriptions[timeContext?.phase] || 'session';
    songContext.push(`Context: ${timeDesc} (${timeContext?.hour || 'unknown'}:00)`);
    
    if (currentSong) {
      songContext.push(`Currently playing: "${currentSong}"`);
    }
    
    if (recentSongs && recentSongs.length > 0) {
      songContext.push(`Recently played songs (most recent first):`);
      recentSongs.forEach((song, index) => {
        songContext.push(`${index + 1}. "${song.title}" (played ${song.playedAt})`);
      });
      
      if (musicStyle && musicStyle.trim()) {
        songContext.push(`\nIMPORTANT: Blend the user's style preference "${musicStyle}" with the flow from these recent songs.`);
      } else {
        songContext.push(`\nIMPORTANT: Analyze the musical style, energy, genre, and mood of these recent songs. Your suggestions should flow naturally from this musical context.`);
      }
    }

    if (fullQueue && fullQueue.length > 0) {
      songContext.push(`\nCRITICAL: DO NOT suggest any of the songs in the following list (they are already in the queue or were recently played):\n- ${fullQueue.join('\n- ')}`);
    }
    
    const styleInstructions = musicStyle && musicStyle.trim() 
      ? `\n🎯 CRITICAL STYLE REQUIREMENT: The user has specified they want "${musicStyle}". ALL suggestions MUST align with this preference. This is the #1 priority.`
      : '';

    const prompt = `You are a music curator for SnapTrack. Your job is to suggest songs that create a perfect musical flow.

Context:
${songContext.join('\n')}${styleInstructions}

Please respond with EXACTLY 6-8 song suggestions in this JSON format:
{
  "suggestions": [
    {
      "title": "Song Title",
      "artist": "Artist Name", 
      "reason": "Brief reason why this fits"
    }
  ]
}

REQUIREMENTS (in order of priority):
${musicStyle && musicStyle.trim() 
  ? `1. 🎯 HIGHEST PRIORITY: ALL songs must match the user's style preference "${musicStyle}". This overrides everything else.
2. DO NOT suggest any songs from the critical exclusion list above.
3. Create flow with recent songs when possible.
4. ORDER suggestions by quality - put the BEST suggestion first.`
  : `1. Match the musical vibe, genre, energy level, and mood of recent songs.
2. DO NOT suggest any songs from the critical exclusion list above.
3. Create smooth musical transitions.
4. ORDER suggestions by quality - put the BEST suggestion first.`}

FORMATTING:
- Each reason should be 1-2 sentences maximum
- Order from BEST to good (best suggestion first)
- Return ONLY the JSON response, no other text.`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': ''
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      console.error('No text response from Gemini API:', geminiData);
      throw new Error('No response from Gemini API');
    }

    let jsonText = textResponse.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsedResponse = JSON.parse(jsonText);
    const suggestions = parsedResponse.suggestions || [];

    // Process and validate suggestions, but do not filter here.
    const validSuggestions: SuggestedSong[] = [];
    for (const suggestion of suggestions) {
      if (suggestion.title && suggestion.artist) {
        validSuggestions.push({
          title: suggestion.title,
          artist: suggestion.artist,
          reason: suggestion.reason || 'Great party song!'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        suggestions: validSuggestions.slice(0, 8)
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )

  } catch (error) {
    console.error('Error in get-song-suggestions function:', error);
    
    const fallbackSuggestions = [
      { title: "Can't Stop the Feeling!", artist: "Justin Timberlake", reason: "Always gets the party started!" },
      { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", reason: "Classic party anthem" },
      { title: "Shape of You", artist: "Ed Sheeran", reason: "Crowd favorite" }
    ];

    return new Response(
      JSON.stringify({ suggestions: fallbackSuggestions }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )
  }
})
