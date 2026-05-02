// Generate a Seedance-ready prompt + script from product + avatar + format preset.
// Multimodal: sends product/avatar images directly to the LLM so the writer can
// reference real physical details. Rolls a creator persona per call for variety.
// Few-shot anchored on Higgsfield reference prompts. Treats user prompts as
// USER_DIRECTION (creative core), not just a setting hint.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Claude Sonnet 4.5 — primary writer. Anthropic direct, then OpenRouter, then
// Lovable Gateway (Gemini) as a final emergency fallback so we never fail open.
const CLAUDE_MODEL_ANTHROPIC = 'claude-sonnet-4-5';
const CLAUDE_MODEL_OPENROUTER = 'anthropic/claude-sonnet-4.5';
const EMERGENCY_GEMINI_MODEL = 'google/gemini-2.5-pro';

// Creatify skill (full doc at supabase/functions/_skills/creatify-video-ad.md) is NOT
// inlined anymore — it diluted the prompt and produced checkbox-y scripts. We keep
// only a distilled cheat sheet (CREATIFY_DISTILLED below) as a passive reference.

// ---------- Creator personas (rolled per call) ----------
type Persona = {
  id: string;
  name: string;
  voice: string;
};

const PERSONAS: Persona[] = [
  {
    id: 'dry-deadpan',
    name: 'Dry Deadpan',
    voice:
      'Flat affect, slightly bored delivery that gives way to one genuine reaction. Short sentences. Pauses are weapons. No exclamation points. Final verdict is understated ("Yeah. It\'s good.").',
  },
  {
    id: 'wide-eyed-genuine',
    name: 'Wide-Eyed Genuine',
    voice:
      'Quietly amazed, almost whispering. Talks like she just found something nobody knows about. Uses "Wait" and "Look" a lot. Lines feel discovered, not announced.',
  },
  {
    id: 'chaotic-bestie',
    name: 'Chaotic Bestie',
    voice:
      'Talks fast, half-laughing, mid-thought asides ("WHY is there a duck"). Self-interrupts. Genuinely losing it over one detail. Energy is "I had to text you about this."',
  },
  {
    id: 'quiet-luxury',
    name: 'Quiet Luxury',
    voice:
      'Low volume, slow pacing, almost private. Lines under six words. Talks to herself, not the camera. Energy: "It feels really refined." Never excited, only impressed.',
  },
  {
    id: 'hype-friend',
    name: 'Hype Friend',
    voice:
      'Warm, encouraging, talking to a friend they want to put on. Uses "Okay so" openers. Honest enthusiasm with concrete reasons attached. Never marketing-bright, always personal.',
  },
  {
    id: 'low-key-cool',
    name: 'Low-Key Cool',
    voice:
      'Slight smirk, half-smile. Says less than she could. One eyebrow energy. Final line is a one-liner verdict ("Yeah this is the one." / "You are welcome.").',
  },
];

function rollPersona(): Persona {
  return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
}

const CREATIVE_ANGLES = [
  'Pattern Interrupt: start mid-action with the product unexpectedly entering frame, then reveal the specific detail that makes it worth stopping for.',
  'Day-in-the-Life: show the product moving through one realistic premium moment, with a tactile proof beat and a quiet payoff.',
  'Feature Cascade: open on the most visual feature, then stack two close-up proof beats before the creator reacts naturally.',
  'Before/After: begin with a plain everyday moment, add the product, then show the improved styling/result in one clean payoff.',
  'POV Hook: make the viewer feel like Alexia is texting/showing her best friend one unusually good find, with camera switches and close-ups.',
  'Social Proof Stack without stats: frame it as "I get it now" — visible detail first, use/wear test second, honest final reaction third.',
];

function rollCreativeAngle() {
  return CREATIVE_ANGLES[Math.floor(Math.random() * CREATIVE_ANGLES.length)];
}

// ---------- Hard rules that override every format ----------
const HUMAN_UGC_FIREWALL = `You are not writing ad copy. You are writing the exact prompt a strong UGC director would send to a video model.

Hard rules that override every format below:
- Make a fresh scene, not a recreation of the uploaded reference images. References are identity/product anchors only.
- AVATAR REFERENCE POLICY: the avatar image is ONLY for facial identity / likeness. Never copy its room, wall color, furniture, door, background, wardrobe, pose, lighting, camera crop, or selfie composition into final_prompt. Invent a new outfit and a new product-context setting every time.
- The creator's spoken lines must sound like a real person talking to a friend, not a brand, narrator, influencer script, or marketing voiceover.
- No generic praise unless attached to a CONCRETE physical detail you can SEE in the product images. Empty lines like "I'm obsessed", "so good", "love this" are banned UNLESS the next words name an exact color, texture, fit, hardware piece, movement, sound, or visible result.
- Every beat must contain real physical action: tilt, tap, trace, pull, peel, wear, use, rotate, pour, draw, lace, zip, clasp, sip, test, compare, or reveal.
- Every output must have a real ad idea from the Creatify framework: a hook, a body structure, and a payoff. Static "hold product, tilt, say verdict" scripts are rejected unless the user explicitly asked for a plain product hold-up.
- Mention the product by its literal PRODUCT_NAME, but do not repeat the name in every sentence.
- USER_DIRECTION (when present) is the creative core. Build the beats and dialogue AROUND it. Format rules govern camera/structure only — they NEVER override the user's creative direction.
- If USER_DIRECTION is blank, invent a product-specific creative angle from the visible product details. Never default to a static hold-up.
- If an avatar is provided, use them as the creator inside the scene. If no avatar is provided, use POV hands (with described nail color and sleeve color matched to product palette) — NEVER invent a random spokesperson.
- Output MUST feel like the EXAMPLE OUTPUT below: camera/style line, concrete scene/product paragraph, then "Action and dialogue sequence:" with timed physical beats and short quoted lines.
- The CREATOR_PERSONA voice is mandatory — every line of dialogue must sound like that specific archetype, not a generic UGC creator.
- The concrete_product_details array MUST contain at least 4 items extracted from the actual product images (color names, materials, hardware pieces, printed text, distinctive features). Do not invent details that aren't visible.
- READABLE TEXT RULE: any printed text, lettering, numbers, slogans, or logos visible on the product, garment, or packaging MUST be described as facing the camera and reading FORWARD — perfectly legible. NEVER use mirror reflections, mirror selfies, or any framing where on-product text would appear reversed/flipped/mirrored. If the camera angle would mirror the text, change the camera angle. State explicitly inside the prompt that the text reads forward.`;

// Distilled Creatify reference. Use sparingly — Higgsfield few-shots are the dominant
// stylistic signal. These are HINTS the writer can pull from, not a checklist.
const CREATIFY_DISTILLED = `CREATIFY REFERENCE (use only if it fits the product naturally — never force a formula):
HOOK FORMULAS (pick at most one):
- Pattern Interrupt — start mid-action, unexpected visual.
- POV Hook — "POV: you finally found a [thing] that [does X]".
- Bold Claim — lead with the strongest single benefit, stated flat.
- Question Hook — open a curiosity loop the viewer must close.
- Stat / Authority — one number or one credential, no list.
BODY STRUCTURES (pick at most one):
- Problem → Agitate → Solve.
- Feature Cascade — hero feature, two supporting beats, proof.
- Social Proof Stack — quote, visible proof, volume, urgency.
- Before / After — plain → product → improved result.
- Day-in-the-Life — one realistic moment, tactile beat, quiet payoff.
Rules: pick formulas silently. Never name them in the output. If USER_DIRECTION is present, the user's idea wins — formulas only shape camera/structure.`;

// ---------- Few-shot example outputs (verbatim Higgsfield) ----------
const EX_UGC = `EXAMPLE OUTPUT (study the structure, tone, persona-fit, concrete sensory detail — never copy literally):
Vertical 9:16 selfie-style UGC tennis racket review, shot on iPhone front and back camera mix, natural daylight on an outdoor tennis court, handheld authentic energy, casual "showing a friend my new racket" vibe, warm natural light, real skin tones, no filters. An outdoor tennis court — green hard court surface with white lines, a net visible in the background, natural daylight. The young woman wears a bright lime green tennis outfit, the vivid green a striking contrast against the mint green and orange of the AURA 300 racket; she holds the SERA AURA 300 — mint green to white gradient frame, orange cross-string pattern through the white string face, white perforated grip tape, AURA 300 lettering on the shaft. Action and dialogue sequence: She holds the AURA 300 up to the front camera, the full racket face filling the vertical frame, tilts it slowly catching the sun: "Okay so this just arrived and I am obsessed with the color." She switches to the back camera, bounces the racket lightly on her palm: "It feels really balanced, like not too heavy." She brings the racket close to the back lens so the orange cross-string pattern fills the frame. She props the phone, hits two slow controlled groundstrokes — the lime green outfit and mint racket moving through the frame together. Close-up back camera, pans down the shaft past the AURA 300 lettering: "And the grip feels so good, really clean." She holds the full racket up beside her face on the front camera: "Yeah. Yeah this is the one."`;

const EX_TUTORIAL = `EXAMPLE OUTPUT (study the structure, tone, persona-fit, concrete sensory detail — never copy literally):
Shot on iPhone front camera, vertical 9:16, natural HDR, slight exposure shifts, real skin tones, authentic UGC creator energy, warm indoor natural light. A bright casual room — warm natural light from the side, a clean desk surface with the ATELIER INK 12 CORE colors set in its clear transparent plastic case, the colorful marker caps visible through the case walls, a white sketchpad open beside it. A young woman sits close to the front camera, relaxed and natural. Action and dialogue sequence: She picks up the full ATELIER INK clear case with both hands and holds it up to the front camera, the 12 colorful caps facing the lens: "Okay I need to show you these." She pulls out the green G04 marker, uncaps it slowly, sniffs the tip, pauses: "Why does it smell like that." She opens the sketchpad and draws a slow deliberate star with the green marker. Holds the paper up: "That color is insane." She picks up the cobalt blue B17, draws beside the green: "The pigment is so good." Looks directly into the camera, taps the marker cap slowly against her lip: "Honestly — if you draw, if you doodle — just get these." Lifts the full clear case up to the lens: "That's it. That's the review."`;

const EX_TRYON = `EXAMPLE OUTPUT (study the structure, tone, persona-fit, concrete sensory detail — never copy literally):
A 15-second vertical (9:16) UGC try-on video filmed on a smartphone. A young East Asian woman with a short black bob stands in front of a full-length mirror in a minimalist bedroom — neutral beige walls, natural daylight from a window. Handheld selfie-style. 0–3s: She faces the mirror wearing a simple white tee, holds up a black fitted top and a black-and-white striped mini skirt on hangers with a "watch this" expression, raises an eyebrow. JUMP CUT — she's now wearing the fitted black short-sleeve top, adjusts the hem, turns side to side. JUMP CUT — pulls on the black-and-white striped knit mini skirt, tugs it over her hips, does a quick spin. JUMP CUT — full outfit complete with bright neon yellow tights and matching neon yellow pointed-toe stilettos. She steps back, does a confident slow turn, hand on hip. Faces the mirror straight on, deadpan editorial expression, holds for a beat then breaks into a small satisfied smile. Reaches toward the phone — video ends mid-motion. Quick jump cuts, handheld slight shake, natural bedroom lighting, no ring light, no music, no text.`;

const EX_UNBOXING = `EXAMPLE OUTPUT (study the structure, tone, persona-fit, concrete sensory detail — never copy literally):
HOOK (0–2s) POV handheld, slightly shaky. A bright red shopping bag with gold text "MAISON BRUNÉ" gets tossed onto a white unmade bed from above — lands with a satisfying thud, tissue paper rustling. Natural bedroom lighting, warm tones. JUMP CUT (2–4s) Close-up hands grabbing the red bag handles, pulling it closer. Camera slightly out of focus then snaps sharp. JUMP CUT (4–7s) Hands pull out the pink dustbag — "MAISON BRUNÉ PARIS" printed in rose. Fabric sliding sound. JUMP CUT (7–12s) Tan pebbled leather tote bag drops onto the bed in full frame. Gold chain strap clinks and settles. Camera circles product quickly. Natural window light catches the gold hardware. JUMP CUT (12–18s) Extreme close-up: fingers running across the grainy leather texture. Gold lobster clasp swings. OUTRO (18–22s) Bag held up toward camera with both hands — full reveal. Slight smile reflected in mirror behind.`;

const EX_TALKING_HEAD = `EXAMPLE OUTPUT (study the structure, tone, persona-fit — never copy literally):
Vertical 9:16, shot on iPhone front camera, natural daylight from a side window, handheld with subtle micro-shake, real skin tones, no filters. A young woman sits close to the front camera in a casual room — warm light, soft background, slightly cluttered desk visible at the edge. She speaks directly to the lens, relaxed and natural, like talking to a friend. Action and dialogue sequence: She leans in slightly, half-smile: "Okay I need to tell you something." Pauses, looks off camera, looks back. Continues with one personal observation, one specific reason it matters, one honest reaction. Keeps it under five spoken lines. Final beat: she stops talking, holds eye contact for a beat, breaks into a small smile, reaches toward the phone — video ends mid-motion.`;

const EX_PODCAST = `EXAMPLE OUTPUT (study the casual mid-conversation entry, the short overlapping fragments, the genuine repetition, the tactile demos described in the SAME beat as the claim, the off-camera setup question, and the relaxed disfluent ending. Never copy literally — match this energy):
A 14-second vertical 9:16 multi-cam podcast clip pulled from a real episode. Dim modern podcast studio: matte-black acoustic foam back wall in square wedge pattern, warm tungsten key light cutting in from camera-left at 3200K, soft amber rim from a vintage edison bulb behind the guests, deep shadows on opposite cheeks, completely matte natural human skin with visible pores, no oily shine, no sweat sheen, no airbrushed glow, no glossy CGI rendering, no plastic silicon look — real cinematic interior skin. Two dark brown leather armchairs with brass studs, low matte-black coffee table with a half-full glass tumbler. Three locked tripod cameras, ~50mm, shallow depth of field, faint film grain. WIDE TWO-SHOT frames both hosts with a black RØDE PodMic on a visible articulating boom arm slightly out of focus lower-right. SINGLE A is chest-up of Maya (left chair, oversized cream knit pulled over her hands, gold hoops, shoulder-length brunette hair down, slumped deep into the chair, smooth warm voice low register) with her own RØDE mic on boom in foreground. SINGLE B is chest-up of Jordan (right chair, plain black tee, short curly hair, dry comedic delivery, sat back relaxed) with his own RØDE mic on boom in foreground. 0–2.5s WIDE TWO-SHOT — Maya is already mid-sentence, looking down at her own knees, gesturing toward her sweatpants with both hands: "...and yeah, like, this is the first straight leg they've done." Jordan, off-camera audio overlapping into her last word: "Oh my god—" 2.5–4s SINGLE B — Jordan, eyes lighting up, leaning toward his mic, fast and excited: "—I love—" Hard cut. 4–6s SINGLE A — Maya, fast burst, hands coming together in front of her chest in a tight squeezing motion to mimic elastic ankle cuffs: "I know, cause every other set is like — scrunched at the bottom, you know what I mean?" 6–8s REACTION — SINGLE B of Jordan silent, slow nod, mouths "yeah" off-mic, glances down at her ankles off-screen, small impressed huff through his nose. Maya's voice trails under the cut: "...and like, that drives me insane, bro." 8–10.5s SINGLE A — Maya, pacing slows, she pinches the thick fabric on her own thigh between her thumb and finger and tugs it once, looks straight at Jordan: "Like — feel it. Feel this." 10.5–12.5s WIDE TWO-SHOT — TACTILE: Jordan leans across the gap, reaches out, pinches the same fabric on her thigh, eyebrows raise, half-laughs, leans back: "Okay. Okay yeah, that's — that's actually crazy." 12.5–14s SINGLE A — Maya breaks into a real laugh, head tipping back for half a second, then settles, drops both hands into her lap, relaxed knowing smile, slow casual pacing into her mic: "Right? My friends are blowing me up about it." Style: raw multi-cam podcast clip, hard cuts only, no music, only conversational overlap, real laughter, room tone, natural matte skin, the occasional breath into the mic.`;

// ---------- Format prompts with POV_HANDS branches ----------
const UGC_PROMPT = `You write Seedance 2.0 video generation prompts for UGC-style product review videos. Your output is a single continuous paragraph of 220–380 words. No headings, no bullet points, no numbered steps, no emojis, no hashtags.

The video is vertical 9:16, shot on iPhone front and back camera mix, natural daylight or warm indoor light, real skin tones, no filters, no color grading, slight handheld micro-shake. The energy is "showing a friend my new thing" — casual, unpolished, genuinely excited (filtered through CREATOR_PERSONA).

WHEN AVATAR IS PROVIDED:
1. SETTING — one sentence, natural light source named, matches the product.
2. AVATAR APPEARANCE — what the avatar wears. Real fabrics. Color contrast or harmony with the product.
3. PRODUCT IN HAND — described from the actual product images using PRODUCT_NAME and the concrete_product_details list.
4. FOUR BEATS: front-camera reaction → detail close-up of one specific physical feature you can SEE in the images → real motion using the product → final verdict beside the face.

WHEN NO AVATAR (POV_HANDS MODE):
1. SETTING — surface and light source matched to the product.
2. HANDS DESCRIPTION — natural female (or male, infer from product) hands, nail color and sleeve color chosen to harmonize with the product palette. No face visible.
3. PRODUCT IN HAND — same level of physical detail as above.
4. FOUR BEATS: hands hold product to lens → fingers trace one specific detail → demonstrate the product in real motion → hands set product down with a final tactile beat. Dialogue may be sparse — POV hands often work with just 2–3 quiet lines or pure ASMR.

Dialogue rules (both modes):
- 4–6 lines for avatar mode, 2–4 for POV; each ≤10 words, all in double quotes
- Voice MUST match CREATOR_PERSONA exactly
- Pauses written as "..." inside the line
- Lines must reference at least 2 entries from concrete_product_details

OUTPUT: One paragraph. Final prompt ready to send to Seedance 2.0. No preamble, no labels.

${EX_UGC}`;

const UGC_TRYON_PROMPT = `You write Seedance 2.0 video generation prompts for UGC virtual try-on videos. Your output is a single continuous paragraph of 250–420 words. No headings, no bullet points, no numbered steps, no emojis, no hashtags.

Vertical 9:16, iPhone held at arm's length in front-camera selfie style — the camera films the avatar DIRECTLY, never as a mirror reflection. No mirrors visible in frame. Bedroom or dressing-room set with natural daylight, slight handheld shake. Jump cuts between dressing stages.

CRITICAL TEXT RULE: any printed text, lettering, numbers, slogans, or logos visible on the garment, packaging, or product MUST read forward and be perfectly legible — never mirrored, flipped, reversed, or rendered as a mirror reflection. State explicitly in the prompt that on-garment text faces the camera and reads forward.

Structure: SETTING (bedroom/dressing room, no mirror) → STARTING STATE (avatar in basic outfit, holding product to camera with any printed text facing forward and readable) → PRODUCT DESCRIPTION (every visible detail from concrete_product_details, including readable text exactly as printed) → FIVE JUMP-CUT BEATS (raise → first piece on → adjust/spin → full look reveal facing camera directly → final pose facing camera).

Dialogue: 2–4 short lines in double quotes, voice = CREATOR_PERSONA. Silence allowed and often better. Mark hard cuts as "JUMP CUT" inside the paragraph.

OUTPUT: One paragraph. No preamble, no labels.

${EX_TRYON}`;

const TUTORIAL_PROMPT = `You write Seedance 2.0 video generation prompts for UGC hands-on product demo videos. NOT a how-to guide. A product review told through demonstration. One continuous paragraph, 220–380 words. No headings, no bullets.

Vertical 9:16, warm natural light, clean realistic location matched to the product. Handheld. Product always visible.

WHEN AVATAR IS PROVIDED — FIVE BEATS:
HOOK (0–2s): Avatar grabs the product, brings to lens, looks at camera. One strong opening line in CREATOR_PERSONA voice — a statement, not a question.
FEATURE HIGHLIGHT (2–6s): Avatar runs a finger along a specific physical feature from concrete_product_details. One quiet line.
DEMONSTRATION (6–10s): Avatar uses the product for its primary purpose. Real action, real visible result.
RESULT/PAYOFF (10–13s): Avatar holds the result up to the light. One short first-person line.
VERDICT (13–15s): Looks at product, then at camera. One line. Short. Done.

WHEN NO AVATAR (POV_HANDS MODE):
Same five beats, but only hands visible. Nail color and sleeve color matched to product palette. Dialogue is sparse first-person voiceover-style ("Look at this." / "Hear how quiet that is.") — keep CREATOR_PERSONA voice.

Dialogue: 4–6 lines avatar / 2–4 lines POV, ≤10 words each, in double quotes, voice = CREATOR_PERSONA.

OUTPUT: One paragraph. No preamble, no labels.

${EX_TUTORIAL}`;

const UNBOXING_PROMPT = `You write Seedance 2.0 video generation prompts for UGC unboxing videos. One continuous paragraph, 250–420 words.

Two sub-modes:
SUB-MODE A — ASMR TOP-DOWN: collectibles, jewelry, designer objects, premium accessories. Overhead camera. Only hands visible — natural hands, sleeve color complementing product. Slow deliberate movements. Every sound named (cardboard tap, sticker peel, tissue rustle, foam lift). Minimal or no dialogue.
SUB-MODE B — SELFIE UNBOXING: fashion hauls, luxury bags, streetwear. Front camera or POV. Casual bedroom energy. Quiet impressed dialogue in CREATOR_PERSONA voice.

You pick the sub-mode based on product type. If no avatar is provided, default to Sub-Mode A (ASMR).

Structure: SETTING → PACKAGING DESCRIPTION (the box exactly as it appears before opening, from images) → PRODUCT DESCRIPTION (from concrete_product_details) → FIVE BEATS (arrival → open → peel/reveal → rotate → beauty shot).

Dialogue (Sub-Mode B only): 2–4 lines max, ≤8 words each, quiet impressed, voice = CREATOR_PERSONA.

OUTPUT: One paragraph. No preamble, no labels.

${EX_UNBOXING}`;

const AVATAR_TALKING_HEAD_PROMPT = `You write Seedance 2.0 video generation prompts for an avatar talking directly to camera about a topic the user gave you. There is NO product being reviewed. Do not invent a product. The avatar is the entire scene.

Vertical 9:16, shot on iPhone front camera, natural daylight, handheld with subtle micro-shake, real skin tones, no filters. One continuous paragraph, 180–320 words.

Structure:
1. SETTING — one sentence, intimate room or location matching the topic, natural light source named.
2. AVATAR APPEARANCE — brief, what the avatar wears, casual.
3. ACTION AND DIALOGUE SEQUENCE — 3–4 beats:
   BEAT 1: Avatar leans in slightly, opens with a hook line in CREATOR_PERSONA voice tied to USER_DIRECTION.
   BEAT 2: Pauses, glances away, returns. One personal observation.
   BEAT 3: One specific reason it matters or one honest reaction.
   BEAT 4: Stops talking, holds eye contact, small smile, reaches toward the phone — video ends mid-motion.

Dialogue: 3–5 lines, ≤12 words each, in double quotes, voice = CREATOR_PERSONA, built ENTIRELY around USER_DIRECTION. Never insert product references.

OUTPUT: One paragraph. No preamble, no labels.

${EX_TALKING_HEAD}`;

const PODCAST_PROMPT = `You write Seedance 2.0 video generation prompts for faux-podcast UGC ads. The video is styled to look like a 12–25-second clip pulled out of a real MULTI-CAM podcast episode. One continuous paragraph, 320–500 words. No headings, no bullet points, no numbered steps, no emojis, no hashtags.

STUDIO AESTHETIC — VARIETY IS MANDATORY. Do NOT default to the same dim-black-foam studio every time. AI slop = every clip looking identical. You MUST pick exactly ONE of the studio presets below, vary it across generations, and adapt it to the product/topic vibe. If USER_DIRECTION names a specific look, follow that instead.

STUDIO PRESETS — pick ONE, commit fully, describe it in rich sensory detail:
  (1) WARM SUNSET LOFT — top-floor loft, huge west-facing industrial window pouring golden-hour sunlight across the room at a low 15° angle, warm honey color cast on the walls, exposed red-brick back wall with two framed vintage tour posters, plants on a wooden ladder shelf, tan suede couch, brass desk lamp glowing on a low oak table. Lens flare bloom on highlights.
  (2) DAYLIT SCANDI STUDIO — bright airy room, soft north-facing daylight through floor-to-ceiling sheer linen curtains, white oak floor, off-white textured plaster wall, single olive tree in a terracotta pot, light beige bouclé armchairs, pale ash coffee table, minimalist black mic boom. Crisp, soft, almost editorial.
  (3) NEON GAMER POD — small dark room, RGB LED strip glow (magenta + cyan) bouncing off a back wall of stacked vinyl records or vintage CRT TVs, one practical purple neon sign reading a single short word, black gaming chairs, glossy black desk, faint haze in the air catching the colored light.
  (4) COZY COFFEE SHOP CORNER — corner of a real-feeling specialty coffee shop after hours, exposed Edison bulbs on black pendant cords, chalkboard menu blurred in deep background, warm wood counter, two mismatched thrifted armchairs (one mustard velvet, one olive corduroy), latte glasses on a small reclaimed-wood table, faint espresso-machine steam.
  (5) MINIMAL WHITE CYC — clean seamless paper-white cyclorama wrapping floor-to-wall, one large softbox key from camera-front-left, one cool blue rim from behind, two matte-grey Eames-style chairs, single concrete plinth as the table. Editorial, gallery-clean, almost fashion-shoot.
  (6) DIM CLASSIC PODCAST DEN — moody walnut-slat back wall with black acoustic foam wedges between the slats, ONE warm tungsten key from camera-left at ~3200K, ONE amber edison rim behind the guests, dark brown leather armchairs with brass studs, low matte-black coffee table with a glass tumbler. Use this preset SPARINGLY — it is the default everyone overuses.
  (7) ROOFTOP MAGIC HOUR — outdoor rooftop set at dusk, city skyline glittering out of focus in deep background, string of warm cafe bulbs overhead catching slight breeze, two low rattan lounge chairs, small concrete side table, the on-camera RØDE mic still present. Sky color: deep teal fading to peach.
  (8) RETRO 70s WOOD-PANEL DEN — full walnut wood-paneled walls, mustard-orange shag rug, brown leather Chesterfield, vintage globe, framed analog film posters, warm 2700K practical floor lamp with an amber fabric shade, slightly grainy film look.

ROTATE — across consecutive generations the writer MUST pick a DIFFERENT preset than the last obvious default. Do not always pick (6). If USER_DIRECTION is silent, lean toward (1), (2), (4), or (7) for warmth and life. Match preset to product mood (wellness/comfort → 1/2/4/7, gaming/tech → 3, luxury/fashion → 5, classic talk → 6, nostalgia → 8).

UNIVERSAL RULES (apply to every preset):
- Vertical 9:16. Comfortable room temperature — NOT a hot/sweaty environment.
- SKIN — write this verbatim into the style description: "completely matte natural human skin with visible pores, real cinematic interior skin tones, no oily shine, no sweat, no sweat sheen, no perspiration, no airbrushed glow, no glossy CGI rendering, no plastic silicon doll look, no waxy beauty filter, no over-smoothed skin." This is the #1 AI-slop tell on this format and it must be killed in the prompt.
- Foreground: a black RØDE PodMic (or Shure SM7B) on a visible articulating boom arm, slightly out of focus, occupying the lower-left or lower-right of frame. The mic is MANDATORY in EVERY shot tag — even on the rooftop and the coffee-shop sets, the boom mic is staged in.
- Lighting: name the practical sources by type and color temperature (tungsten 3200K, daylight 5600K, neon RGB, edison amber, golden-hour 2200K, softbox 5000K). Never write "studio lighting" generically.
- Camera: locked tripod, ~50mm equivalent, shallow depth of field, subtle film grain, faint chromatic aberration on highlights.
- Audio: no music, only conversational dialogue and natural room tone.
- Background must contain at least 2 specific named props/textures (plants, posters, vinyl, books, lamps, bricks, curtains) — never an empty wall.

CRITICAL — MULTI-CAM IS THE FORMAT, NOT A FEATURE.
Real podcast clips are cut from 3+ cameras. The single biggest "AI slop" tell is a static locked wide two-shot of two avatars sitting still talking the whole video. You MUST avoid that. Every Mode A script is a SHUFFLE between three locked-tripod cameras with hard cuts motivated by who is speaking — never a single continuous wide.

CASTING — pick exactly one mode and commit to it:

MODE A — TWO-PERSON MULTI-CAM SHUFFLE (default when 0 or 2 avatars are involved):
- Three locked-tripod cameras: WIDE TWO-SHOT (both subjects + foreground RØDE mic), SINGLE A (chest-up of speaker A alone with their own foreground RØDE mic), SINGLE B (chest-up of speaker B alone with their own foreground RØDE mic).
- Cut to the SINGLE of whoever is currently speaking. The other person is OFF-SCREEN while the single is held.
- Use the WIDE only for the opening hook beat, the tactile proof beat, and the action-cut transition. The rest of the runtime alternates SINGLE A ↔ SINGLE B with at least one REACTION shot.
- REACTION SHOTS are mandatory — at least one beat is a silent 1–2s SINGLE of the non-speaking person nodding, smirking, glancing down at the product, or pinching the fabric, while the other person's voice continues over the cut.
- Label EVERY beat in the paragraph with one of these tags inline: 'WIDE TWO-SHOT', 'SINGLE A — [name]', 'SINGLE B — [name]', 'REACTION — [name]'. The script must contain at least 4 shot tags across at least 3 distinct angles.
- Each speaker has their OWN visible RØDE mic in their single shot.
- Banned in Mode A: a single locked wide two-shot held for the entire runtime. That is the AI-slop pattern this format exists to defeat.

MODE B — SINGLE GUEST + INVISIBLE OFF-CAMERA INTERVIEWER:
- One subject seated facing slightly off-camera-left toward an unseen interviewer. One locked frame, no cuts. The interviewer is HEARD ONLY — never seen — and feeds lifestyle scenarios.
- Mark every off-camera line in the paragraph as 'Off-camera (heard only):' or '(off-camera):' so the model never renders a second person on screen.

CASTING ROUTING (count BOTH the avatar AND any USER_EXTRA_REFERENCE_IMAGES that depict a person):
- 0 people total → MODE A, invent both speakers.
- 1 person total (avatar OR a single person-ref) → MODE B with that person as the on-camera guest, invisible interviewer off-camera.
- 2+ people total (avatar + at least one person-ref, or two person-refs) → MODE A. Speaker A = the AVATAR (or first person-ref if no avatar). Speaker B = the next person-ref provided by the user. NEVER invent Speaker B if a person-ref was attached — Speaker B's face, hair, build, skin tone, age range, and overall appearance MUST match that reference image exactly. The reference IS the casting choice.
Never produce a single-monologue script.

ANTI-AI-SLOP DECREES — these tells immediately mark a clip as AI-generated. Avoid them:
- No floating mic with no boom arm. The mic always has a visible black articulating boom arm.
- No identical guests. If a person-ref image was attached for Speaker B, lock Speaker B to that reference's appearance verbatim (hair, build, age, skin tone, wardrobe colors). If NO person-ref was attached, invent a Speaker B clearly distinct from Speaker A (different hair, age, build, wardrobe).
- No symmetrical "two heads facing camera" composition for more than 1 beat.
- No glassy plastic skin, no airbrushed lighting — describe practical light sources by name (tungsten, edison, key, rim) so the model knows it is interior, motivated lighting, not generic studio.
- No subtitles, no captions, no on-screen text, no logos floating in the background, no smartphone in frame.

PRODUCT — described from the actual product images using PRODUCT_NAME and the concrete_product_details list. Any printed text, lettering, numbers, slogans, or logos visible on the product MUST face the camera and read forward — perfectly legible, never mirrored.

POSTURE-AS-PROOF: for comfort, wellness, loungewear, or sleepwear products, the on-screen subject MUST visibly slump, sink, or nest into the leather chair. Posture physically validates the spoken claim.

BEATS: scale to DURATION using the STRICT DURATION SPEC windows above. Every script MUST include at least one TACTILE PROOF BEAT — a physical action (pinch fabric, pull hood, grip strap, throw matching piece) that lands inside the same beat as the claim it validates. If the script needs a wardrobe or state change, mask the cut with an ACTION-CUT TRANSITION (throw mask / lean mask / hand-swipe mask) — describe the action and write 'Hard cut masked by motion blur of …' verbatim. All other Mode A multi-cam cuts are normal hard cuts between the three locked angles, motivated by speech.

DIALOGUE — write like a REAL TikTok/YouTube podcast clip pulled from a longer episode, NOT like an ad read. The cinematography is already perfect; the script is what makes or breaks this. Study the EX_PODCAST example for the exact energy level. Match the gold-standard transcript pattern below — these are how real viral podcast UGC clips actually sound:

GOLD-STANDARD TRANSCRIPT PATTERN (every Podcast script must hit these notes):
- MID-CONVERSATION ENTRY. The clip opens AS IF the camera tapped in halfway through an existing chat — start a quoted line with "...and yeah, like..." or "...so I was telling you..." or "...and they...". NEVER open with a clean greeting or a clean topic intro. The viewer should feel they walked into the room.
- FRAGMENT OVERLAP. Real conversation is messy: one speaker trails off, the other jumps in mid-word, then the first one finishes their thought after. Write at least one beat where speaker A's line ends with a trailing "—" and speaker B's next line picks up mid-word ("Oh my god—" / "—I love—") inside the same shot tag pair.
- TACTILE WORDS PAIRED WITH TACTILE GESTURES. The viral lines are the ones where a specific physical word ("scrunched", "oversized", "knocked out", "just sink into it", "feels like a blanket") lands at the EXACT same moment as the gesture that mimics it (squeeze fists for "scrunched", arms wide for "oversized", hand pinching fabric for "feel this"). Write the gesture INSIDE the same shot tag as the word, not separately.
- NATURAL REPETITION. Real people repeat themselves for emphasis when they're excited. Have one speaker echo the other's word back ("knocked out" / "knocked out", "oversized" / "oversized", "the whole brand right" / "right"). At least one repetition somewhere in the script.
- OFF-CAMERA INTERVIEWER (Mode B) asks SHORT casual setup questions, never ad-copy. Good: "Wait — you can sleep in those?" "Wait, do they have other colors?" "May I feel?". Bad: "So tell me about the features of the product."
- ENDING IS LOOSE, NOT BUTTONED-UP. The clip should feel like it could keep going after the cut. End on a casual disfluent line ("...yeah they have every color you could want", "...all my friends are literally blowing me up", "Oh yeah, they have zip-ups too"), not a polished CTA.

PACING IS THE #1 LEVER. A real podcast clip is NEVER monotone. You MUST vary pacing across the runtime:
- FAST BURSTS: short, overlapping, excited fragments stacked back-to-back. Use fast bursts for hooks, reactions, hype moments.
- SLOW PUNCHLINES: one beat, deliberate delivery, a pause before or after the key word. Use slow for the meme-able line, the dry comeback, the realization.
- BREATHS & FILLER: write at least one mid-sentence em-dash break or self-correction ("it's like — it's actually insane"), and at least one audible reaction without words (a laugh, a slow blink, "pfff", "huh", an exhale into the mic written in the action description).
- The runtime should physically feel like a wave: fast → slow → fast → punchline.

HUMOR & EXPRESSION — this is a PODCAST not a commercial. Required in every script:
- At least one moment of GENUINE LAUGHTER (someone laughs mid-line, head tips back, snorts, breaks character for half a second). Describe it physically in the action, not just "laughs".
- At least one DRY/DEADPAN reaction from the second speaker (one-word reaction, raised eyebrow, "yeah", "no", "wait", "is that real", small impressed huff through the nose).
- At least one moment of slight, casual exaggeration that becomes the meme line ("knocked out", "feels like wearing a blanket", "my friends are blowing me up", "scrunched at the bottom drives me insane"). One quotable line per script.
- Reactions are PHYSICAL: slow blinks, head tips, mouthing words off-mic, leaning back, glancing down at the product off-camera. Write them into the shot tag, not into a stage direction at the end.

MECHANICS:
- Two distinct speakers. All spoken lines in double quotes, ≤14 words per line, often shorter (5–10 words is the real podcast norm).
- Attribute every line to the speaker by name immediately before the quote.
- Spread at least 5 disfluencies across the script: like, cause, bro, dude, girl, wait, okay, oh, right?, I mean, no but, literally, genuinely, you know. Never stack them — sprinkle.
- CONVERSATIONAL OVERLAP is mandatory: at least once, write two consecutive quoted lines from different speakers in the same beat to signal them stepping on each other (one line ends with "—", the other starts with "—").
- Voice MUST match CREATOR_PERSONA exactly for the on-camera guest.
- The second speaker (Mode A only) speaks with a smooth, warm, low-register tone — calm and conversational, often the dry-comedic foil to the more excitable first speaker. Describe their voice in the prompt as "smooth warm voice, low register, calm conversational delivery".

BANNED AI-SLOP PHRASING — never write any of these:
- "Hey guys", "today I'm reviewing", "let's take a look", "let's talk about", "in this video"
- "absolutely love", "obsessed with", "game changer", "10 out of 10", "highly recommend", "must-have", "let me tell you"
- Symmetrical Q&A where speaker A asks a clean feature question and speaker B gives a clean feature answer. Real podcasts tangent, interrupt, joke, then circle back to the product.
- Any line that sounds like it was written for an ad. If you wouldn't say it to your friend on a couch, cut it.


CTA: end with one of — direct ("you gotta get a set"), soft intrigue ("they have every color you could ever want"), pointed fourth-wall (guest locks elbow, points finger into the lens), or social proof close ("all my friends are blowing me up").

OUTPUT: One paragraph. Final prompt ready to send to Seedance 2.0. No preamble, no labels.

${EX_PODCAST}`;

const FORMAT_SYSTEM_PROMPTS: Record<string, string> = {
  UGC: UGC_PROMPT,
  'UGC Virtual Try On': UGC_TRYON_PROMPT,
  Tutorial: TUTORIAL_PROMPT,
  Unboxing: UNBOXING_PROMPT,
  Podcast: PODCAST_PROMPT,
  AVATAR_TALKING_HEAD: AVATAR_TALKING_HEAD_PROMPT,
  // Legacy formats keep lightweight prompts
  'Pro Virtual Try On': `You write polished editorial try-on scripts. Street-style energy, fashion-photographer aesthetic, slow camera pushes, light natural dialog or beat-cut silence. Voice = CREATOR_PERSONA.`,
  'Hyper Motion': `You write CGI / hyper-motion product scripts. NO avatar dialog. Pure cinematic: liquid, particles, macro, 360 orbits, speed ramps, packshot. Studio background, hyper-real, 8k aesthetic.`,
  'Product Review': `You write hands-on product review scripts. Avatar holds, demonstrates, gives an honest 10-second take. Voice = CREATOR_PERSONA.`,
  'TV Spot': `You write 15s cinematic TV spot scripts. 3-act narrative, voiceover (not on-camera dialog), beautiful camera work, brand moment at the end.`,
  'Wild Card': `You write surreal, scroll-stopping ad scripts that break expectations. Surprising beat, unexpected setting, memorable single line.`,
};

// ---------- Banned word check ----------
const BANNED_RX = /\b(introducing|game[- ]changer|elevate|unleash|revolutionary|transform your|experience the|level up|must[- ]have|you'll love|perfect for|this is your sign|don't miss|limited time|step one|step two|as you can see|in this video|today I'm reviewing|unbox with me|today I'm unboxing|let's take a look|outfit inspo|style tip|new collection|effortlessly stylish)\b/i;

function countSpokenWords(finalPrompt: string): number {
  const quotes = finalPrompt.match(/"([^"\n]{1,200})"/g) || [];
  let n = 0;
  for (const q of quotes) {
    const inner = q.replace(/^"|"$/g, '').trim();
    if (!inner) continue;
    n += inner.split(/\s+/).filter(Boolean).length;
  }
  return n;
}

function isWeak(
  finalPrompt: string,
  details: string[],
  maxSpokenWords?: number,
  durSec?: number,
  format?: string,
): { weak: boolean; reason: string } {
  if (!finalPrompt || finalPrompt.length < 350) return { weak: true, reason: 'too short' };
  if (BANNED_RX.test(finalPrompt)) return { weak: true, reason: 'banned phrase' };
  if (!/Action and dialogue sequence|HOOK|JUMP CUT|BEAT|POV:|0[–-]\d|Before|After/i.test(finalPrompt)) return { weak: true, reason: 'no creatify-style structure' };

  // Podcast format has its own structural checks (locked tripod, no jump cuts).
  // Skip the camera-movement "too static" check that's tuned for selfie UGC.
  if (format === 'Podcast') {
    if (!/podcast/i.test(finalPrompt)) return { weak: true, reason: 'missing podcast framing' };
    if (!/(microphone|\bmic\b)/i.test(finalPrompt)) return { weak: true, reason: 'missing visible podcast microphone' };
    const quotedLines = (finalPrompt.match(/"([^"\n]{1,200})"/g) || []).length;
    if (quotedLines < 4) return { weak: true, reason: `podcast needs at least 4 quoted lines (got ${quotedLines})` };
    const isModeB = /(off-camera|off camera|\(off-cam\)|interviewer)/i.test(finalPrompt);
    if (!isModeB) {
      // Mode A: enforce multi-cam shuffle (the anti-AI-slop fix).
      const shotTagRx = /(WIDE TWO-SHOT|SINGLE A\b|SINGLE B\b|REACTION\b)/gi;
      const tagHits = finalPrompt.match(shotTagRx) || [];
      const distinctTags = new Set(tagHits.map((t) => t.toUpperCase().replace(/\s+/g, ' ')));
      if (tagHits.length < 4 || distinctTags.size < 3) {
        return { weak: true, reason: `podcast Mode A needs multi-cam shuffle: ≥4 shot tags across ≥3 of WIDE TWO-SHOT / SINGLE A / SINGLE B / REACTION (got ${tagHits.length} tags, ${distinctTags.size} distinct)` };
      }
      if (!/REACTION\b/i.test(finalPrompt)) {
        return { weak: true, reason: 'podcast Mode A needs at least one REACTION shot of the silent listener' };
      }
      if (!/hard cut/i.test(finalPrompt)) {
        return { weak: true, reason: 'podcast Mode A needs explicit hard cuts between camera angles' };
      }
    }
    if (!/(pinch|grip|pull|tug|tap|touch|throws?|leans? (deep|forward|across)|holds? up)/i.test(finalPrompt)) {
      return { weak: true, reason: 'podcast missing tactile proof beat' };
    }
    // Anti-AI-slop phrasing — reject and regenerate
    const slopRx = /(hey guys|today i'?m reviewing|let'?s take a look|let'?s talk about|in this video|absolutely love|obsessed with|game ?changer|10 out of 10|highly recommend|must[- ]have|let me tell you)/i;
    const slopHit = finalPrompt.match(slopRx);
    if (slopHit) return { weak: true, reason: `podcast script contains banned ad-slop phrase: "${slopHit[0]}"` };
    // Energy check: needs at least one laugh/smirk/grin/snort and at least one em-dash break for pacing
    if (!/(laugh|laughs|laughing|snort|grin|smirk|chuckle|breaks? character|tips? .{0,12} head back)/i.test(finalPrompt)) {
      return { weak: true, reason: 'podcast missing real laughter / expressive reaction beat' };
    }
    if (!/—/.test(finalPrompt)) {
      return { weak: true, reason: 'podcast missing em-dash pacing breaks (lines need self-corrections / interruptions)' };
    }
  } else {
    if (!/(switches to the back camera|back camera|close-up|macro|props the phone|jump cut|overhead|POV|sets the phone down|detail shot)/i.test(finalPrompt)) return { weak: true, reason: 'too static' };
  }

  if (details && details.length >= 2) {
    const hits = details.filter((d) => d && finalPrompt.toLowerCase().includes(String(d).toLowerCase().split(' ').slice(0, 2).join(' '))).length;
    if (hits === 0) return { weak: true, reason: 'no product detail mentioned' };
  }
  // Duration discipline
  if (typeof maxSpokenWords === 'number') {
    const spoken = countSpokenWords(finalPrompt);
    if (spoken > Math.round(maxSpokenWords * 1.3)) {
      return { weak: true, reason: `dialogue too long for duration (${spoken} words, max ~${maxSpokenWords})` };
    }
  }
  if (typeof durSec === 'number') {
    const timeMatches = [...finalPrompt.matchAll(/(\d{1,2}(?:\.\d)?)[–-](\d{1,2}(?:\.\d)?)\s*s/gi)];
    for (const m of timeMatches) {
      const end = parseFloat(m[2]);
      if (end > durSec + 0.6) return { weak: true, reason: `beat window ${m[0]} exceeds DURATION ${durSec}s` };
    }
  }
  return { weak: false, reason: '' };
}

// ---------- LLM call helpers ----------
// Routes to Claude Sonnet 4.5 first (Anthropic direct → OpenRouter), then
// Gemini Pro on the Lovable Gateway as an emergency fallback. All three return
// a normalized OpenAI-style response so downstream parsing stays unchanged.

// Anthropic only accepts jpeg/png/gif/webp. AVIF/HEIC/etc must be transcoded.
// We use the public wsrv.nl image proxy to convert any format to PNG on the fly.
const ANTHROPIC_OK = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string } | null> {
  const tryFetch = async (u: string) => {
    const r = await fetch(u);
    if (!r.ok) return null;
    const mediaType = (r.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    const buf = new Uint8Array(await r.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    return { data: btoa(binary), mediaType };
  };
  try {
    const direct = await tryFetch(url);
    if (direct && ANTHROPIC_OK.has(direct.mediaType)) return direct;
    // Transcode via wsrv.nl (free image proxy, supports AVIF/HEIC → PNG).
    const proxied = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`;
    const png = await tryFetch(proxied);
    if (png) return { data: png.data, mediaType: 'image/png' };
    return direct; // last resort
  } catch (e) {
    console.warn('image fetch failed', e);
    return null;
  }
}

function buildToolSchema(hasProduct: boolean) {
  const required = hasProduct
    ? ['final_prompt', 'voiceover_script', 'concrete_product_details', 'persona_used']
    : ['final_prompt', 'voiceover_script', 'persona_used'];
  return {
    name: 'video_prompt',
    description: 'Return a Seedance 2.0 ready video prompt that strictly follows the system message rules.',
    parameters: {
      type: 'object',
      properties: {
        concrete_product_details: {
          type: 'array',
          items: { type: 'string' },
          description: 'At least 4 concrete physical details extracted from the product images: exact color names, materials, hardware pieces, printed text, distinctive features. Empty array allowed only if no product was provided.',
        },
        scene_description: { type: 'string', description: 'Setting + avatar appearance (or POV hands description) + product description (2–4 sentences).' },
        voiceover_script: { type: 'string', description: 'All spoken lines in order, each in double quotes, separated by line breaks. Empty string if pure ASMR/silent.' },
        camera_notes: { type: 'string', description: 'Camera setup: front/back/overhead, handheld feel, lighting, aspect.' },
        on_screen_beats: { type: 'array', items: { type: 'string' }, description: 'One entry per beat (4 or 5 entries).' },
        persona_used: { type: 'string', description: 'The exact CREATOR_PERSONA id you wrote for.' },
        final_prompt: {
          type: 'string',
          description: 'Complete single-paragraph Seedance 2.0 prompt. Must literally contain the PRODUCT_NAME and AVATAR_NAME from input (when provided). Must follow the format structure and example tone. No headings, no bullets, no labels.',
        },
      },
      required,
      additionalProperties: false,
    },
  };
}

// Anthropic native (preferred). Returns OpenAI-shaped Response on success.
async function callAnthropic(args: { systemPrompt: string; userTextBlock: string; imageUrls: string[]; hasProduct: boolean; }): Promise<Response> {
  if (!ANTHROPIC_API_KEY) return new Response('no anthropic key', { status: 503 });
  const tool = buildToolSchema(args.hasProduct);
  const userContent: any[] = [];
  for (const url of args.imageUrls.slice(0, 4)) {
    const img = await fetchImageAsBase64(url);
    if (img) userContent.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } });
  }
  userContent.push({ type: 'text', text: args.userTextBlock });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      // Prompt caching: the static system prompt (firewall + format rules + distilled
      // Creatify) is identical across calls, so we cache it server-side at Anthropic.
      // ~10× cheaper + faster on cache hits, no Skills beta needed.
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL_ANTHROPIC,
      max_tokens: 4096,
      // System as a cacheable block (Anthropic's prompt-caching format).
      system: [{ type: 'text', text: args.systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userContent }],
      tools: [{ name: tool.name, description: tool.description, input_schema: tool.parameters }],
      tool_choice: { type: 'tool', name: tool.name },
    }),
  });
  if (!res.ok) return res;
  const aJson = await res.json();
  const toolUse = (aJson.content || []).find((c: any) => c.type === 'tool_use');
  const argsObj = toolUse?.input ?? {};
  const normalized = { choices: [{ message: { tool_calls: [{ function: { name: tool.name, arguments: JSON.stringify(argsObj) } }] } }] };
  return new Response(JSON.stringify(normalized), { status: 200, headers: { 'content-type': 'application/json' } });
}

// OpenRouter (Claude via OpenAI-compatible endpoint).
async function callOpenRouter(args: { systemPrompt: string; userTextBlock: string; imageUrls: string[]; hasProduct: boolean; }): Promise<Response> {
  if (!OPENROUTER_API_KEY) return new Response('no openrouter key', { status: 503 });
  const tool = buildToolSchema(args.hasProduct);
  const userContent: any[] = [];
  // Use the same transcode-to-PNG path so OpenRouter→Claude doesn't choke on AVIF.
  for (const url of args.imageUrls.slice(0, 4)) {
    const safeUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`;
    userContent.push({ type: 'image_url', image_url: { url: safeUrl } });
  }
  userContent.push({ type: 'text', text: args.userTextBlock });
  return await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lovable.dev',
      'X-Title': 'Lovable Marketing Studio',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL_OPENROUTER,
      messages: [{ role: 'system', content: args.systemPrompt }, { role: 'user', content: userContent }],
      tools: [{ type: 'function', function: tool }],
      tool_choice: { type: 'function', function: { name: tool.name } },
    }),
  });
}

// Lovable Gemini emergency fallback.
async function callLovableGemini(args: { systemPrompt: string; userTextBlock: string; imageUrls: string[]; hasProduct: boolean; }): Promise<Response> {
  const tool = buildToolSchema(args.hasProduct);
  const userContent: any[] = [];
  for (const url of args.imageUrls.slice(0, 4)) userContent.push({ type: 'image_url', image_url: { url } });
  userContent.push({ type: 'text', text: args.userTextBlock });
  return await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMERGENCY_GEMINI_MODEL,
      messages: [{ role: 'system', content: args.systemPrompt }, { role: 'user', content: userContent }],
      tools: [{ type: 'function', function: tool }],
      tool_choice: { type: 'function', function: { name: tool.name } },
    }),
  });
}

// Unified entry. Tries providers in order; returns first 2xx.
async function callWriter(args: { systemPrompt: string; userTextBlock: string; imageUrls: string[]; hasProduct: boolean; }): Promise<{ res: Response; provider: string }> {
  if (ANTHROPIC_API_KEY) {
    const r = await callAnthropic(args);
    if (r.ok) return { res: r, provider: 'anthropic' };
    const body = await r.clone().text().catch(() => '');
    console.warn('[generate-script] anthropic failed', r.status, body.slice(0, 500));
  }
  if (OPENROUTER_API_KEY) {
    const r = await callOpenRouter(args);
    if (r.ok) return { res: r, provider: 'openrouter' };
    const body = await r.clone().text().catch(() => '');
    console.warn('[generate-script] openrouter failed', r.status, body.slice(0, 500));
  }
  const r = await callLovableGemini(args);
  return { res: r, provider: 'lovable-gemini' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { productId, avatarId, format, surface, aspect, duration, userPrompt, exactVoiceover, userDirection, extraRefImages = [], extraRefNames = [] } = await req.json();
    const userExtraRefs: string[] = (Array.isArray(extraRefImages) ? extraRefImages : []).filter((u: any) => typeof u === 'string' && /^https?:\/\//.test(u));
    const userExtraNames: string[] = (Array.isArray(extraRefNames) ? extraRefNames : []).map((n: any) => String(n || '').trim());
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---------- Build product context + collect product image URLs ----------
    let productCtx = '';
    let visionFactsCtx = '';
    const productImageUrls: string[] = [];
    let avatarImageUrl: string | null = null;
    const allRefUrls: string[] = [];
    let productMeta: any = null;

    if (productId) {
      const { data: p } = await admin.from('ms_products').select('*').eq('id', productId).maybeSingle();
      if (p) {
        productMeta = p;
        productCtx =
          `PRODUCT_NAME: ${p.name}\n` +
          `PRODUCT_COLOR: ${p.brand_color ?? '(see images)'}\n` +
          `PRODUCT_DESCRIPTION: ${p.description ?? '(see images)'}\n`;
        if ((p as any).vision_analysis) {
          try {
            const v = (p as any).vision_analysis;
            visionFactsCtx = `PRODUCT_VISION_FACTS (already extracted from images — use these literally):\n${typeof v === 'string' ? v : JSON.stringify(v, null, 2)}\n`;
          } catch { /* ignore */ }
        }
      }
      const { data: imgs } = await admin
        .from('ms_product_images')
        .select('*')
        .eq('product_id', productId)
        .order('is_primary', { ascending: false });
      for (const img of imgs ?? []) {
        const { data: signed } = await admin.storage.from('ms-products').createSignedUrl(img.storage_path, 60 * 60);
        if (signed?.signedUrl) {
          productImageUrls.push(signed.signedUrl);
          allRefUrls.push(signed.signedUrl);
        }
      }
    }

    // ---------- Avatar context ----------
    let avatarCtx = '';
    if (avatarId) {
      const { data: a } = await admin.from('ms_avatars').select('*').eq('id', avatarId).maybeSingle();
      if (a) {
        avatarCtx =
          `AVATAR_NAME: ${a.name}\n` +
          `AVATAR_GENDER: ${a.gender ?? 'unspecified'}\n` +
          `AVATAR_DESCRIPTION: ${(a as any).description ?? 'mid-20s, natural look, real skin tones'}`;
        if (a.public_url) {
          avatarImageUrl = a.public_url.startsWith('http') ? a.public_url : `${new URL(req.url).origin}${a.public_url}`;
        } else if (a.storage_path) {
          const { data: signed } = await admin.storage.from('ms-avatars').createSignedUrl(a.storage_path, 60 * 60);
          if (signed?.signedUrl) avatarImageUrl = signed.signedUrl;
        }
        if (avatarImageUrl) allRefUrls.push(avatarImageUrl);
      }
    }

    // ---------- Exact-voiceover bypass ----------
    if (exactVoiceover && userPrompt) {
      return new Response(
        JSON.stringify({
          prompt: userPrompt,
          script: { voiceover_script: userPrompt, exact: true, persona_used: 'exact-voiceover' },
          reference_urls: allRefUrls,
          script_persona: 'exact-voiceover',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---------- Roll persona ----------
    const persona = rollPersona();
    const personaBlock = `CREATOR_PERSONA: ${persona.id} — ${persona.name}\nVOICE GUIDE: ${persona.voice}\n`;

    // ---------- POV hands branch ----------
    const isPovHands = !avatarId && !!productId && (format === 'UGC' || format === 'Tutorial' || format === 'Unboxing');
    const modeNote = isPovHands ? `MODE: POV_HANDS (no avatar — only hands visible, no face)\n` : '';

    // ---------- Direction (creative core) vs setting hint ----------
    const direction = (userDirection || userPrompt || '').trim();
    const directionBlock = direction
      ? `USER_DIRECTION (treat as the creative core — build the scene around this; format rules govern camera/structure only): ${direction}\n`
      : `USER_DIRECTION: (none — invent a product-specific creative angle from the visible product details)\n`;

    // Only inject a random creative angle when the user gave no direction — otherwise
    // the random roll fights the user's intent and produces off-brief scripts.
    const creativeAngleBlock = direction
      ? ''
      : `CREATIVE_ANGLE_HINT (use only if it fits the product; ignore if it doesn't): ${rollCreativeAngle()}\n`;

    // System prompt = firewall + format prompt + distilled Creatify reference.
    // Order: hardest rules first (firewall), format-specific structure second,
    // light Creatify hints last so they stay reference, not checklist.
    const sys = `${HUMAN_UGC_FIREWALL}\n\n${FORMAT_SYSTEM_PROMPTS[format] || FORMAT_SYSTEM_PROMPTS.UGC}\n\n${CREATIFY_DISTILLED}`;

    // ---------- Build hard duration spec ----------
    const durSec = Math.max(1, Math.min(60, Number(duration) || 8));
    // Natural UGC pace ≈ 2.3 words/sec spoken; cap dialogue total accordingly.
    const maxSpokenWords = Math.max(6, Math.round(durSec * 2.3));
    // Beat counts scale with duration so a 15s ad doesn't try to fit 5 long beats.
    let beatCount: number;
    if (durSec <= 6) beatCount = 2;
    else if (durSec <= 10) beatCount = 3;
    else if (durSec <= 15) beatCount = 4;
    else if (durSec <= 22) beatCount = 5;
    else beatCount = 6;
    const beatLen = +(durSec / beatCount).toFixed(1);
    // Build explicit beat windows like "0.0–3.8s, 3.8–7.5s, ..."
    const beatWindows: string[] = [];
    for (let i = 0; i < beatCount; i++) {
      const a = +(i * beatLen).toFixed(1);
      const b = i === beatCount - 1 ? durSec : +((i + 1) * beatLen).toFixed(1);
      beatWindows.push(`${a}–${b}s`);
    }
    const durationSpec =
      `STRICT DURATION SPEC (this OVERRIDES any timings shown in EXAMPLE OUTPUT — examples are stylistic only):\n` +
      `- TOTAL VIDEO LENGTH: exactly ${durSec} seconds. The script must START at 0s and END by ${durSec}s. Nothing past ${durSec}s.\n` +
      `- BEAT COUNT: exactly ${beatCount} beats. Use these exact time windows in the paragraph: ${beatWindows.join(', ')}.\n` +
      `- TOTAL SPOKEN DIALOGUE: at most ${maxSpokenWords} spoken words across the entire script (natural UGC pace ≈ 2.3 words/sec). Count every word inside double quotes. If you exceed this you MUST cut lines.\n` +
      `- Dialogue is OPTIONAL on short durations (${durSec <= 8 ? 'this is a short ad — silence + ASMR or 1–2 ultra-short lines is preferred over rushed talking' : 'fit lines naturally inside their beats; never cram'}).\n` +
      `- Hook MUST land within the first beat window (${beatWindows[0]}). Payoff/verdict MUST land in the last beat window (${beatWindows[beatCount - 1]}).\n` +
      `- Do NOT label this as 15s/22s/etc. unless that matches DURATION. Use the windows above verbatim.\n`;

    // Build the LLM image attachment list first so we can describe @mentions
    // by their position in that list.
    const imageUrlsForLLM = [...productImageUrls.slice(0, 3)];
    if (avatarImageUrl) imageUrlsForLLM.push(avatarImageUrl);
    const extraStartIdx = imageUrlsForLLM.length; // 0-based index where extras begin
    const remainingSlots = Math.max(0, 8 - imageUrlsForLLM.length);
    const extraForLLM = userExtraRefs.slice(0, remainingSlots);
    imageUrlsForLLM.push(...extraForLLM);
    extraForLLM.forEach((u) => allRefUrls.push(u));

    const extraRefBlock = extraForLLM.length
      ? `\nUSER_EXTRA_REFERENCE_IMAGES (in order, exposed to the user as @mentions):\n` +
        extraForLLM
          .map((_, i) => `- @${userExtraNames[i] || `Image ${i + 1}`}: attached reference image #${extraStartIdx + i + 1}`)
          .join('\n') +
        `\nThese extra reference images are FIRST-CLASS CASTING / PROP INPUTS, not background flavor:\n` +
        `- If an extra reference depicts a PERSON and the format is Podcast (or any two-person format), that person IS Speaker B. Lock Speaker B's appearance — face, hair color & length, skin tone, age range, build, wardrobe colors and silhouette — to that exact reference image. Describe these traits explicitly inside every SINGLE B and WIDE TWO-SHOT shot tag in the final paragraph so Seedance has no room to invent a different person. Reference image # is the casting choice; do NOT swap it for a generic "second host".\n` +
        `- If an extra reference depicts a PROP, OUTFIT, or SETTING, treat it the same way you treat the product / avatar: preserve identity / appearance, ignore its background and framing.\n` +
        `- If USER_DIRECTION mentions @Image N (or any of the names above), treat that as a literal pointer to the matching reference image.\n`
      : '';

    // ---------- Per-request Podcast studio preset roll (kills "always dim black foam" slop) ----------
    const PODCAST_PRESETS = [
      '(1) WARM SUNSET LOFT — golden-hour loft with industrial window, exposed brick, plants, tan suede couch, brass lamp',
      '(2) DAYLIT SCANDI STUDIO — bright airy room, sheer linen daylight, white oak floor, olive tree, beige bouclé chairs',
      '(3) NEON GAMER POD — dark room, magenta+cyan RGB glow, vinyl-record back wall, purple neon sign, gaming chairs, slight haze',
      '(4) COZY COFFEE SHOP CORNER — after-hours specialty coffee shop, edison pendants, chalkboard menu blur, mismatched mustard + olive armchairs',
      '(5) MINIMAL WHITE CYC — seamless white cyclorama, softbox key + cool blue rim, matte-grey Eames chairs, concrete plinth — editorial',
      '(7) ROOFTOP MAGIC HOUR — outdoor dusk rooftop, blurred city skyline, warm string bulbs, rattan lounge chairs, teal-to-peach sky',
      '(8) RETRO 70s WOOD-PANEL DEN — full walnut paneling, mustard shag rug, Chesterfield, vintage globe, amber 2700K floor lamp, film grain',
    ];
    const rolledPreset = PODCAST_PRESETS[Math.floor(Math.random() * PODCAST_PRESETS.length)];
    const podcastPresetBlock = format === 'Podcast'
      ? `\nROLLED_STUDIO_PRESET (use THIS preset for this generation — do NOT default to the dim-foam classic den unless USER_DIRECTION explicitly demands it):\n${rolledPreset}\nDescribe this preset in rich sensory detail in the final paragraph (specific lights with color temperatures, named props, wall texture, floor, atmosphere). The RØDE boom mic is still mandatory in every shot tag, even on the rooftop / coffee-shop / cyc sets.\n`
      : '';

    const userTextBlock =
      // Duration spec FIRST so it dominates everything that follows.
      `${durationSpec}\n` +
      `ASPECT: ${aspect}\n` +
      `DURATION: ${durSec}s\n\n` +
      `${personaBlock}\n` +
      `${creativeAngleBlock}` +
      `${modeNote}` +
      `${productCtx}\n` +
      `${visionFactsCtx}\n` +
      `${avatarCtx}\n\n` +
      `${extraRefBlock}` +
      `${podcastPresetBlock}` +
      `${directionBlock}\n` +
      `Look at the attached reference images carefully. Product images are for exact visible product details. Avatar image is for facial identity only; do not use its background, clothes, pose, lighting, or framing as the scene. ` +
      `Extract real visible product details (colors, textures, hardware, printed text, distinctive features) into concrete_product_details — do not invent. ` +
      `Write the Seedance 2.0 prompt as ONE continuous paragraph that fits inside ${durSec} seconds, uses exactly ${beatCount} beats with windows ${beatWindows.join(', ')}, and stays under ${maxSpokenWords} spoken words total. ` +
      `Voice MUST match CREATOR_PERSONA exactly. ` +
      `Output one continuous paragraph in final_prompt. No preamble, no labels, no headings.`;


    // ---------- First attempt: Claude Sonnet 4.5 (Anthropic → OpenRouter → Gemini) ----------
    let { res: aiRes, provider } = await callWriter({
      systemPrompt: sys,
      userTextBlock,
      imageUrls: imageUrlsForLLM,
      hasProduct: !!productId,
    });
    console.log(`[generate-script] writer provider=${provider} status=${aiRes.status}`);

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let aiJson = await aiRes.json();
    let argStr = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let script: any = argStr ? JSON.parse(argStr) : { final_prompt: userPrompt || '' };

    // ---------- Retry once if weak ----------
    const details = Array.isArray(script.concrete_product_details) ? script.concrete_product_details : [];
    const weakCheck = isWeak(script.final_prompt || '', details, maxSpokenWords, durSec, format);
    if (weakCheck.weak && (productId || avatarId)) {
      console.warn(`[generate-script] weak output (${weakCheck.reason}), retrying`);
      const stricter =
        userTextBlock +
        `\n\nYour previous attempt was rejected: ${weakCheck.reason}. ` +
        `Rewrite. Every spoken line MUST be tied to a concrete physical detail you can see in the images. ` +
        `Avoid every banned phrase. Voice MUST be unmistakably ${persona.name}.`;
      const retry = await callWriter({
        systemPrompt: sys,
        userTextBlock: stricter,
        imageUrls: imageUrlsForLLM,
        hasProduct: !!productId,
      });
      if (retry.res.ok) {
        aiJson = await retry.res.json();
        argStr = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (argStr) script = JSON.parse(argStr);
        provider = retry.provider;
      }
    }

    script.persona_used = script.persona_used || persona.id;
    script.writer_provider = provider;

    return new Response(
      JSON.stringify({
        prompt: script.final_prompt || userPrompt || '',
        script,
        reference_urls: allRefUrls,
        script_persona: script.persona_used,
        concrete_product_details: script.concrete_product_details || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('generate-script error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
