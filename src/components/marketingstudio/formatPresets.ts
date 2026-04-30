import { MSAspect, MSDuration, MSMode } from '@/store/marketingStudioStore';

export interface FormatPreset {
  mode: MSMode;
  prompt: string;
  duration: MSDuration;
  aspect: MSAspect;
  productThumb?: string;
  avatarThumb?: string;
}

const HYPER_MOTION_CHOCOLATE = `chocolate japanese style commercial, with chocolate crunching, pieces breaking, hands passing chocolate to each other, japanese happy people smiling while biting, and these little characters animated`;

const HYPER_MOTION_SNEAKER = `High-energy cinematic product commercial. Molten liquid silver flows and swirls elegantly in mid-air, pouring into a sleek silver chrome sneaker. The liquid chrome ripples across the shoe's surface, filling the textures like molten metal. Dynamic camera movements: extreme macro tracking shots of the fluid, aggressive 360-degree orbits around the sneaker, and fast whip pans. Speed ramping transitions: slow-motion liquid flow followed by fast motion reveals. Vibrant green studio background with professional lighting and subtle lens flares. The video concludes with a smooth match-cut transition to a final packshot of the bright green shoe box sitting on a polished, reflective surface. High-end 3D liquid simulation, 8k resolution, hyper-realistic, polished aesthetic.`;

const UNBOXING_FROGGY = `@product:af95ff68-042b-45b0-b46c-2b2728a85bb1 @avatar:ffc8862b-0b8a-485c-88e1-f89196d3dc10 VIDEO  — 10-second vertical (9:16) satisfying ASMR unboxing of "FROGGY PRINCE" by "MELON STUDIO × PLAY PALS"
Product: A cute vinyl art toy figure — a chubby character wearing a green frog costume hoodie with a small red felt crown on top. Big black sparkly eyes with white star highlights, rosy pink cheeks, open happy smile. Orange bow tie, red heart on the belly, white boots with red heart details. Comes in a square pastel-yellow box with green lid, plus collectible art cards.
Format: Overhead top-down camera looking straight down at a light wooden desk surface. Only hands visible — female hands, short natural nails, cozy oversized sage-green sweater sleeves. Warm soft natural lighting from a window on the left. Slow, deliberate, ASMR-style movements.
Scene 1 — Box Tap + Open (0–3s): The sealed yellow-and-green square box sits centered on the wooden desk. The illustrated Froggy Prince character is visible on the front — a cute kid in a frog hoodie with "Froggy Prince" in playful green cursive and "MELON STUDIO × PLAY PALS" below. Fingers tap the box lid three times — satisfying hollow cardboard thuds. Then both hands grip the green lid and lift it straight up slowly — revealing white tissue paper inside with a small round green sticker seal. The lid is placed to the right.
Scene 2 — Tissue Peel + Figure Reveal (3–6s): Fingers peel the green sticker seal (satisfying crisp peel sound), then pull the tissue paper apart to reveal the Froggy Prince figure nestled in a shaped foam insert. A brief pause — the figure sits snugly in its cutout, the red felt crown, glossy green body, and pink cheeks immediately visible. One hand lifts the figure out gently, holds it up at center frame, and rotates it slowly — showing the front face (big star eyes, open smile), the orange bow tie, the red heart on the belly, and the little white boots. The vinyl surface catches the warm light with a soft glossy sheen.
Scene 3 — Cards + Final Display (6–10s): The figure is placed standing upright on the desk. Hands reach back into the box and pull out two square art cards stacked together. The first card (orange background, sparkle details) is slid to the left — showing the illustrated Froggy Prince character with "FROGGY PRINCE" in bold blue retro text. The second card (pink background, heart frame) is slid to the right — showing the character inside a rainbow heart. Both cards are tapped once into alignment on the desk. Final arrangement: the figure standing center on the wooden desk, the open box behind it, the green lid leaning against the box showing the illustrated front, both art cards fanned in front. Hands pull away. Hold the beauty shot for 1.5 seconds — warm light, cozy desk, the little frog prince smiling at camera.
Overall style: Cozy ASMR unboxing for Xiaohongshu/TikTok. Top-down overhead, no face, only hands. Every sound is crisp and amplified: cardboard tap, sticker peel, tissue rustle, vinyl figure lifted from foam, cards sliding on wood. No music — pure ASMR sounds only. Warm natural daylight, light wooden surface, sage-green sweater sleeves for color harmony with the frog character. Slow, satisfying, tactile. Vertical 9:16. Designer toy collector aesthetic.`;

const UGC_TENNIS = `Vertical 9:16 selfie-style UGC tennis racket review, shot on iPhone front and back camera mix, natural daylight on an outdoor tennis court, handheld authentic energy, casual "showing a friend my new racket" vibe, warm natural light, real skin tones, no filters
An outdoor tennis court — green or blue hard court surface with white lines, a net visible in the background, natural daylight, open sky above. The young woman wears a bright lime green tennis outfit — a fitted lime green sleeveless tennis dress or matching lime green tennis top and skirt, the vivid green a striking contrast against the mint green and orange of the AURA 300 racket; she holds the SERA AURA 300 tennis racket — mint green to white gradient frame, orange cross-string pattern through the white string face, white perforated grip tape, AURA 300 lettering on the shaft, a mint green butt cap at the handle end.
Action and dialogue sequence:
She holds the AURA 300 up to the front camera with one hand, the full racket face filling the vertical frame, her bright lime green sleeve visible at the edge of the frame, the mint green frame and the orange string pattern sharp in the daylight: she tilts it slowly catching the sun across the surface, speaking naturally: "Okay so this just arrived and I am obsessed with the color." She flips it to show the back face, then tilts to show the mint-to-white gradient on the shaft where AURA 300 is printed, the lime green of her outfit creating a vivid color contrast beside the racket.
She switches to the back camera. Holds the racket out at arm's length, the lime green dress visible in the frame, and bounces the racket lightly on her palm: "It feels really balanced, like not too heavy." She brings the racket close to the back lens so the orange cross-string pattern fills the frame — the individual string intersections sharp, the orange against white vivid in the open daylight.
She props the phone against her bag or the court fence pointing toward her. She bounces a ball and hits two slow controlled groundstrokes toward the net — the bright lime green outfit and the mint AURA 300 frame moving through the frame together on each swing, the two greens catching the daylight differently, the racket head tracking cleanly through the air. She picks the phone back up.
Close-up back camera shot — she holds the racket face close to the lens, the orange string mesh filling the vertical frame, then slowly pans down the shaft past the AURA 300 lettering to the white grip tape, her lime green sleeve visible at the top of the frame, her fingers wrapping the grip naturally: "And the grip feels so good, really clean." She holds the full racket up one final time beside her face on the front camera — bright lime green outfit, mint green racket, orange strings — smiles directly into the lens: "Yeah. Yeah this is the one." @product:2fafff57-93dd-4e2a-9764-d8e23543e689 @avatar:00b08443-83de-4218-b973-f80580b1dfdb`;

// Keyed by FormatCard id from MarketingStudio.tsx
export const FORMAT_PRESETS: Record<string, FormatPreset> = {
  // f1: Hyper Motion (chocolate) — prompt only
  f1: {
    mode: 'Hyper Motion',
    prompt: HYPER_MOTION_CHOCOLATE,
    duration: '12s',
    aspect: '16:9',
  },
  // f2: Unboxing (Froggy Prince) — product + avatar
  f2: {
    mode: 'Unboxing',
    prompt: UNBOXING_FROGGY,
    duration: '10s',
    aspect: '9:16',
    productThumb: '/formats/preset-product-froggy.png',
    avatarThumb: '/formats/preset-avatar-pinkcap.png',
  },
  // f3: Hyper Motion (sneaker) — prompt only
  f3: {
    mode: 'Hyper Motion',
    prompt: HYPER_MOTION_SNEAKER,
    duration: '12s',
    aspect: '16:9',
  },
  // f4: UGC (tennis) — avatar
  f4: {
    mode: 'UGC',
    prompt: UGC_TENNIS,
    duration: '15s',
    aspect: '9:16',
    avatarThumb: '/formats/preset-avatar-red.png',
  },
};

export const RECREATE_EVENT = 'ms:recreate';

export function dispatchRecreate(preset: FormatPreset) {
  window.dispatchEvent(new CustomEvent<FormatPreset>(RECREATE_EVENT, { detail: preset }));
}
