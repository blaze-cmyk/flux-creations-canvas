import { MSAspect, MSDuration, MSMode } from '@/store/marketingStudioStore';

export interface FormatPreset {
  mode: MSMode;
  prompt: string;
  duration: MSDuration;
  aspect: MSAspect;
  productThumb?: string;
  avatarThumb?: string;
  productName?: string;
  avatarName?: string;
}

const HYPER_MOTION_CHOCOLATE = `chocolate japanese style commercial, with chocolate crunching, pieces breaking, hands passing chocolate to each other, japanese happy people smiling while biting, and these little characters animated`;

const HYPER_MOTION_SNEAKER = `High-energy cinematic product commercial. Molten liquid silver flows and swirls elegantly in mid-air, pouring into a sleek silver chrome sneaker. The liquid chrome ripples across the shoe's surface, filling the textures like molten metal. Dynamic camera movements: extreme macro tracking shots of the fluid, aggressive 360-degree orbits around the sneaker, and fast whip pans. Speed ramping transitions: slow-motion liquid flow followed by fast motion reveals. Vibrant green studio background with professional lighting and subtle lens flares. The video concludes with a smooth match-cut transition to a final packshot of the bright green shoe box sitting on a polished, reflective surface. High-end 3D liquid simulation, 8k resolution, hyper-realistic, polished aesthetic.`;

const UNBOXING_FROGGY = `@Froggy Prince @Mia VIDEO  — 10-second vertical (9:16) satisfying ASMR unboxing of "FROGGY PRINCE" by "MELON STUDIO × PLAY PALS"
Product: A cute vinyl art toy figure — a chubby character wearing a green frog costume hoodie with a small red felt crown on top. Big black sparkly eyes with white star highlights, rosy pink cheeks, open happy smile. Orange bow tie, red heart on the belly, white boots with red heart details. Comes in a square pastel-yellow box with green lid, plus collectible art cards.
Format: Overhead top-down camera looking straight down at a light wooden desk surface. Only hands visible — female hands, short natural nails, cozy oversized sage-green sweater sleeves. Warm soft natural lighting from a window on the left. Slow, deliberate, ASMR-style movements.
Scene 1 — Box Tap + Open (0–3s): The sealed yellow-and-green square box sits centered on the wooden desk. The illustrated Froggy Prince character is visible on the front — a cute kid in a frog hoodie with "Froggy Prince" in playful green cursive and "MELON STUDIO × PLAY PALS" below. Fingers tap the box lid three times — satisfying hollow cardboard thuds. Then both hands grip the green lid and lift it straight up slowly — revealing white tissue paper inside with a small round green sticker seal. The lid is placed to the right.
Scene 2 — Tissue Peel + Figure Reveal (3–6s): Fingers peel the green sticker seal (satisfying crisp peel sound), then pull the tissue paper apart to reveal the Froggy Prince figure nestled in a shaped foam insert. A brief pause — the figure sits snugly in its cutout, the red felt crown, glossy green body, and pink cheeks immediately visible. One hand lifts the figure out gently, holds it up at center frame, and rotates it slowly — showing the front face (big star eyes, open smile), the orange bow tie, the red heart on the belly, and the little white boots. The vinyl surface catches the warm light with a soft glossy sheen.
Scene 3 — Cards + Final Display (6–10s): The figure is placed standing upright on the desk. Hands reach back into the box and pull out two square art cards stacked together. The first card (orange background, sparkle details) is slid to the left — showing the illustrated Froggy Prince character with "FROGGY PRINCE" in bold blue retro text. The second card (pink background, heart frame) is slid to the right — showing the character inside a rainbow heart. Both cards are tapped once into alignment on the desk. Final arrangement: the figure standing center on the wooden desk, the open box behind it, the green lid leaning against the box showing the illustrated front, both art cards fanned in front. Hands pull away. Hold the beauty shot for 1.5 seconds — warm light, cozy desk, the little frog prince smiling at camera.
Overall style: Cozy ASMR unboxing for Xiaohongshu/TikTok. Top-down overhead, no face, only hands. Every sound is crisp and amplified: cardboard tap, sticker peel, tissue rustle, vinyl figure lifted from foam, cards sliding on wood. No music — pure ASMR sounds only. Warm natural daylight, light wooden surface, sage-green sweater sleeves for color harmony with the frog character. Slow, satisfying, tactile. Vertical 9:16. Designer toy collector aesthetic.`;

const UGC_TENNIS = `@Aura 300 @Zoe Vertical 9:16 selfie-style UGC tennis racket review, shot on iPhone front and back camera mix, natural daylight on an outdoor tennis court, handheld authentic energy, casual "showing a friend my new racket" vibe, warm natural light, real skin tones, no filters
An outdoor tennis court — green or blue hard court surface with white lines, a net visible in the background, natural daylight, open sky above. The young woman wears a bright lime green tennis outfit — a fitted lime green sleeveless tennis dress or matching lime green tennis top and skirt, the vivid green a striking contrast against the mint green and orange of the AURA 300 racket; she holds the SERA AURA 300 tennis racket — mint green to white gradient frame, orange cross-string pattern through the white string face, white perforated grip tape, AURA 300 lettering on the shaft, a mint green butt cap at the handle end.
Action and dialogue sequence:
She holds the AURA 300 up to the front camera with one hand, the full racket face filling the vertical frame, her bright lime green sleeve visible at the edge of the frame, the mint green frame and the orange string pattern sharp in the daylight: she tilts it slowly catching the sun across the surface, speaking naturally: "Okay so this just arrived and I am obsessed with the color." She flips it to show the back face, then tilts to show the mint-to-white gradient on the shaft where AURA 300 is printed, the lime green of her outfit creating a vivid color contrast beside the racket.
She switches to the back camera. Holds the racket out at arm's length, the lime green dress visible in the frame, and bounces the racket lightly on her palm: "It feels really balanced, like not too heavy." She brings the racket close to the back lens so the orange cross-string pattern fills the frame — the individual string intersections sharp, the orange against white vivid in the open daylight.
She props the phone against her bag or the court fence pointing toward her. She bounces a ball and hits two slow controlled groundstrokes toward the net — the bright lime green outfit and the mint AURA 300 frame moving through the frame together on each swing, the two greens catching the daylight differently, the racket head tracking cleanly through the air. She picks the phone back up.
Close-up back camera shot — she holds the racket face close to the lens, the orange string mesh filling the vertical frame, then slowly pans down the shaft past the AURA 300 lettering to the white grip tape, her lime green sleeve visible at the top of the frame, her fingers wrapping the grip naturally: "And the grip feels so good, really clean." She holds the full racket up one final time beside her face on the front camera — bright lime green outfit, mint green racket, orange strings — smiles directly into the lens: "Yeah. Yeah this is the one."`;

const UGC_GLITTERCASE = `@Glitter Case @Lia Vertical 9:16 selfie-style UGC phone case review, shot on iPhone front and back camera mix, warm natural indoor light, soft cozy energy, casual "showing a friend my new case" vibe, real skin tones, no filters, intimate low-key mood
A bright casual room — warm natural light from the side, a clean surface or bed behind her, soft and cozy atmosphere. The young woman holds the clear glitter liquid phone case — a transparent hard shell case with a rainbow iridescent border trim, filled with liquid glitter and confetti stars in pastel and holographic colors, and a collection of tiny 3D charms resting at the bottom: two yellow smiley face emojis, a white unicorn, a blue car, a pink car, a purple car, a yellow rubber duck, a green cactus, a blue dinosaur — all floating and shifting when the case moves.
Action and dialogue sequence:
She holds the case up to the front camera with both hands, the clear front facing the lens, the rainbow border catching the warm room light: she says nothing for a beat — just slowly tilts the case left, and all the tiny charms and glitter drift together to the side in the liquid. She tilts it right, they drift back. She looks at the camera with wide eyes: "Wait. Wait look at this."
She tilts the case again slowly, the camera close on the front face, the charms tumbling through the glitter liquid in slow motion — the smiley faces, the unicorn, the rubber duck all visible shifting through the holographic confetti stars. She brings it even closer to the front lens so the charms fill the frame: "There is a dinosaur in here. And a duck. WHY is there a duck."
She switches to the back camera, holds the case flat and then tips it vertically — the charms and glitter cascade downward through the liquid in a slow satisfying drift, the rainbow border glowing in the warm light, the holographic stars catching every shift of light. She tilts it back the other way, the whole contents drifting again: "I cannot stop doing this."
She props the phone and holds the case up with both hands, shaking it gently — the glitter and charms swirl in all directions, the liquid catching the light in shifting rainbow patches, the tiny 3D charms tumbling through. She looks at the camera, shakes it once more slowly: "This is genuinely the most satisfying thing I own right now." She holds it still beside her face on the front camera, the rainbow border glowing, smiles directly into the lens: "That's it. That's the review."`;

const UGC_TRYON_STAR = `@Star Set @Ruby Style: UGC, get ready with me, iPhone front camera, fashion vlog, playful energy

A stylish young girl is filming herself in her room while getting dressed. The room is aesthetic — mirror, clothes, soft natural daylight, slight creative mess.

Shot on iPhone front camera, vertical 9:16, natural HDR, slight handheld movement, real skin tones, no color grading.

Outfit is laid out or partially worn: white top with red stars, camo skirt, bold red furry boots.

She walks into frame adjusting her top, looks into camera: "Okay, I'm getting ready and I don't know if this outfit is crazy or—"

Suddenly, someone (guy/friend) walks into frame casually from the side. She immediately reacts, pushes him out of frame: "Hey— no, get out!" She laughs.

She turns back to camera like nothing happened: "Anyway… I kinda love it."

She steps back slightly to show full outfit.

"It's a little chaotic…"
"But it works."

She poses slightly: "I'm wearing this."

Natural messy UGC vibe, playful interruption moment, confident energy, full body outfit visible, light humor.`;

const UNBOXING_BIKE = `@Spin Bike @Ellie Style: UGC, gym vlog, iPhone front camera, real effort, natural energy

A young girl is filming herself in a modern aesthetic gym, people training in the background.

Shot on iPhone front camera, vertical 9:16, slight shake, real gym lighting, no grading.

She is pedaling on a pastel stationary bike, already slightly tired.

She is breathing heavily and speaking directly while working out.

"Okay… I thought this was gonna be easy…"
(breathing heavily)
"It's not."
She laughs.
"But it's actually so good."`;

const UGC_TRYON_LOTUS = `@Lotus Set @Suki dynamic try-on moment — soft daylight bathroom, she steps into frame in the cream silk lotus-print pajama set, runs her hands down the fabric, twirls once so the sleeves catch the light, looks back at camera with a small confident smile. Natural sound, real skin tones, vertical 9:16, iPhone front camera, no color grading.`;

const TUTORIAL_NUDELAB = `@Nude Lab Authentic amateur-style UGC in a bright bathroom: white tiles, soft natural daylight from a window, real-life details (folded towel, small plant, simple ceramics). Handheld feel with subtle micro-shake, natural smartphone-lens look, no cinematic grading. Feels like a real girl filming a quick clip for friends. The phone, camera, and any mirror reflection of a phone or hands holding a phone must never be visible. No mirrors showing the filming setup at all — if a mirror appears, it only shows her face and the room, never a device.
0–2s — Visual hook: Extreme close-up of the girl's face, slightly off-center, lit by soft window light. She leans in fast with wide surprised eyes and a half-smile, like she just noticed something amazing on her skin. Natural ambient sound: faint water drip + her soft excited "okay wait—". Tiny handheld wobble. No on-screen text.
2–4s: Quick cut — her hand brings @Nude Lab up next to her cheek, turning it once so the label catches the light. She says in casual upbeat American English: "I literally cannot believe how good this is."
4–7s: Tight close-up of her hands applying @Nude Lab to her skin — real texture, real motion, product visibly going on. Soft bathroom room tone. Voiceover: "Look how it just melts in — my skin already feels insane."
7–10s: Medium shot of her face and shoulders, soft daylight, she touches the area where she applied it and turns her face gently side to side in the light to show the glow. Small natural giggle. Says: "Okay, I'm obsessed. I'm not going back."
10–12s: Final close-up: both hands hold @Nude Lab up near her face, she gives a small playful shrug and a genuine smile, clip ends mid-motion like a real social post.
Audio: Only her voice + natural bathroom room tone (faint water, soft tile echo). No music, no sound effects, no narrator. Voice: warm, friendly, mid-20s American accent, conversational, natural breaths and pauses.`;

// Keyed by FormatCard id from MarketingStudio.tsx
export const FORMAT_PRESETS: Record<string, FormatPreset> = {
  f1: {
    mode: 'Hyper Motion',
    prompt: HYPER_MOTION_CHOCOLATE,
    duration: '12s',
    aspect: '16:9',
  },
  f2: {
    mode: 'Unboxing',
    prompt: UNBOXING_FROGGY,
    duration: '10s',
    aspect: '9:16',
    productThumb: '/formats/preset-product-froggy.png',
    avatarThumb: '/formats/preset-avatar-pinkcap.png',
    productName: 'Froggy Prince',
    avatarName: 'Mia',
  },
  f3: {
    mode: 'Hyper Motion',
    prompt: HYPER_MOTION_SNEAKER,
    duration: '12s',
    aspect: '16:9',
  },
  f4: {
    mode: 'UGC',
    prompt: UGC_TENNIS,
    duration: '15s',
    aspect: '9:16',
    avatarThumb: '/formats/preset-avatar-red.png',
    productName: 'Aura 300',
    avatarName: 'Zoe',
  },
  f5: {
    mode: 'UGC',
    prompt: UGC_GLITTERCASE,
    duration: '15s',
    aspect: '9:16',
    productThumb: '/formats/preset-product-glittercase.png',
    avatarThumb: '/formats/preset-avatar-pinkhenley.png',
    productName: 'Glitter Case',
    avatarName: 'Lia',
  },
  f6: {
    mode: 'UGC Virtual Try On',
    prompt: UGC_TRYON_STAR,
    duration: '12s',
    aspect: '9:16',
    productThumb: '/formats/preset-product-staroutfit.png',
    avatarThumb: '/formats/preset-avatar-beret.png',
    productName: 'Star Set',
    avatarName: 'Ruby',
  },
  f7: {
    mode: 'Unboxing',
    prompt: UNBOXING_BIKE,
    duration: '12s',
    aspect: '9:16',
    productThumb: '/formats/preset-product-bike.png',
    avatarThumb: '/formats/preset-avatar-blonde.png',
    productName: 'Spin Bike',
    avatarName: 'Ellie',
  },
  f8: {
    mode: 'UGC Virtual Try On',
    prompt: UGC_TRYON_LOTUS,
    duration: '10s',
    aspect: '9:16',
    productThumb: '/formats/preset-product-toothbrush.jpg',
    avatarThumb: '/formats/preset-avatar-lotuspj.jpg',
    productName: 'Lotus Set',
    avatarName: 'Suki',
  },
  f9: {
    mode: 'Tutorial',
    prompt: TUTORIAL_NUDELAB,
    duration: '12s',
    aspect: '9:16',
    productThumb: '/formats/preset-product-nudelab.jpg',
    avatarThumb: '/formats/preset-avatar-bathroom.jpg',
    productName: 'Nude Lab',
    avatarName: 'Ava',
  },
};

export const RECREATE_EVENT = 'ms:recreate';

export function dispatchRecreate(preset: FormatPreset) {
  window.dispatchEvent(new CustomEvent<FormatPreset>(RECREATE_EVENT, { detail: preset }));
}
