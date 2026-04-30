// Generate a 5-second ElevenLabs reference voice clip for an avatar and store it.
// POST { avatarId } -> generate for one avatar
// POST { backfill: true } -> generate for every avatar missing a voice sample
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Curated ElevenLabs voices, picked for a believable mid-20s UGC tone.
// Female pool — warm, natural, conversational.
const FEMALE_VOICES = [
  'EXAVITQu4vr4xnSDxMaL', // Sarah
  'XrExE9yKIg1WjnnlVkGX', // Matilda
  'cgSgspJ2msm6clMCkdW9', // Jessica
  'Xb7hH8MSUJpSbSDYk0k2', // Alice
  'pFZP5JQG7iQjIQuC4Bku', // Lily
  'FGY2WhTYpPnrIDTdsKH5', // Laura
];
// Male pool — chill, casual, mid-20s.
const MALE_VOICES = [
  'TX3LPaxmHKxFdv7VOQHJ', // Liam
  'IKne3meq5aSn9XLyUdCD', // Charlie
  'iP95p4xoKVk53GoZ742B', // Chris
  'cjVigY5qzO86Huf0OWal', // Eric
  'bIHbv24MWmeRgasZH58o', // Will
];

// Reference script — natural UGC cadence so Seedance can mimic it tonally.
const FEMALE_SCRIPT =
  "Okay so, this just arrived and... I'm honestly kind of obsessed. Like, look at this. The color, the way it feels — it's just really good. Yeah, I think this is the one.";
const MALE_SCRIPT =
  "Alright so, this just got here and... I gotta say, it's actually really clean. Like the whole thing — the build, the feel — it's just dialed. Yeah, I'm into it.";

// Hash a string to a stable index — same avatar always gets the same voice.
function pickVoice(seed: string, pool: string[]): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

async function generateVoiceForAvatar(
  admin: ReturnType<typeof createClient>,
  avatar: { id: string; name: string; gender: string | null },
): Promise<{ voiceUrl: string; voiceId: string }> {
  const isMale = (avatar.gender || '').toLowerCase().startsWith('m');
  const pool = isMale ? MALE_VOICES : FEMALE_VOICES;
  const script = isMale ? MALE_SCRIPT : FEMALE_SCRIPT;
  const voiceId = pickVoice(avatar.id, pool);

  const ttsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    },
  );
  if (!ttsRes.ok) {
    const errTxt = await ttsRes.text();
    throw new Error(`ElevenLabs TTS failed [${ttsRes.status}]: ${errTxt}`);
  }
  const audio = new Uint8Array(await ttsRes.arrayBuffer());

  const path = `${avatar.id}/reference.mp3`;
  const { error: upErr } = await admin.storage
    .from('ms-voice-samples')
    .upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

  // Long-lived signed URL (1 year). Seedance pulls this once at video time.
  const { data: signed, error: signErr } = await admin.storage
    .from('ms-voice-samples')
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr || !signed?.signedUrl) {
    throw new Error(`Sign URL failed: ${signErr?.message ?? 'no url'}`);
  }

  await admin
    .from('ms_avatars')
    .update({
      voice_sample_url: signed.signedUrl,
      voice_id: voiceId,
      voice_status: 'ready',
    })
    .eq('id', avatar.id);

  return { voiceUrl: signed.signedUrl, voiceId };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const { avatarId, backfill, force } = body as {
      avatarId?: string;
      backfill?: boolean;
      force?: boolean;
    };

    // Backfill mode — generate for every avatar missing a sample
    if (backfill) {
      let q = admin.from('ms_avatars').select('id, name, gender, voice_sample_url');
      if (!force) q = q.is('voice_sample_url', null);
      const { data: avatars, error } = await q;
      if (error) throw error;
      const results: Array<{ id: string; ok: boolean; error?: string }> = [];
      for (const a of avatars ?? []) {
        try {
          await admin.from('ms_avatars').update({ voice_status: 'generating' }).eq('id', a.id);
          await generateVoiceForAvatar(admin, a as any);
          results.push({ id: a.id, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'unknown';
          await admin.from('ms_avatars').update({ voice_status: 'failed' }).eq('id', a.id);
          results.push({ id: a.id, ok: false, error: msg });
        }
      }
      return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single-avatar mode
    if (!avatarId) {
      return new Response(JSON.stringify({ error: 'avatarId required (or pass backfill:true)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: avatar, error: aErr } = await admin
      .from('ms_avatars')
      .select('id, name, gender, voice_sample_url')
      .eq('id', avatarId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!avatar) {
      return new Response(JSON.stringify({ error: 'avatar not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (avatar.voice_sample_url && !force) {
      return new Response(
        JSON.stringify({ ok: true, voiceUrl: avatar.voice_sample_url, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    await admin.from('ms_avatars').update({ voice_status: 'generating' }).eq('id', avatar.id);
    const { voiceUrl, voiceId } = await generateVoiceForAvatar(admin, avatar as any);

    return new Response(JSON.stringify({ ok: true, voiceUrl, voiceId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-voice-sample error', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
