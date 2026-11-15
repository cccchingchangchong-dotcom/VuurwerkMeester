import {
  EffectStyle,
  FiringPattern,
  FireworkProduct,
  ProductCategory,
  ShapeType,
} from '../types';

interface RawProductDef {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  description: string;
  shots: number;
  caliberMm: number;
  durationSec: number;
  shapeType: ShapeType;
  primaryColor: string;
  accentColor: string;
  badgeText: string;
  tier?: 'standard' | 'pro' | 'premium';
  style: EffectStyle;
  secondaryStyle?: EffectStyle;
  colors: string[];
  burstHeight: number;
  burstRadius: number;
  starCount: number;
  hasCrackle?: boolean;
  hasStrobe?: boolean;
  hasTail?: boolean;
  isFountain?: boolean;
  isRocket?: boolean;
  isWhistle?: boolean;
  isSmoke?: boolean;
  isSpinner?: boolean;
  pattern?: FiringPattern;
  shotInterval?: number;
  shakeIntensity?: number;
}

const CORE_PRODUCTS: RawProductDef[] = [
  // ==================== ORIGINAL 64 CORE PRODUCTS (PRESERVED IDS) ====================
  {
    id: 'tk-01', name: 'Donderkoning Classic', brand: 'DonderWerk', category: 'Thunder Kings', price: 4.95,
    description: 'Iconische enkele schots mortier met felle flits en diepe dreun. De klassieker voor middernacht.',
    shots: 1, caliberMm: 20, durationSec: 2, shapeType: 'thunderking', primaryColor: '#B91C1C', accentColor: '#F59E0B',
    badgeText: '1 SHOT · 20MM', style: 'salute', colors: ['#FFFFFF', '#FDE047', '#F97316'],
    burstHeight: 24, burstRadius: 6, starCount: 38, hasCrackle: true, shakeIntensity: 0.45,
  },
  {
    id: 'tk-02', name: 'Kroon Knaller Titanium', brand: 'KroonVuurwerk', category: 'Thunder Kings', price: 6.50,
    description: 'Extra dikke titanium-vonk saluut met zilveren staart bij lancering.',
    shots: 1, caliberMm: 25, durationSec: 2, shapeType: 'thunderking', primaryColor: '#1E293B', accentColor: '#38BDF8',
    badgeText: 'TITANIUM · 25MM', style: 'salute', colors: ['#E0F2FE', '#FFFFFF', '#7DD3FC'],
    burstHeight: 28, burstRadius: 7.5, starCount: 48, hasTail: true, shakeIntensity: 0.55,
  },
  {
    id: 'tk-03', name: 'Oranje Klapper XXL', brand: 'OranjeKnallers', category: 'Thunder Kings', price: 7.95,
    description: 'Zware enkele koker die een feloranje boeket combineert met een krachtige knetterwolk.',
    shots: 1, caliberMm: 30, durationSec: 3, shapeType: 'thunderking', primaryColor: '#EA580C', accentColor: '#FACC15',
    badgeText: 'XXL · 30MM', style: 'crackling', colors: ['#FB923C', '#FDE047', '#FFFFFF'],
    burstHeight: 30, burstRadius: 8.5, starCount: 65, hasCrackle: true, hasTail: true, shakeIntensity: 0.6,
  },
  {
    id: 'tk-04', name: 'Bliksem Buisje Pro', brand: 'PolderPyro', category: 'Thunder Kings', price: 5.50,
    description: 'Snelle felle witte strobe-flits hoog in de lucht, direct gevolgd door een scherpe knal.',
    shots: 1, caliberMm: 22, durationSec: 2, shapeType: 'thunderking', primaryColor: '#312E81', accentColor: '#E2E8F0',
    badgeText: 'STROBE · 22MM', style: 'white_strobe', colors: ['#FFFFFF', '#CBD5E1', '#93C5FD'],
    burstHeight: 26, burstRadius: 7, starCount: 50, hasStrobe: true, shakeIntensity: 0.45,
  },
  {
    id: 'tk-05', name: 'Rode Baron Single Shot', brand: 'DonderWerk', category: 'Thunder Kings', price: 6.25,
    description: 'Krachtige robijnrode pioenroos met harde titanium kern.',
    shots: 1, caliberMm: 25, durationSec: 2.5, shapeType: 'thunderking', primaryColor: '#7F1D1D', accentColor: '#FCA5A5',
    badgeText: 'ROOD · 25MM', style: 'red_peony', colors: ['#EF4444', '#F87171', '#FFFFFF'],
    burstHeight: 27, burstRadius: 8, starCount: 55, shakeIntensity: 0.5,
  },
  {
    id: 'tk-06', name: 'Groene Draak Mortier', brand: 'VlinderVlam', category: 'Thunder Kings', price: 6.25,
    description: 'Heldere smaragdgroene sterren met een knetterende staart tijdens de stijging.',
    shots: 1, caliberMm: 25, durationSec: 2.5, shapeType: 'thunderking', primaryColor: '#064E3B', accentColor: '#34D399',
    badgeText: 'GROEN · 25MM', style: 'green_peony', colors: ['#10B981', '#6EE7B7', '#FFFFFF'],
    burstHeight: 27, burstRadius: 8, starCount: 55, hasCrackle: true, hasTail: true, shakeIntensity: 0.5,
  },
  {
    id: 'tk-07', name: 'Gouden Vuist 3-Pack Tube', brand: 'KroonVuurwerk', category: 'Thunder Kings', price: 12.95,
    description: 'Drieschots mini-mortier die drie gouden brocade-knallen snel achter elkaar lanceert.',
    shots: 3, caliberMm: 20, durationSec: 3, shapeType: 'thunderking', primaryColor: '#78350F', accentColor: '#FBBF24',
    badgeText: '3 SHOTS · 20MM', style: 'brocade_crown', colors: ['#F59E0B', '#FDE047', '#FEF08A'],
    burstHeight: 25, burstRadius: 7.5, starCount: 52, hasTail: true, shotInterval: 0.45, shakeIntensity: 0.45,
  },
  {
    id: 'tk-08', name: 'Knetter Koning Mega', brand: 'OranjeKnallers', category: 'Thunder Kings', price: 8.50,
    description: 'Maximale knetterregen in één dikke buis voor liefhebbers van intens geluid.',
    shots: 1, caliberMm: 30, durationSec: 3, shapeType: 'thunderking', primaryColor: '#581C87', accentColor: '#FACC15',
    badgeText: 'MEGA · 30MM', style: 'crackling', colors: ['#FDE047', '#FB923C', '#E879F9'],
    burstHeight: 29, burstRadius: 9, starCount: 72, hasCrackle: true, shakeIntensity: 0.65,
  },
  {
    id: 'cmp-01', name: 'Koning der Lage Landen 144', brand: 'KroonVuurwerk', category: 'Compounds', price: 139.00,
    description: 'Majestueuze 144-schots compound box met gouden wilgen, blauwe pioenrozen en een daverend W-shape slot.',
    shots: 144, caliberMm: 25, durationSec: 65, shapeType: 'compound', primaryColor: '#1E1B4B', accentColor: '#F59E0B',
    badgeText: '144 SHOTS · 25MM', tier: 'pro', style: 'golden_willow', secondaryStyle: 'blue_peony',
    colors: ['#F59E0B', '#FDE047', '#3B82F6', '#60A5FA'], burstHeight: 36, burstRadius: 11, starCount: 85,
    hasTail: true, pattern: 'w_shape', shotInterval: 0.42, shakeIntensity: 0.55,
  },
  {
    id: 'cmp-02', name: 'Rijkswacht Compound 120', brand: 'DonderWerk', category: 'Compounds', price: 119.00,
    description: 'Krachtige 120-schots doorverbonden batterij met dieprode pioenrozen, witte strobes en knetterfinale.',
    shots: 120, caliberMm: 25, durationSec: 55, shapeType: 'compound', primaryColor: '#7F1D1D', accentColor: '#FBBF24',
    badgeText: '120 SHOTS · 25MM', tier: 'pro', style: 'red_peony', secondaryStyle: 'white_strobe',
    colors: ['#EF4444', '#FFFFFF', '#FDE047'], burstHeight: 35, burstRadius: 11, starCount: 80,
    hasCrackle: true, hasStrobe: true, pattern: 'z_sweep', shotInterval: 0.44, shakeIntensity: 0.55,
  },
  {
    id: 'cmp-03', name: 'Gouden Polder 200', brand: 'PolderPyro', category: 'Compounds', price: 189.00,
    description: 'Ongekende 200-schots goudregen compound. Lange hangende brocade kronen vullen de hele straat.',
    shots: 200, caliberMm: 25, durationSec: 82, shapeType: 'compound', primaryColor: '#451A03', accentColor: '#FCD34D',
    badgeText: '200 SHOTS · 25MM', tier: 'premium', style: 'brocade_crown', secondaryStyle: 'golden_willow',
    colors: ['#FBBF24', '#F59E0B', '#FEF08A', '#FB923C'], burstHeight: 38, burstRadius: 12.5, starCount: 95,
    hasTail: true, hasStrobe: true, pattern: 'fan', shotInterval: 0.38, shakeIntensity: 0.6,
  },
  {
    id: 'cmp-04', name: 'Delftse Donderbox 100', brand: 'NoorderLicht', category: 'Compounds', price: 99.50,
    description: 'Delfts blauwe boeketten afgewisseld met zilveren glitters en keiharde saluutschoten.',
    shots: 100, caliberMm: 30, durationSec: 48, shapeType: 'compound', primaryColor: '#172554', accentColor: '#93C5FD',
    badgeText: '100 SHOTS · 30MM', style: 'blue_peony', secondaryStyle: 'silver_glitter',
    colors: ['#2563EB', '#60A5FA', '#E2E8F0', '#FFFFFF'], burstHeight: 40, burstRadius: 13, starCount: 90,
    hasStrobe: true, hasTail: true, pattern: 'v_shape', shotInterval: 0.46, shakeIntensity: 0.65,
  },
  {
    id: 'cmp-05', name: 'Noorderlicht Symfonie 150', brand: 'NoorderLicht', category: 'Compounds', price: 149.00,
    description: 'Spectaculaire meerkleurige chrysanten en palmen geïnspireerd op het poollicht.',
    shots: 150, caliberMm: 25, durationSec: 64, shapeType: 'compound', primaryColor: '#064E3B', accentColor: '#A78BFA',
    badgeText: '150 SHOTS · 25MM', tier: 'pro', style: 'multi_color', secondaryStyle: 'chrysanthemum',
    colors: ['#10B981', '#8B5CF6', '#06B6D4', '#F43F5E'], burstHeight: 37, burstRadius: 12, starCount: 90,
    hasTail: true, pattern: 'z_sweep', shotInterval: 0.4, shakeIntensity: 0.55,
  },
  {
    id: 'cmp-06', name: 'Oranje Boven Showbox 288', brand: 'OranjeKnallers', category: 'Compounds', price: 249.00,
    description: 'Het vlaggenschip met 288 schoten in hoog tempo. Een complete straatshow uit één doos.',
    shots: 288, caliberMm: 20, durationSec: 95, shapeType: 'compound', primaryColor: '#9A3412', accentColor: '#FDE047',
    badgeText: '288 SHOTS · 20MM', tier: 'premium', style: 'multi_color', secondaryStyle: 'crackling',
    colors: ['#F97316', '#FACC15', '#EF4444', '#3B82F6', '#FFFFFF'], burstHeight: 33, burstRadius: 10.5, starCount: 75,
    hasCrackle: true, hasTail: true, pattern: 'w_shape', shotInterval: 0.31, shakeIntensity: 0.58,
  },
  {
    id: 'cmp-07', name: 'Vlinder Storm 108', brand: 'VlinderVlam', category: 'Compounds', price: 109.00,
    description: 'Breed waaierende V-shape compound met crackling kometen en felle neonkleuren.',
    shots: 108, caliberMm: 25, durationSec: 46, shapeType: 'compound', primaryColor: '#701A75', accentColor: '#F472B6',
    badgeText: '108 SHOTS · 25MM', style: 'chrysanthemum', secondaryStyle: 'crackling',
    colors: ['#EC4899', '#A855F7', '#22D3EE', '#FDE047'], burstHeight: 35, burstRadius: 11.5, starCount: 85,
    hasCrackle: true, pattern: 'v_shape', shotInterval: 0.41, shakeIntensity: 0.55,
  },
  {
    id: 'cmp-08', name: 'Zilveren Gracht 132', brand: 'KroonVuurwerk', category: 'Compounds', price: 129.00,
    description: 'Elegante zilveren palmen met witte glitterstaarten en blauwe parels.',
    shots: 132, caliberMm: 25, durationSec: 58, shapeType: 'compound', primaryColor: '#334155', accentColor: '#E2E8F0',
    badgeText: '132 SHOTS · 25MM', style: 'palm', secondaryStyle: 'silver_glitter',
    colors: ['#F8FAFC', '#CBD5E1', '#3B82F6'], burstHeight: 36, burstRadius: 11.5, starCount: 80,
    hasStrobe: true, hasTail: true, pattern: 'fan', shotInterval: 0.42, shakeIntensity: 0.52,
  },
  {
    id: 'cmp-09', name: 'Magnum Polder Force 160', brand: 'DonderWerk', category: 'Compounds', price: 164.50,
    description: 'Zware 30mm kaliber compound met diepe dreunen en extreem brede gouden kronen.',
    shots: 160, caliberMm: 30, durationSec: 70, shapeType: 'compound', primaryColor: '#0F172A', accentColor: '#F97316',
    badgeText: '160 SHOTS · 30MM', tier: 'premium', style: 'brocade_crown', secondaryStyle: 'crackling',
    colors: ['#F59E0B', '#EA580C', '#FFFFFF', '#EF4444'], burstHeight: 42, burstRadius: 14, starCount: 100,
    hasCrackle: true, hasTail: true, pattern: 'w_shape', shotInterval: 0.42, shakeIntensity: 0.72,
  },
  {
    id: 'cmp-10', name: 'Middernacht Meesterwerk 180', brand: 'PolderPyro', category: 'Compounds', price: 175.00,
    description: 'Opbouwende showbox van rustige gouden wilgen naar een explosieve regenboog-finale.',
    shots: 180, caliberMm: 25, durationSec: 75, shapeType: 'compound', primaryColor: '#1E293B', accentColor: '#FACC15',
    badgeText: '180 SHOTS · 25MM', tier: 'pro', style: 'golden_willow', secondaryStyle: 'multi_color',
    colors: ['#FDE047', '#EF4444', '#10B981', '#3B82F6', '#EC4899'], burstHeight: 38, burstRadius: 12, starCount: 90,
    hasCrackle: true, hasTail: true, pattern: 'z_sweep', shotInterval: 0.4, shakeIntensity: 0.62,
  },
  {
    id: 'ck-01', name: 'Gouden Wilg 25', brand: 'KroonVuurwerk', category: 'Cakes', price: 24.95,
    description: 'Klassieke 25-schots cake met langzaam neerdalende gouden wilgen.',
    shots: 25, caliberMm: 25, durationSec: 20, shapeType: 'cake', primaryColor: '#78350F', accentColor: '#FBBF24',
    badgeText: '25 SHOTS · 25MM', style: 'golden_willow', colors: ['#F59E0B', '#FDE047', '#FEF3C7'],
    burstHeight: 32, burstRadius: 10, starCount: 75, hasTail: true, pattern: 'straight', shotInterval: 0.75, shakeIntensity: 0.42,
  },
  {
    id: 'ck-02', name: 'Robijn Pioen 19', brand: 'VlinderVlam', category: 'Cakes', price: 18.50,
    description: 'Compacte 19-schots batterij met intense robijnrode pioenrozen.',
    shots: 19, caliberMm: 20, durationSec: 16, shapeType: 'cake', primaryColor: '#881337', accentColor: '#FB7185',
    badgeText: '19 SHOTS · 20MM', style: 'red_peony', colors: ['#EF4444', '#FB7185', '#FDA4AF'],
    burstHeight: 28, burstRadius: 9, starCount: 65, pattern: 'straight', shotInterval: 0.8, shakeIntensity: 0.35,
  },
  {
    id: 'ck-03', name: 'Saffier Hemel 36', brand: 'NoorderLicht', category: 'Cakes', price: 32.95,
    description: 'Diepblauwe effecten gecombineerd met heldere witte glittersterren.',
    shots: 36, caliberMm: 25, durationSec: 26, shapeType: 'cake', primaryColor: '#1E3A8A', accentColor: '#60A5FA',
    badgeText: '36 SHOTS · 25MM', style: 'blue_peony', secondaryStyle: 'silver_glitter',
    colors: ['#2563EB', '#60A5FA', '#F8FAFC'], burstHeight: 33, burstRadius: 10.5, starCount: 75,
    hasStrobe: true, pattern: 'straight', shotInterval: 0.7, shakeIntensity: 0.45,
  },
  {
    id: 'ck-04', name: 'Smaragd Bos 25', brand: 'PolderPyro', category: 'Cakes', price: 22.95,
    description: 'Frisgroene pioenrozen met gouden palmkernen en knetterende staarten.',
    shots: 25, caliberMm: 25, durationSec: 20, shapeType: 'cake', primaryColor: '#065F46', accentColor: '#34D399',
    badgeText: '25 SHOTS · 25MM', style: 'green_peony', colors: ['#10B981', '#34D399', '#FBBF24'],
    burstHeight: 31, burstRadius: 9.5, starCount: 70, hasTail: true, pattern: 'straight', shotInterval: 0.75, shakeIntensity: 0.4,
  },
  {
    id: 'ck-05', name: 'Chrysant Kroon 49', brand: 'KroonVuurwerk', category: 'Cakes', price: 44.95,
    description: '49-schots W-shape waaiercake met volle knetterende chrysanten.',
    shots: 49, caliberMm: 25, durationSec: 28, shapeType: 'cake', primaryColor: '#4C1D95', accentColor: '#FDE047',
    badgeText: '49 SHOTS · W-SHAPE', style: 'chrysanthemum', colors: ['#A855F7', '#FDE047', '#FFFFFF'],
    burstHeight: 35, burstRadius: 11.5, starCount: 85, hasCrackle: true, hasTail: true, pattern: 'w_shape', shotInterval: 0.55, shakeIntensity: 0.5,
  },
  {
    id: 'ck-06', name: 'Zilveren Glitterregen 30', brand: 'NoorderLicht', category: 'Cakes', price: 28.95,
    description: 'Dertig zware kaliber schoten met lang twinkelende zilveren glitters.',
    shots: 30, caliberMm: 30, durationSec: 24, shapeType: 'cake', primaryColor: '#1E293B', accentColor: '#CBD5E1',
    badgeText: '30 SHOTS · 30MM', style: 'silver_glitter', colors: ['#F8FAFC', '#E2E8F0', '#94A3B8'],
    burstHeight: 38, burstRadius: 12, starCount: 85, hasStrobe: true, pattern: 'straight', shotInterval: 0.75, shakeIntensity: 0.52,
  },
  {
    id: 'ck-07', name: 'Knetter Waaiers 35', brand: 'OranjeKnallers', category: 'Cakes', price: 34.50,
    description: 'Z-shape cake die de hele lucht vult met snoeiharde dragon-egg crackling.',
    shots: 35, caliberMm: 25, durationSec: 22, shapeType: 'cake', primaryColor: '#9A3412', accentColor: '#FB923C',
    badgeText: '35 SHOTS · Z-SHAPE', style: 'crackling', colors: ['#FB923C', '#FDE047', '#FFFFFF'],
    burstHeight: 33, burstRadius: 11, starCount: 80, hasCrackle: true, pattern: 'z_sweep', shotInterval: 0.6, shakeIntensity: 0.52,
  },
  {
    id: 'ck-08', name: 'Tropische Palm 16', brand: 'VlinderVlam', category: 'Cakes', price: 19.95,
    description: 'Zestien dikke palmbomen in goud en rood met knetterende stammen.',
    shots: 16, caliberMm: 30, durationSec: 18, shapeType: 'cake', primaryColor: '#7C2D12', accentColor: '#F59E0B',
    badgeText: '16 SHOTS · 30MM', style: 'palm', colors: ['#F59E0B', '#EF4444', '#FDE047'],
    burstHeight: 36, burstRadius: 11.5, starCount: 70, hasTail: true, pattern: 'straight', shotInterval: 1.0, shakeIntensity: 0.55,
  },
  {
    id: 'ck-09', name: 'Regenboog Paradijs 40', brand: 'PolderPyro', category: 'Cakes', price: 36.95,
    description: 'Veertig bonte meerkleurige boeketten in waaieropstelling.',
    shots: 40, caliberMm: 20, durationSec: 24, shapeType: 'cake', primaryColor: '#312E81', accentColor: '#F472B6',
    badgeText: '40 SHOTS · FAN', style: 'multi_color', colors: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899'],
    burstHeight: 30, burstRadius: 10, starCount: 75, pattern: 'fan', shotInterval: 0.58, shakeIntensity: 0.42,
  },
  {
    id: 'ck-10', name: 'Brocade Keizer 64', brand: 'KroonVuurwerk', category: 'Cakes', price: 59.95,
    description: 'Luxe 64-schots cake met goudbrokaat kronen en witte strobe-kern.',
    shots: 64, caliberMm: 25, durationSec: 36, shapeType: 'cake', primaryColor: '#27272A', accentColor: '#FBBF24',
    badgeText: '64 SHOTS · 25MM', tier: 'pro', style: 'brocade_crown', colors: ['#F59E0B', '#FDE047', '#FFFFFF'],
    burstHeight: 36, burstRadius: 12, starCount: 85, hasTail: true, hasStrobe: true, pattern: 'v_shape', shotInterval: 0.54, shakeIntensity: 0.52,
  },
  {
    id: 'ft-01', name: 'Gouden Vulkaan', brand: 'KroonVuurwerk', category: 'Fountains', price: 7.95,
    description: 'Hoge kegelfontein die tot 4 meter hoge gouden vonken spuit.',
    shots: 1, caliberMm: 15, durationSec: 25, shapeType: 'fountain', primaryColor: '#78350F', accentColor: '#FBBF24',
    badgeText: '25 SEC · GOUD', style: 'fountain_gold', colors: ['#F59E0B', '#FDE047', '#FEF08A'],
    burstHeight: 5.5, burstRadius: 1.5, starCount: 18, hasTail: true, isFountain: true, shakeIntensity: 0.05,
  },
  {
    id: 'ft-02', name: 'Zilveren Kegel Pro', brand: 'NoorderLicht', category: 'Fountains', price: 9.50,
    description: 'Zilverkleurige spuitfontein met intense lichtboog en blauwe basisvlam.',
    shots: 1, caliberMm: 18, durationSec: 30, shapeType: 'fountain', primaryColor: '#1E293B', accentColor: '#38BDF8',
    badgeText: '30 SEC · ZILVER', style: 'fountain_gold', colors: ['#F8FAFC', '#E2E8F0', '#38BDF8'],
    burstHeight: 6, burstRadius: 1.6, starCount: 20, isFountain: true, shakeIntensity: 0.05,
  },
  {
    id: 'ft-03', name: 'Knetter Fontein XL', brand: 'OranjeKnallers', category: 'Fountains', price: 11.95,
    description: 'Start met oranje vlammen en barst uit in een luide knetterwolk.',
    shots: 1, caliberMm: 20, durationSec: 28, shapeType: 'fountain', primaryColor: '#9A3412', accentColor: '#FACC15',
    badgeText: '28 SEC · CRACKLE', style: 'fountain_crackling', colors: ['#FB923C', '#FDE047', '#FFFFFF'],
    burstHeight: 5, burstRadius: 2.2, starCount: 24, hasCrackle: true, isFountain: true, shakeIntensity: 0.08,
  },
  {
    id: 'ft-04', name: 'Regenboog Fontein', brand: 'VlinderVlam', category: 'Fountains', price: 8.95,
    description: 'Wisselt soepel tussen rood, groen, paars en goud voor de hele familie.',
    shots: 1, caliberMm: 16, durationSec: 32, shapeType: 'fountain', primaryColor: '#581C87', accentColor: '#EC4899',
    badgeText: '32 SEC · MULTI', style: 'fountain_color', colors: ['#EF4444', '#10B981', '#A855F7', '#FBBF24'],
    burstHeight: 4.8, burstRadius: 1.5, starCount: 20, isFountain: true, shakeIntensity: 0.04,
  },
  {
    id: 'ft-05', name: 'Polder Goudblok', brand: 'PolderPyro', category: 'Fountains', price: 14.50,
    description: 'Zware vierkante spuitbox met drie opeenvolgende fasen en knetterslot.',
    shots: 1, caliberMm: 22, durationSec: 40, shapeType: 'fountain', primaryColor: '#451A03', accentColor: '#F59E0B',
    badgeText: '40 SEC · 3-FASE', style: 'fountain_crackling', colors: ['#F59E0B', '#FDE047', '#EF4444'],
    burstHeight: 6.5, burstRadius: 2, starCount: 26, hasCrackle: true, isFountain: true, shakeIntensity: 0.08,
  },
  {
    id: 'ft-06', name: 'Smaragd Vuurfontein', brand: 'NoorderLicht', category: 'Fountains', price: 8.25,
    description: 'Heldergroene Bengaalse gloed gevolgd door hoge zilveren vonken.',
    shots: 1, caliberMm: 15, durationSec: 24, shapeType: 'fountain', primaryColor: '#064E3B', accentColor: '#34D399',
    badgeText: '24 SEC · GROEN', style: 'fountain_color', colors: ['#10B981', '#6EE7B7', '#FFFFFF'],
    burstHeight: 5, burstRadius: 1.4, starCount: 18, isFountain: true, shakeIntensity: 0.04,
  },
  {
    id: 'ft-07', name: 'Donder Vulkaan 5-Meter', brand: 'DonderWerk', category: 'Fountains', price: 16.95,
    description: 'Enorme Zwitserse stijl vulkaan met gigantische druk en vonkenregen.',
    shots: 1, caliberMm: 25, durationSec: 35, shapeType: 'fountain', primaryColor: '#7F1D1D', accentColor: '#FDE047',
    badgeText: '35 SEC · 5M HOOG', style: 'fountain_gold', colors: ['#FBBF24', '#FFFFFF', '#FB923C'],
    burstHeight: 7.5, burstRadius: 2.2, starCount: 28, isFountain: true, shakeIntensity: 0.1,
  },
  {
    id: 'ft-08', name: 'Strobe Fontein Flits', brand: 'PolderPyro', category: 'Fountains', price: 9.95,
    description: 'Unieke knipperende strobe-vonken op grondniveau met witte flitsen.',
    shots: 1, caliberMm: 16, durationSec: 26, shapeType: 'fountain', primaryColor: '#0F172A', accentColor: '#E2E8F0',
    badgeText: '26 SEC · STROBE', style: 'fountain_color', colors: ['#FFFFFF', '#93C5FD', '#E2E8F0'],
    burstHeight: 4.5, burstRadius: 1.8, starCount: 22, hasStrobe: true, isFountain: true, shakeIntensity: 0.05,
  },
  {
    id: 'rc-01', name: 'Romeinse Kaars 10-Ball', brand: 'KroonVuurwerk', category: 'Roman Candles', price: 6.50,
    description: 'Stevige kaars op grondpin die 10 lichtkogels met kleine boeketjes schiet.',
    shots: 10, caliberMm: 14, durationSec: 15, shapeType: 'candle', primaryColor: '#B91C1C', accentColor: '#FDE047',
    badgeText: '10 SHOTS · 14MM', style: 'multi_color', colors: ['#EF4444', '#10B981', '#3B82F6', '#FDE047'],
    burstHeight: 20, burstRadius: 4.5, starCount: 30, hasTail: true, shotInterval: 1.3, shakeIntensity: 0.18,
  },
  {
    id: 'rc-02', name: 'Gouden Komeet Kaars 12', brand: 'PolderPyro', category: 'Roman Candles', price: 8.95,
    description: 'Twaalf heldere gouden kometen met lange glitterstaart.',
    shots: 12, caliberMm: 16, durationSec: 18, shapeType: 'candle', primaryColor: '#78350F', accentColor: '#FBBF24',
    badgeText: '12 SHOTS · GOUD', style: 'golden_willow', colors: ['#F59E0B', '#FDE047'],
    burstHeight: 22, burstRadius: 5, starCount: 32, hasTail: true, shotInterval: 1.2, shakeIntensity: 0.2,
  },
  {
    id: 'rc-03', name: 'Knetter Kaars 15', brand: 'OranjeKnallers', category: 'Roman Candles', price: 10.50,
    description: 'Vijftien schoten die telkens uiteenspatten in felle crackling vonken.',
    shots: 15, caliberMm: 16, durationSec: 19, shapeType: 'candle', primaryColor: '#EA580C', accentColor: '#FEF08A',
    badgeText: '15 SHOTS · CRACKLE', style: 'crackling', colors: ['#FB923C', '#FDE047', '#FFFFFF'],
    burstHeight: 21, burstRadius: 5.5, starCount: 38, hasCrackle: true, shotInterval: 1.1, shakeIntensity: 0.22,
  },
  {
    id: 'rc-04', name: 'Blauwe Parel Kaars 8', brand: 'NoorderLicht', category: 'Roman Candles', price: 7.95,
    description: 'Acht grote kobaltblauwe lichtballen met zilveren uitwerking.',
    shots: 8, caliberMm: 18, durationSec: 14, shapeType: 'candle', primaryColor: '#1E3A8A', accentColor: '#60A5FA',
    badgeText: '8 SHOTS · 18MM', style: 'blue_peony', colors: ['#3B82F6', '#93C5FD', '#FFFFFF'],
    burstHeight: 24, burstRadius: 6, starCount: 40, hasTail: true, shotInterval: 1.4, shakeIntensity: 0.25,
  },
  {
    id: 'rc-05', name: 'Fluit & Knal Kaars 20', brand: 'DonderWerk', category: 'Roman Candles', price: 12.95,
    description: 'Twintig snelle schoten met schel fluitgeluid en lichte knal.',
    shots: 20, caliberMm: 14, durationSec: 16, shapeType: 'candle', primaryColor: '#312E81', accentColor: '#F43F5E',
    badgeText: '20 SHOTS · FLUIT', style: 'white_strobe', colors: ['#FFFFFF', '#F43F5E', '#FDE047'],
    burstHeight: 20, burstRadius: 4.5, starCount: 28, isWhistle: true, hasStrobe: true, shotInterval: 0.75, shakeIntensity: 0.2,
  },
  {
    id: 'rc-06', name: 'Smaragd Barrage 12', brand: 'VlinderVlam', category: 'Roman Candles', price: 9.25,
    description: 'Twaalf vlotte groene kometen met rode tip.',
    shots: 12, caliberMm: 16, durationSec: 15, shapeType: 'candle', primaryColor: '#065F46', accentColor: '#34D399',
    badgeText: '12 SHOTS · GROEN', style: 'green_peony', colors: ['#10B981', '#EF4444', '#FFFFFF'],
    burstHeight: 22, burstRadius: 5.5, starCount: 36, hasTail: true, shotInterval: 1.1, shakeIntensity: 0.22,
  },
  {
    id: 'rk-01', name: 'Oranje Pijl Classic', brand: 'OranjeKnallers', category: 'Rockets', price: 6.95,
    description: 'Slanke vuurpijl met krachtige opstijgstaart en feloranje boeket.',
    shots: 1, caliberMm: 22, durationSec: 3.5, shapeType: 'rocket', primaryColor: '#EA580C', accentColor: '#FDE047',
    badgeText: 'PIJL · 40G', style: 'red_peony', colors: ['#F97316', '#EF4444', '#FDE047'],
    burstHeight: 42, burstRadius: 11, starCount: 75, hasTail: true, isRocket: true, shakeIntensity: 0.45,
  },
  {
    id: 'rk-02', name: 'Gouden Komeet Pijl 75', brand: 'KroonVuurwerk', category: 'Rockets', price: 12.95,
    description: 'Zware bolkop vuurpijl die een enorme gouden brocade kroon ontvouwt.',
    shots: 1, caliberMm: 35, durationSec: 4.5, shapeType: 'rocket', primaryColor: '#451A03', accentColor: '#FBBF24',
    badgeText: 'ZWARE PIJL · 75G', style: 'brocade_crown', colors: ['#F59E0B', '#FDE047', '#FEF08A'],
    burstHeight: 50, burstRadius: 15, starCount: 110, hasTail: true, isRocket: true, shakeIntensity: 0.65,
  },
  {
    id: 'rk-03', name: 'Gierende Gillende Keukenmeid', brand: 'DonderWerk', category: 'Rockets', price: 5.95,
    description: 'Bekend om zijn extreem hoge fluittoon tijdens de lancering en felle knal.',
    shots: 1, caliberMm: 18, durationSec: 3, shapeType: 'rocket', primaryColor: '#991B1B', accentColor: '#F8FAFC',
    badgeText: 'FLUITPIJL · 25G', style: 'salute', colors: ['#FFFFFF', '#FDE047', '#EF4444'],
    burstHeight: 38, burstRadius: 8, starCount: 45, isRocket: true, isWhistle: true, shakeIntensity: 0.5,
  },
  {
    id: 'rk-04', name: 'Noorderlicht Bolpijl', brand: 'NoorderLicht', category: 'Rockets', price: 11.50,
    description: 'Sferische kogelkop pijl met blauw-groene kleurverandering.',
    shots: 1, caliberMm: 32, durationSec: 4, shapeType: 'rocket', primaryColor: '#1E3A8A', accentColor: '#2DD4BF',
    badgeText: 'BOLPIJL · 65G', style: 'multi_color', colors: ['#3B82F6', '#10B981', '#22D3EE', '#A855F7'],
    burstHeight: 46, burstRadius: 13.5, starCount: 95, hasTail: true, isRocket: true, shakeIntensity: 0.55,
  },
  {
    id: 'rk-05', name: 'Zilveren Palm Pijl', brand: 'PolderPyro', category: 'Rockets', price: 10.95,
    description: 'Stijgt op met een dik zilverspoor en vormt een brede palmboom.',
    shots: 1, caliberMm: 30, durationSec: 4, shapeType: 'rocket', primaryColor: '#334155', accentColor: '#F8FAFC',
    badgeText: 'PALM · 60G', style: 'palm', colors: ['#F8FAFC', '#CBD5E1', '#60A5FA'],
    burstHeight: 45, burstRadius: 13, starCount: 85, hasTail: true, isRocket: true, shakeIntensity: 0.55,
  },
  {
    id: 'rk-06', name: 'Knetter Hemel Pijl', brand: 'VlinderVlam', category: 'Rockets', price: 9.50,
    description: 'Vuurpijl gevuld met honderden crackling sterren die lang na-knetteren.',
    shots: 1, caliberMm: 28, durationSec: 4, shapeType: 'rocket', primaryColor: '#581C87', accentColor: '#FACC15',
    badgeText: 'CRACKLE · 50G', style: 'crackling', colors: ['#FDE047', '#FB923C', '#E879F9'],
    burstHeight: 43, burstRadius: 12.5, starCount: 90, hasCrackle: true, isRocket: true, shakeIntensity: 0.52,
  },
  {
    id: 'rk-07', name: 'Wilgen Reus 90', brand: 'KroonVuurwerk', category: 'Rockets', price: 14.95,
    description: 'Extra lange hangtijd met gouden wilgendraden die bijna de daken raken.',
    shots: 1, caliberMm: 38, durationSec: 5, shapeType: 'rocket', primaryColor: '#713F12', accentColor: '#FDE047',
    badgeText: 'REUS · 90G', style: 'golden_willow', colors: ['#F59E0B', '#FDE047', '#FEF08A'],
    burstHeight: 52, burstRadius: 16, starCount: 115, hasTail: true, isRocket: true, shakeIntensity: 0.65,
  },
  {
    id: 'rk-08', name: 'Strobe Flits Pijl', brand: 'NoorderLicht', category: 'Rockets', price: 9.95,
    description: 'Hoogstijgende pijl met heldere witte en rode knipperende sterren.',
    shots: 1, caliberMm: 28, durationSec: 4, shapeType: 'rocket', primaryColor: '#1E293B', accentColor: '#F43F5E',
    badgeText: 'STROBE · 55G', style: 'white_strobe', colors: ['#FFFFFF', '#EF4444', '#E2E8F0'],
    burstHeight: 44, burstRadius: 12.5, starCount: 85, hasStrobe: true, isRocket: true, shakeIntensity: 0.5,
  },
  {
    id: 'sh-01', name: 'Delftse 2-Inch Shell Kit', brand: 'DonderWerk', category: 'Aerial Fireworks', price: 18.95,
    description: 'Professioneel ogende mortierbuis met één krachtige 50mm sferische shell.',
    shots: 1, caliberMm: 50, durationSec: 4.5, shapeType: 'shell', primaryColor: '#172554', accentColor: '#F59E0B',
    badgeText: '2" SHELL · 50MM', style: 'chrysanthemum', colors: ['#3B82F6', '#FDE047', '#FFFFFF'],
    burstHeight: 56, burstRadius: 18, starCount: 130, hasTail: true, hasCrackle: true, shakeIntensity: 0.8,
  },
  {
    id: 'sh-02', name: 'Kroon Brocade 2.5" Shell', brand: 'KroonVuurwerk', category: 'Aerial Fireworks', price: 24.50,
    description: 'Massieve 63mm goudbrokaat shell met oorverdovende lancering en brede kroon.',
    shots: 1, caliberMm: 63, durationSec: 5, shapeType: 'shell', primaryColor: '#451A03', accentColor: '#FCD34D',
    badgeText: '2.5" SHELL · 63MM', tier: 'pro', style: 'brocade_crown', colors: ['#F59E0B', '#FDE047', '#FEF08A'],
    burstHeight: 62, burstRadius: 21, starCount: 150, hasTail: true, shakeIntensity: 0.9,
  },
  {
    id: 'sh-03', name: '3-Schots Mortier Batterij', brand: 'PolderPyro', category: 'Aerial Fireworks', price: 39.95,
    description: 'Voorgeladen rek met drie 50mm shells: Rood, Wit en Blauw als eerbetoon.',
    shots: 3, caliberMm: 50, durationSec: 8, shapeType: 'shell', primaryColor: '#1E3A8A', accentColor: '#EF4444',
    badgeText: '3x 50MM SHELLS', style: 'multi_color', colors: ['#EF4444', '#FFFFFF', '#2563EB'],
    burstHeight: 54, burstRadius: 17, starCount: 120, hasTail: true, shotInterval: 1.8, shakeIntensity: 0.78,
  },
  {
    id: 'sh-04', name: 'Gouden Kamuro Shell 75', brand: 'KroonVuurwerk', category: 'Aerial Fireworks', price: 29.95,
    description: 'Enorme 3-inch kamuro goudwilg die secondenlang blijft hangen aan de nachthemel.',
    shots: 1, caliberMm: 75, durationSec: 5.5, shapeType: 'shell', primaryColor: '#27272A', accentColor: '#FBBF24',
    badgeText: '3" SHELL · 75MM', tier: 'premium', style: 'golden_kamuro', colors: ['#FBBF24', '#F59E0B', '#FEF3C7'],
    burstHeight: 68, burstRadius: 24, starCount: 165, hasTail: true, shakeIntensity: 0.95,
  },
  {
    id: 'sh-05', name: 'Titanium Salute Shell 50', brand: 'DonderWerk', category: 'Aerial Fireworks', price: 16.95,
    description: 'Zuivere luchtsaluut uit mortierbuis voor een ongekende echo door de wijk.',
    shots: 1, caliberMm: 50, durationSec: 3.5, shapeType: 'shell', primaryColor: '#7F1D1D', accentColor: '#E2E8F0',
    badgeText: 'SALUTE · 50MM', style: 'salute', colors: ['#FFFFFF', '#E0F2FE', '#FDE047'],
    burstHeight: 52, burstRadius: 13, starCount: 70, hasCrackle: true, shakeIntensity: 1.0,
  },
  {
    id: 'sh-06', name: 'Smaragd & Strobe Shell 63', brand: 'NoorderLicht', category: 'Aerial Fireworks', price: 23.50,
    description: 'Heldergroene ring met knipperend wit strobehart in 63mm kaliber.',
    shots: 1, caliberMm: 63, durationSec: 5, shapeType: 'shell', primaryColor: '#064E3B', accentColor: '#34D399',
    badgeText: '2.5" SHELL · 63MM', style: 'ring_burst', secondaryStyle: 'white_strobe',
    colors: ['#10B981', '#FFFFFF', '#6EE7B7'], burstHeight: 60, burstRadius: 19, starCount: 140,
    hasStrobe: true, hasTail: true, shakeIntensity: 0.85,
  },
  {
    id: 'fn-01', name: 'Oud & Nieuw Finale 100S', brand: 'OranjeKnallers', category: 'Finale', price: 89.00,
    description: '100 snelle saluut- en kleurboeketten in 15 seconden. Ultieme afsluiter!',
    shots: 100, caliberMm: 20, durationSec: 16, shapeType: 'finale', primaryColor: '#7F1D1D', accentColor: '#F97316',
    badgeText: 'FINALE · 100 SHOTS', tier: 'pro', style: 'finale', colors: ['#EF4444', '#F59E0B', '#FFFFFF', '#FDE047'],
    burstHeight: 36, burstRadius: 12, starCount: 70, hasCrackle: true, hasTail: true, pattern: 'fan', shotInterval: 0.14, shakeIntensity: 0.72,
  },
  {
    id: 'fn-02', name: 'Gouden Hemel Salvo 60', brand: 'KroonVuurwerk', category: 'Finale', price: 74.95,
    description: 'Vuurt 60 gouden brocade kronen in razendsnelle salvo’s van 5 tegelijk.',
    shots: 60, caliberMm: 25, durationSec: 14, shapeType: 'finale', primaryColor: '#451A03', accentColor: '#FDE047',
    badgeText: 'SALVO · 60 SHOTS', style: 'brocade_crown', colors: ['#F59E0B', '#FDE047', '#FFFFFF'],
    burstHeight: 40, burstRadius: 13.5, starCount: 85, hasTail: true, pattern: 'salvo', shotInterval: 0.2, shakeIntensity: 0.78,
  },
  {
    id: 'fn-03', name: 'Titanium Thunder Finale 50', brand: 'DonderWerk', category: 'Finale', price: 64.95,
    description: 'Vijftig snoeiharde titanium knallen in 8 seconden voor maximale dreun.',
    shots: 50, caliberMm: 25, durationSec: 9, shapeType: 'finale', primaryColor: '#0F172A', accentColor: '#38BDF8',
    badgeText: 'SALUTE · 50 SHOTS', style: 'salute', colors: ['#FFFFFF', '#E0F2FE', '#FDE047'],
    burstHeight: 35, burstRadius: 10, starCount: 55, hasCrackle: true, pattern: 'w_shape', shotInterval: 0.16, shakeIntensity: 0.88,
  },
  {
    id: 'fn-04', name: 'Crackling Muur 80', brand: 'PolderPyro', category: 'Finale', price: 79.95,
    description: 'Bouwt een oorverdovende muur van knetterende chrysanten over de volle breedte.',
    shots: 80, caliberMm: 25, durationSec: 16, shapeType: 'finale', primaryColor: '#581C87', accentColor: '#FACC15',
    badgeText: 'MUUR · 80 SHOTS', style: 'crackling', colors: ['#FDE047', '#FB923C', '#FFFFFF', '#A855F7'],
    burstHeight: 37, burstRadius: 13, starCount: 80, hasCrackle: true, pattern: 'w_shape', shotInterval: 0.18, shakeIntensity: 0.75,
  },
  {
    id: 'fn-05', name: 'Koningsdag Spektakel 120', brand: 'OranjeKnallers', category: 'Finale', price: 115.00,
    description: 'Oranje, rood, wit en blauw in hoog tempo afgesloten met een gouden regen.',
    shots: 120, caliberMm: 25, durationSec: 22, shapeType: 'finale', primaryColor: '#C2410C', accentColor: '#3B82F6',
    badgeText: '120 SHOTS · 25MM', tier: 'pro', style: 'finale', colors: ['#F97316', '#EF4444', '#FFFFFF', '#2563EB', '#FDE047'],
    burstHeight: 38, burstRadius: 13, starCount: 80, hasTail: true, hasStrobe: true, pattern: 'z_sweep', shotInterval: 0.17, shakeIntensity: 0.75,
  },
  {
    id: 'fn-06', name: 'Zilveren Strobe Storm 72', brand: 'NoorderLicht', category: 'Finale', price: 69.50,
    description: 'Tweeënzeventig intense witte flitsboeketten die de hele straat verlichten.',
    shots: 72, caliberMm: 25, durationSec: 15, shapeType: 'finale', primaryColor: '#1E293B', accentColor: '#F8FAFC',
    badgeText: '72 SHOTS · STROBE', style: 'white_strobe', colors: ['#FFFFFF', '#E2E8F0', '#93C5FD'],
    burstHeight: 36, burstRadius: 12.5, starCount: 80, hasStrobe: true, pattern: 'fan', shotInterval: 0.19, shakeIntensity: 0.68,
  },
  {
    id: 'fn-07', name: 'Vlinder Eindbaas 90', brand: 'VlinderVlam', category: 'Finale', price: 94.00,
    description: 'Multikleurige palmen en chrysanten in hoog tempo met knetterende finale-salvo.',
    shots: 90, caliberMm: 30, durationSec: 18, shapeType: 'finale', primaryColor: '#701A75', accentColor: '#F59E0B',
    badgeText: '90 SHOTS · 30MM', tier: 'pro', style: 'finale', colors: ['#EC4899', '#22D3EE', '#FDE047', '#10B981'],
    burstHeight: 42, burstRadius: 14.5, starCount: 95, hasCrackle: true, hasTail: true, pattern: 'w_shape', shotInterval: 0.19, shakeIntensity: 0.85,
  },
  {
    id: 'fn-08', name: 'De Grand Finale 150', brand: 'KroonVuurwerk', category: 'Finale', price: 159.00,
    description: '150 schoten in 18 seconden: gouden wilgen, multi-color chrysanten en titanium eindsalvo.',
    shots: 150, caliberMm: 30, durationSec: 19, shapeType: 'finale', primaryColor: '#09090B', accentColor: '#F59E0B',
    badgeText: 'GRAND FINALE · 150', tier: 'premium', style: 'finale', colors: ['#F59E0B', '#FDE047', '#EF4444', '#3B82F6', '#FFFFFF'],
    burstHeight: 44, burstRadius: 15, starCount: 95, hasCrackle: true, hasStrobe: true, hasTail: true, pattern: 'salvo', shotInterval: 0.12, shakeIntensity: 0.92,
  },
];

// ==================== PROCEDURALLY CURATED EXPANSION (+156 UNIQUE PRODUCTS = 220 TOTAL) ====================

const BRANDS = [
  'KroonVuurwerk',
  'DonderWerk',
  'NoorderLicht',
  'PolderPyro',
  'OranjeKnallers',
  'VlinderVlam',
  'HollandKruit',
  'RijksPyro',
];

const THEMES: {
  label: string;
  primary: string;
  accent: string;
  colors: string[];
  style: EffectStyle;
  secondary?: EffectStyle;
  crackle?: boolean;
  strobe?: boolean;
  tail?: boolean;
}[] = [
  { label: 'Goudkoorts', primary: '#451A03', accent: '#FBBF24', colors: ['#F59E0B', '#FDE047', '#FEF08A'], style: 'golden_willow', tail: true },
  { label: 'Robijn Vlam', primary: '#7F1D1D', accent: '#FB7185', colors: ['#EF4444', '#F87171', '#FFFFFF'], style: 'red_peony', strobe: true },
  { label: 'Delfts Blauw', primary: '#1E3A8A', accent: '#60A5FA', colors: ['#2563EB', '#60A5FA', '#E0F2FE'], style: 'blue_peony', tail: true },
  { label: 'Smaragd Woud', primary: '#064E3B', accent: '#34D399', colors: ['#10B981', '#34D399', '#FDE047'], style: 'green_peony', crackle: true },
  { label: 'Zilveren Poolster', primary: '#1E293B', accent: '#E2E8F0', colors: ['#F8FAFC', '#CBD5E1', '#93C5FD'], style: 'silver_glitter', strobe: true },
  { label: 'Brocade Majesteit', primary: '#27272A', accent: '#F59E0B', colors: ['#F59E0B', '#FBBF24', '#FFFFFF'], style: 'brocade_crown', tail: true },
  { label: 'Dragon Crackle', primary: '#581C87', accent: '#FACC15', colors: ['#FB923C', '#FDE047', '#E879F9'], style: 'crackling', crackle: true },
  { label: 'Neon Kameleon', primary: '#701A75', accent: '#22D3EE', colors: ['#EC4899', '#22D3EE', '#A855F7', '#FDE047'], style: 'multi_color', tail: true },
  { label: 'Tropische Palm', primary: '#7C2D12', accent: '#FB923C', colors: ['#F97316', '#F59E0B', '#FFFFFF'], style: 'crackle_palm', crackle: true, tail: true },
  { label: 'Kamuro Nacht', primary: '#09090B', accent: '#FCD34D', colors: ['#FBBF24', '#FDE047', '#FB923C'], style: 'golden_kamuro', tail: true },
  { label: 'Crossette Kruis', primary: '#312E81', accent: '#38BDF8', colors: ['#38BDF8', '#F43F5E', '#FDE047', '#34D399'], style: 'crossette', tail: true },
  { label: 'Saturnus Ring', primary: '#134E4A', accent: '#2DD4BF', colors: ['#2DD4BF', '#FFFFFF', '#A855F7'], style: 'ring_burst', strobe: true },
];

const PATTERNS: FiringPattern[] = ['straight', 'fan', 'v_shape', 'w_shape', 'z_sweep', 'salvo'];

function buildExpandedAssortment(): RawProductDef[] {
  const extra: RawProductDef[] = [];

  // 1. +16 Thunder Kings (total 24)
  const tkNames = [
    'Mini Knalbuis 15', 'Blauwe Bliksem Tube', 'Gouden Dreun 25', 'Paarse Schokgolf',
    'Smaragd Saluut', 'Oranje Strobe Knal', 'Zilveren Komeet Shot', 'Crossette Single 30',
    'Kamuro Mini Mortier', 'Triple Thunder Pak', 'Fluitende Donderbuis', 'Dubbel Klappakket',
    'Neon Flits Mortier', 'Polder Dreun 32', 'Konings Saluut Buizen', 'Brocade Single Pro',
  ];
  tkNames.forEach((name, i) => {
    const th = THEMES[i % THEMES.length];
    const cal = [15, 20, 25, 30, 32][i % 5];
    const shots = i === 9 ? 3 : i === 11 ? 2 : 1;
    extra.push({
      id: `tk-ex-${i + 9}`,
      name,
      brand: BRANDS[i % BRANDS.length],
      category: 'Thunder Kings',
      price: Number((3.95 + (cal - 15) * 0.25 + (shots - 1) * 3.5).toFixed(2)),
      description: `${cal}mm enkele-schots mortierbuis met ${th.label.toLowerCase()} effect en krachtige eindknal.`,
      shots,
      caliberMm: cal,
      durationSec: shots === 1 ? 2.5 : 4,
      shapeType: 'thunderking',
      primaryColor: th.primary,
      accentColor: th.accent,
      badgeText: `${shots > 1 ? shots + '× ' : ''}${cal}MM`,
      style: i % 3 === 0 ? 'salute' : th.style,
      colors: th.colors,
      burstHeight: 22 + cal * 0.35,
      burstRadius: 6 + cal * 0.14,
      starCount: 36 + cal,
      hasCrackle: th.crackle || i % 2 === 0,
      hasStrobe: th.strobe,
      hasTail: th.tail,
      isWhistle: i === 10,
      shotInterval: 0.5,
      shakeIntensity: 0.4 + cal * 0.01,
    });
  });

  // 2. +26 Cakes (total 36: Small, Medium, Large, Multi-effect, Finale cakes)
  const cakeNames = [
    'Kleine Ster 9', 'Bengaals Boeket 12', 'Polder Pareltje 16', 'Compacte Waaier 16',
    'Zilveren Fontein Cake 20', 'Koperen Glans 24', 'Rode Lantaarn 25', 'Blauwe Golf 25',
    'Smaragd Cascade 30', 'Witte Flits Batterij 32', 'Vuurvogel 36', 'Donderwolk 36',
    'Oranje Triomf 42', 'Gouden Regen Waaier 45', 'Noorderlicht V-Shape 48', 'Hollandse Glorie 50',
    'Knetterende Horizon 54', 'Brocade Balkon 56', 'Kamuro Kolos 60', 'Z-Sweep Tornado 64',
    'Multi-Effect Komeet 72', 'Goud & Zilver Symfonie 75', 'Crossette Veld 80', 'Neon Dubbelklapper 84',
    'Polder Finale Cake 90', 'Kroon Juweel 100',
  ];
  cakeNames.forEach((name, i) => {
    const th = THEMES[(i + 2) % THEMES.length];
    const th2 = THEMES[(i + 7) % THEMES.length];
    const shots = [9, 12, 16, 16, 20, 24, 25, 25, 30, 32, 36, 36, 42, 45, 48, 50, 54, 56, 60, 64, 72, 75, 80, 84, 90, 100][i];
    const cal = shots < 20 ? 20 : shots < 50 ? 25 : 30;
    const pat = PATTERNS[i % PATTERNS.length];
    const isMulti = i >= 16;
    extra.push({
      id: `ck-ex-${i + 11}`,
      name,
      brand: BRANDS[(i + 1) % BRANDS.length],
      category: 'Cakes',
      price: Number((9.95 + shots * 0.92 + (cal === 30 ? 12 : 0)).toFixed(2)),
      description: `${shots}-schots ${cal}mm siercake met ${th.label.toLowerCase()} boeketten in ${pat.replace('_', '-')} patroon.`,
      shots,
      caliberMm: cal,
      durationSec: Math.round(12 + shots * 0.45),
      shapeType: i >= 24 ? 'finale' : 'cake',
      primaryColor: th.primary,
      accentColor: th.accent,
      badgeText: `${shots} SHOTS · ${cal}MM`,
      tier: shots >= 60 ? 'pro' : 'standard',
      style: th.style,
      secondaryStyle: isMulti ? th2.style : undefined,
      colors: isMulti ? [...th.colors.slice(0, 2), ...th2.colors.slice(0, 2)] : th.colors,
      burstHeight: 28 + (cal - 20) * 0.9,
      burstRadius: 9 + (cal - 20) * 0.35,
      starCount: 60 + cal,
      hasCrackle: th.crackle,
      hasStrobe: th.strobe,
      hasTail: th.tail,
      pattern: pat,
      shotInterval: Math.max(0.24, 0.85 - shots * 0.005),
      shakeIntensity: 0.38 + (cal - 20) * 0.02,
    });
  });

  // 3. +20 Compounds (total 30)
  const compoundNames = [
    'Amstel Goud Box 80', 'Maasvlakte Thunder 96', 'Veluwe Vuurwerk 100', 'Friese Meren Show 112',
    'Domtoren Spektakel 128', 'Texel Windvlaag 136', 'Scheveningen Pier 144', 'Zaanse Schans 150',
    'Keukenhof Kleurenfestijn 160', 'Rotterdam Harbor Blast 168', 'Utrecht Grachtenlicht 180', 'Breda Baron Box 192',
    'Groningen Noordervlam 200', 'Maastricht Vrijthof 216', 'Eindhoven Lichtstad 224', 'Alkmaar Kaasmarkt Knal 240',
    'Haarlem Goudregen 250', 'Leiden Sleutelstad 260', 'Den Haag Hofstad Box 280', 'Nederland Oranje 300',
  ];
  compoundNames.forEach((name, i) => {
    const th = THEMES[(i + 4) % THEMES.length];
    const th2 = THEMES[(i + 9) % THEMES.length];
    const shots = [80, 96, 100, 112, 128, 136, 144, 150, 160, 168, 180, 192, 200, 216, 224, 240, 250, 260, 280, 300][i];
    const cal = i % 3 === 0 ? 30 : 25;
    const pat = PATTERNS[(i + 2) % PATTERNS.length];
    extra.push({
      id: `cmp-ex-${i + 11}`,
      name,
      brand: BRANDS[(i + 3) % BRANDS.length],
      category: 'Compounds',
      price: Number((79 + shots * 0.78 + (cal === 30 ? 25 : 0)).toFixed(2)),
      description: `Gigantische ${shots}-schots doorverbonden compound in ${th.label} & ${th2.label} stijl.`,
      shots,
      caliberMm: cal,
      durationSec: Math.round(36 + shots * 0.25),
      shapeType: 'compound',
      primaryColor: th.primary,
      accentColor: th.accent,
      badgeText: `${shots}S · ${cal}MM`,
      tier: shots >= 200 ? 'premium' : 'pro',
      style: th.style,
      secondaryStyle: th2.style,
      colors: [...th.colors.slice(0, 2), ...th2.colors.slice(0, 2)],
      burstHeight: 35 + (cal === 30 ? 6 : 0),
      burstRadius: 11.5 + (cal === 30 ? 2.5 : 0),
      starCount: 85 + (cal === 30 ? 15 : 0),
      hasCrackle: th.crackle || th2.crackle,
      hasStrobe: th.strobe || th2.strobe,
      hasTail: true,
      pattern: pat,
      shotInterval: Math.max(0.26, 0.48 - shots * 0.0006),
      shakeIntensity: 0.58 + (cal === 30 ? 0.14 : 0),
    });
  });

  // 4. +24 Aerial Fireworks (total 30 with original 6 shells)
  const aerialNames = [
    '2-Inch Gouden Wilg Shell', '2-Inch Blauwe Saturnus Ring', '2.5-Inch Crossette Quartet',
    '3-Inch Brocade Hemelkroon', '3-Inch Zilveren Chrysant', '4-Inch Mega Kamuro Shell',
    'Mine of Gold 25mm', 'Crackling Comet Mine', 'Neon Rainbow Peony Shell',
    'Dubbele Ring Shell 63mm', 'Smaragd Palm Mortier', 'Witte Strobe Hemelbol',
    '4-Schots Aerial Rack', '6-Schots Gouden Salvo Rek', 'Koperen Willow Tube',
    'Paarse Dahlia Shell 50mm', 'Zilveren Tijgerstaart Shell', 'Multi-Break 3-Laags Shell',
    'Oranje Koningsbol 75mm', 'Knetterende Palm Shell', 'Blauwe Regen Shell 63mm',
    'Diamant Glitter Shell', 'Rode Hart Ring Shell', 'Titanium Echo Mortier 75mm',
  ];
  aerialNames.forEach((name, i) => {
    const th = THEMES[i % THEMES.length];
    const isMine = name.includes('Mine');
    const shots = name.includes('4-Schots') ? 4 : name.includes('6-Schots') ? 6 : 1;
    const cal = name.includes('4-Inch') ? 100 : name.includes('3-Inch') || name.includes('75') ? 75 : name.includes('63') || name.includes('2.5') ? 63 : 50;
    extra.push({
      id: `aer-ex-${i + 7}`,
      name,
      brand: BRANDS[(i + 2) % BRANDS.length],
      category: 'Aerial Fireworks',
      price: Number((14.95 + (cal - 40) * 0.45 + (shots - 1) * 9).toFixed(2)),
      description: `${cal}mm hoogwaardig luchtvuurwerk met ${th.label.toLowerCase()} effect en weidse spreiding.`,
      shots,
      caliberMm: cal,
      durationSec: shots > 1 ? shots * 2.2 : 5,
      shapeType: 'shell',
      primaryColor: th.primary,
      accentColor: th.accent,
      badgeText: `${shots > 1 ? shots + '× ' : ''}${cal}MM AERIAL`,
      tier: cal >= 75 ? 'premium' : cal >= 63 ? 'pro' : 'standard',
      style: isMine ? 'comet_mine' : th.style,
      colors: th.colors,
      burstHeight: isMine ? 24 : 46 + cal * 0.28,
      burstRadius: 13 + cal * 0.14,
      starCount: 100 + Math.round(cal * 0.8),
      hasCrackle: th.crackle,
      hasStrobe: th.strobe,
      hasTail: true,
      pattern: isMine ? 'fan' : 'straight',
      shotInterval: 1.5,
      shakeIntensity: 0.65 + cal * 0.003,
    });
  });

  // 5. +14 Fountains (total 22)
  const fountainNames = [
    'Koperen Kegel', 'Blauwe IJsfontein', 'Paarse Magma Spuiter', 'Gouden Waterval Mini',
    'Knetterende Draak 35s', 'Oranje Vlammenzee', 'Zilveren Sterrenregen', '4-Kleuren Carrousel',
    'Stille Tuinfontein', 'Titanium Vonkenzuil', 'Smaragd Geyser', 'Robijn Vulkaan XL',
    'Dubbel-Straal Fontein', 'Mega Straatvulkaan 60s',
  ];
  fountainNames.forEach((name, i) => {
    const th = THEMES[(i + 1) % THEMES.length];
    const dur = 20 + (i % 6) * 6;
    extra.push({
      id: `ft-ex-${i + 9}`,
      name,
      brand: BRANDS[(i + 4) % BRANDS.length],
      category: 'Fountains',
      price: Number((5.95 + i * 0.95).toFixed(2)),
      description: `${dur} seconden durende grondfontein met ${th.label.toLowerCase()} vonkenregen.`,
      shots: 1,
      caliberMm: 15 + (i % 4) * 3,
      durationSec: dur,
      shapeType: 'fountain',
      primaryColor: th.primary,
      accentColor: th.accent,
      badgeText: `${dur} SEC · FONTEIN`,
      style: i % 3 === 0 ? 'fountain_gold' : i % 3 === 1 ? 'fountain_crackling' : 'fountain_color',
      colors: th.colors,
      burstHeight: 4.5 + (i % 5) * 0.8,
      burstRadius: 1.4 + (i % 3) * 0.35,
      starCount: 18 + (i % 5) * 3,
      hasCrackle: i % 3 === 1,
      hasStrobe: th.strobe,
      isFountain: true,
      shakeIntensity: 0.05,
    });
  });

  // 6. +14 Rockets (total 22)
  const rocketNames = [
    'Zilveren Flits Pijl', 'Blauwe Komeet Pijl', 'Smaragd Sky Rocket', 'Crossette Pijl 60g',
    'Gouden Kamuro Pijl 100g', 'Dubbel-Slag Pijl', 'Regenboog Bolpijl 75g', 'Fluitende Crackling Pijl',
    'Saturnus Ring Pijl', 'Robijn Parachute Pijl', 'Oranje Vuurpijl XL', 'Koperen Palm Pijl',
    'Titanium Knalpijl', 'Koninklijke Kroonpijl 100g',
  ];
  rocketNames.forEach((name, i) => {
    const th = THEMES[(i + 3) % THEMES.length];
    const grams = [35, 45, 50, 60, 100, 70, 75, 40, 65, 55, 80, 60, 45, 100][i];
    extra.push({
      id: `rk-ex-${i + 9}`,
      name,
      brand: BRANDS[(i + 5) % BRANDS.length],
      category: 'Rockets',
      price: Number((4.95 + grams * 0.14).toFixed(2)),
      description: `${grams}g vuurpijl met krachtige lancering en ${th.label.toLowerCase()} luchtboeket.`,
      shots: 1,
      caliberMm: Math.round(18 + grams * 0.22),
      durationSec: 4,
      shapeType: 'rocket',
      primaryColor: th.primary,
      accentColor: th.accent,
      badgeText: `PIJL · ${grams}G`,
      tier: grams >= 80 ? 'pro' : 'standard',
      style: th.style,
      colors: th.colors,
      burstHeight: 38 + grams * 0.18,
      burstRadius: 10 + grams * 0.07,
      starCount: 70 + Math.round(grams * 0.55),
      hasCrackle: th.crackle,
      hasStrobe: th.strobe,
      hasTail: true,
      isRocket: true,
      isWhistle: name.includes('Fluit'),
      shakeIntensity: 0.45 + grams * 0.003,
    });
  });

  // 7. +10 Roman Candles (total 16)
  const candleNames = [
    '5-Schots Reuzenkaars', '10-Schots Goudstaart', '12-Schots Crossette Kaars', '15-Schots Neon Komeet',
    '20-Schots Strobe Barrage', '25-Schots Dragon Crackle', '30-Schots Snelle Kaars', 'Blauwe Parel 16-Shot',
    'Kamuro Kaars 10-Ball', 'Oranje Komeet 18-Shot',
  ];
  candleNames.forEach((name, i) => {
    const th = THEMES[(i + 5) % THEMES.length];
    const shots = [5, 10, 12, 15, 20, 25, 30, 16, 10, 18][i];
    extra.push({
      id: `rc-ex-${i + 7}`,
      name,
      brand: BRANDS[i % BRANDS.length],
      category: 'Roman Candles',
      price: Number((4.95 + shots * 0.55).toFixed(2)),
      description: `${shots}-schots Romeinse kaars met lichtkogels in ${th.label.toLowerCase()} kleuren.`,
      shots,
      caliberMm: 14 + (i % 3) * 2,
      durationSec: Math.round(shots * 0.9),
      shapeType: 'candle',
      primaryColor: th.primary,
      accentColor: th.accent,
      badgeText: `${shots} SHOTS · KAARS`,
      style: th.style,
      colors: th.colors,
      burstHeight: 20 + (i % 4) * 2,
      burstRadius: 4.5 + (i % 3) * 0.8,
      starCount: 30 + (i % 4) * 5,
      hasCrackle: th.crackle,
      hasStrobe: th.strobe,
      hasTail: true,
      shotInterval: 0.85,
      shakeIntensity: 0.2,
    });
  });

  // 8. 16 Sparklers & Smoke
  const sparkSmokeDefs: { name: string; isSmoke: boolean; colors: string[]; primary: string; accent: string; price: number }[] = [
    { name: 'Oranje Rookfakkel XL', isSmoke: true, colors: ['#F97316', '#FB923C', '#FDBA74'], primary: '#9A3412', accent: '#F97316', price: 6.95 },
    { name: 'Rode Rookbom Pro', isSmoke: true, colors: ['#EF4444', '#F87171', '#FCA5A5'], primary: '#7F1D1D', accent: '#EF4444', price: 6.95 },
    { name: 'Blauwe Rookwolk 60s', isSmoke: true, colors: ['#3B82F6', '#60A5FA', '#93C5FD'], primary: '#1E3A8A', accent: '#3B82F6', price: 7.50 },
    { name: 'Smaragd Rookbuis', isSmoke: true, colors: ['#10B981', '#34D399', '#6EE7B7'], primary: '#064E3B', accent: '#10B981', price: 6.95 },
    { name: 'Paarse Mist Emissie', isSmoke: true, colors: ['#A855F7', '#C084FC', '#E9D5FF'], primary: '#581C87', accent: '#A855F7', price: 7.50 },
    { name: 'Witte Polder Mistpot', isSmoke: true, colors: ['#F8FAFC', '#E2E8F0', '#CBD5E1'], primary: '#334155', accent: '#F8FAFC', price: 5.95 },
    { name: 'Regenboog Rookbatterij', isSmoke: true, colors: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'], primary: '#1E1B4B', accent: '#EC4899', price: 14.95 },
    { name: 'Gouden Stadion Rookpot', isSmoke: true, colors: ['#F59E0B', '#FDE047', '#FEF08A'], primary: '#78350F', accent: '#FBBF24', price: 8.95 },
    { name: 'Reuzen Sterretje 70cm', isSmoke: false, colors: ['#FDE047', '#FFFFFF', '#FBBF24'], primary: '#451A03', accent: '#FDE047', price: 3.95 },
    { name: 'Knetter Sterrenbundel', isSmoke: false, colors: ['#F59E0B', '#FFFFFF', '#FB923C'], primary: '#7C2D12', accent: '#FACC15', price: 5.50 },
    { name: 'Zilveren Bengaalse Fakkel', isSmoke: false, colors: ['#FFFFFF', '#E0F2FE', '#93C5FD'], primary: '#1E293B', accent: '#38BDF8', price: 4.95 },
    { name: 'Rode Bengaalse Vlam 45s', isSmoke: false, colors: ['#EF4444', '#FB7185', '#FFFFFF'], primary: '#881337', accent: '#FB7185', price: 5.50 },
    { name: 'Groene Stadion Fakkel', isSmoke: false, colors: ['#10B981', '#6EE7B7', '#FFFFFF'], primary: '#065F46', accent: '#34D399', price: 5.50 },
    { name: 'Witte Strobe Grondfakkel', isSmoke: false, colors: ['#FFFFFF', '#E2E8F0', '#FDE047'], primary: '#0F172A', accent: '#FFFFFF', price: 6.25 },
    { name: 'Gouden Vonkenstaaf Pro', isSmoke: false, colors: ['#F59E0B', '#FDE047', '#FEF3C7'], primary: '#78350F', accent: '#F59E0B', price: 6.50 },
    { name: 'Crackling Bengaals Trio', isSmoke: false, colors: ['#FB923C', '#FDE047', '#EF4444'], primary: '#9A3412', accent: '#FDE047', price: 8.95 },
  ];
  sparkSmokeDefs.forEach((d, i) => {
    extra.push({
      id: `smk-${i + 1}`,
      name: d.name,
      brand: BRANDS[(i + 2) % BRANDS.length],
      category: 'Sparklers & Smoke',
      price: d.price,
      description: d.isSmoke
        ? `Dichte gekleurde rookpluim voor spectaculaire dag- en schemeringsrook.`
        : `Langdurig helder fonkelende sterren- en Bengaalse grondverlichting.`,
      shots: 1,
      caliberMm: d.isSmoke ? 32 : 14,
      durationSec: d.isSmoke ? 35 : 30,
      shapeType: d.isSmoke ? 'smoke' : 'fountain',
      primaryColor: d.primary,
      accentColor: d.accent,
      badgeText: d.isSmoke ? 'ROOK · 35S' : 'SPARKLER · 30S',
      style: d.isSmoke ? 'smoke_plume' : 'sparkler_shower',
      colors: d.colors,
      burstHeight: d.isSmoke ? 4.0 : 3.2,
      burstRadius: d.isSmoke ? 3.5 : 1.6,
      starCount: 22,
      hasCrackle: d.name.includes('Knetter') || d.name.includes('Crackling'),
      hasStrobe: d.name.includes('Strobe'),
      isFountain: true,
      isSmoke: d.isSmoke,
      shakeIntensity: 0.02,
    });
  });

  // 9. 14 Novelty & Premium Collector Fireworks
  const noveltyPremiumDefs: {
    name: string;
    shape: ShapeType;
    style: EffectStyle;
    colors: string[];
    primary: string;
    accent: string;
    price: number;
    shots: number;
    cal: number;
    dur: number;
    tier: 'standard' | 'pro' | 'premium';
    isSpinner?: boolean;
    isFountain?: boolean;
  }[] = [
    { name: 'Grondbloem Spinner Pack', shape: 'spinner', style: 'ground_spinner', colors: ['#EF4444', '#10B981', '#FDE047'], primary: '#7F1D1D', accent: '#FDE047', price: 4.50, shots: 1, cal: 15, dur: 12, tier: 'standard', isSpinner: true, isFountain: true },
    { name: 'Neon Draaitol XXL', shape: 'spinner', style: 'ground_spinner', colors: ['#22D3EE', '#EC4899', '#A855F7'], primary: '#581C87', accent: '#22D3EE', price: 6.95, shots: 1, cal: 20, dur: 16, tier: 'standard', isSpinner: true, isFountain: true },
    { name: 'Knetterende Vuurwiel', shape: 'spinner', style: 'ground_spinner', colors: ['#F59E0B', '#FFFFFF', '#FB923C'], primary: '#78350F', accent: '#F59E0B', price: 9.95, shots: 1, cal: 22, dur: 20, tier: 'standard', isSpinner: true, isFountain: true },
    { name: 'Fluitende Bijenkorf', shape: 'novelty', style: 'crackling', colors: ['#FDE047', '#FB923C', '#FFFFFF'], primary: '#9A3412', accent: '#FACC15', price: 8.50, shots: 12, cal: 14, dur: 10, tier: 'standard' },
    { name: 'Springende Knetterbal', shape: 'novelty', style: 'crackling', colors: ['#EF4444', '#FDE047', '#3B82F6'], primary: '#1E293B', accent: '#F97316', price: 5.95, shots: 6, cal: 16, dur: 8, tier: 'standard' },
    { name: 'Lucht Helikopter 5-Pack', shape: 'novelty', style: 'silver_glitter', colors: ['#FFFFFF', '#38BDF8', '#10B981'], primary: '#1E3A8A', accent: '#38BDF8', price: 11.50, shots: 5, cal: 18, dur: 12, tier: 'standard' },
    { name: 'Gouden Zon Rad', shape: 'spinner', style: 'ground_spinner', colors: ['#FBBF24', '#FDE047', '#FFFFFF'], primary: '#451A03', accent: '#FBBF24', price: 14.95, shots: 1, cal: 24, dur: 26, tier: 'pro', isSpinner: true, isFountain: true },
    { name: 'KroonVuurwerk Goudkist 250', shape: 'premium_box', style: 'golden_kamuro', colors: ['#F59E0B', '#FDE047', '#FFFFFF', '#FEF08A'], primary: '#1C1917', accent: '#FBBF24', price: 299.00, shots: 250, cal: 30, dur: 85, tier: 'premium' },
    { name: 'NoorderLicht Platinum Vault', shape: 'premium_box', style: 'silver_glitter', colors: ['#F8FAFC', '#38BDF8', '#A855F7', '#22D3EE'], primary: '#0F172A', accent: '#E2E8F0', price: 279.00, shots: 220, cal: 30, dur: 78, tier: 'premium' },
    { name: 'DonderWerk Master Crate 300', shape: 'premium_box', style: 'finale', colors: ['#EF4444', '#F59E0B', '#FFFFFF', '#3B82F6'], primary: '#450A0A', accent: '#F59E0B', price: 349.00, shots: 300, cal: 30, dur: 95, tier: 'premium' },
    { name: 'RijksPyro Koninklijke Kist', shape: 'premium_box', style: 'brocade_crown', colors: ['#F59E0B', '#2563EB', '#EF4444', '#FFFFFF'], primary: '#172554', accent: '#FCD34D', price: 319.00, shots: 240, cal: 30, dur: 82, tier: 'premium' },
    { name: 'HollandKruit Heritage 180', shape: 'premium_box', style: 'crossette', colors: ['#F97316', '#FFFFFF', '#10B981', '#FDE047'], primary: '#292524', accent: '#FB923C', price: 229.00, shots: 180, cal: 28, dur: 66, tier: 'premium' },
    { name: 'VlinderVlam Diamond Show', shape: 'premium_box', style: 'ring_burst', colors: ['#EC4899', '#22D3EE', '#FDE047', '#FFFFFF'], primary: '#3B0764', accent: '#F472B6', price: 259.00, shots: 196, cal: 30, dur: 72, tier: 'premium' },
    { name: 'OranjeKnallers 00:00 President', shape: 'premium_box', style: 'finale', colors: ['#F97316', '#FDE047', '#FFFFFF', '#EF4444'], primary: '#431407', accent: '#F59E0B', price: 399.00, shots: 360, cal: 30, dur: 105, tier: 'premium' },
  ];
  noveltyPremiumDefs.forEach((d, i) => {
    extra.push({
      id: `nov-${i + 1}`,
      name: d.name,
      brand: BRANDS[i % BRANDS.length],
      category: 'Novelty & Premium',
      price: d.price,
      description:
        d.tier === 'premium'
          ? `Exclusieve genummerde collector's editie met ${d.shots} zware ${d.cal}mm schoten.`
          : `Uniek sier- en effectvuurwerk met verrassende grond- en luchtbewegingen.`,
      shots: d.shots,
      caliberMm: d.cal,
      durationSec: d.dur,
      shapeType: d.shape,
      primaryColor: d.primary,
      accentColor: d.accent,
      badgeText: d.tier === 'premium' ? `COLLECTOR · ${d.shots}S` : `${d.dur} SEC · NOVELTY`,
      tier: d.tier,
      style: d.style,
      secondaryStyle: d.tier === 'premium' ? 'brocade_crown' : undefined,
      colors: d.colors,
      burstHeight: d.isSpinner ? 1.2 : d.tier === 'premium' ? 44 : 18,
      burstRadius: d.isSpinner ? 3.5 : d.tier === 'premium' ? 15 : 6.5,
      starCount: d.isSpinner ? 22 : d.tier === 'premium' ? 110 : 45,
      hasCrackle: d.style === 'crackling' || d.tier === 'premium',
      hasStrobe: d.tier === 'premium',
      hasTail: d.tier === 'premium',
      isFountain: d.isFountain,
      isSpinner: d.isSpinner,
      isWhistle: d.name.includes('Fluitende'),
      pattern: d.tier === 'premium' ? 'w_shape' : 'fan',
      shotInterval: d.tier === 'premium' ? 0.34 : 0.7,
      shakeIntensity: d.tier === 'premium' ? 0.85 : 0.25,
    });
  });

  // 10. +2 Finale Boxes (total 10 in Finale, total 220 products overall!)
  const extraFinales: RawProductDef[] = [
    {
      id: 'fn-ex-9', name: 'Eindschot Orkaan 180', brand: 'HollandKruit', category: 'Finale', price: 179.00,
      description: '180-schots razendsnelle waaierfinale met gouden kamuro en titanium knallen.',
      shots: 180, caliberMm: 25, durationSec: 20, shapeType: 'finale', primaryColor: '#18181B', accentColor: '#F59E0B',
      badgeText: 'FINALE · 180 SHOTS', tier: 'premium', style: 'golden_kamuro', secondaryStyle: 'salute',
      colors: ['#F59E0B', '#FDE047', '#FFFFFF'], burstHeight: 40, burstRadius: 14, starCount: 95,
      hasCrackle: true, hasTail: true, pattern: 'w_shape', shotInterval: 0.11, shakeIntensity: 0.9,
    },
    {
      id: 'fn-ex-10', name: 'Middernacht Klokslag 200', brand: 'RijksPyro', category: 'Finale', price: 199.00,
      description: 'Tweehonderd schoten in 22 seconden voor de ultieme jaarwisseling.',
      shots: 200, caliberMm: 25, durationSec: 22, shapeType: 'finale', primaryColor: '#312E81', accentColor: '#F43F5E',
      badgeText: 'FINALE · 200 SHOTS', tier: 'premium', style: 'finale', secondaryStyle: 'crossette',
      colors: ['#F43F5E', '#38BDF8', '#FDE047', '#FFFFFF'], burstHeight: 42, burstRadius: 14.5, starCount: 95,
      hasCrackle: true, hasStrobe: true, hasTail: true, pattern: 'salvo', shotInterval: 0.11, shakeIntensity: 0.95,
    },
  ];
  extra.push(...extraFinales);

  return extra;
}


// Large procedurally-authored catalogue: 2,000 additional distinct products.
// These are lightweight data entries and reuse the existing effect renderer.
function buildBonusAssortment(): RawProductDef[] {
  const palettes = [
    { name: 'Oranje', colors: ['#F97316', '#FDE047', '#FFFFFF'], primary: '#7C2D12', accent: '#FB923C', style: 'crackling' as EffectStyle },
    { name: 'Saffier', colors: ['#2563EB', '#60A5FA', '#FFFFFF'], primary: '#172554', accent: '#60A5FA', style: 'blue_peony' as EffectStyle },
    { name: 'Smaragd', colors: ['#10B981', '#6EE7B7', '#FDE047'], primary: '#064E3B', accent: '#34D399', style: 'green_peony' as EffectStyle },
    { name: 'Robijn', colors: ['#EF4444', '#F87171', '#FFFFFF'], primary: '#7F1D1D', accent: '#F87171', style: 'red_peony' as EffectStyle },
    { name: 'Gouden', colors: ['#F59E0B', '#FDE047', '#FEF3C7'], primary: '#78350F', accent: '#FBBF24', style: 'golden_willow' as EffectStyle },
    { name: 'Paarse', colors: ['#A855F7', '#E879F9', '#FFFFFF'], primary: '#581C87', accent: '#C084FC', style: 'chrysanthemum' as EffectStyle },
    { name: 'Zilveren', colors: ['#F8FAFC', '#CBD5E1', '#93C5FD'], primary: '#334155', accent: '#CBD5E1', style: 'silver_glitter' as EffectStyle },
    { name: 'Regenboog', colors: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'], primary: '#312E81', accent: '#F472B6', style: 'multi_color' as EffectStyle },
  ];
  const forms = [
    { name: 'Sterrenregen', shape: 'cake' as ShapeType, category: 'Cakes' as ProductCategory, shots: 25 },
    { name: 'Hemelboeket', shape: 'shell' as ShapeType, category: 'Aerial Fireworks' as ProductCategory, shots: 1 },
    { name: 'Mega Compound', shape: 'compound' as ShapeType, category: 'Compounds' as ProductCategory, shots: 100 },
    { name: 'Waaierfinale', shape: 'finale' as ShapeType, category: 'Finale' as ProductCategory, shots: 80 },
    { name: 'Luchtpijl', shape: 'rocket' as ShapeType, category: 'Rockets' as ProductCategory, shots: 1 },
    { name: 'Romeinse Lichtshow', shape: 'candle' as ShapeType, category: 'Roman Candles' as ProductCategory, shots: 12 },
    { name: 'Vonkfontein', shape: 'fountain' as ShapeType, category: 'Fountains' as ProductCategory, shots: 1 },
    { name: 'Donderslag', shape: 'thunderking' as ShapeType, category: 'Thunder Kings' as ProductCategory, shots: 1 },
  ];
  const brands = ['KroonVuurwerk', 'DonderWerk', 'PolderPyro', 'NoorderLicht', 'OranjeKnallers', 'VlinderVlam'];
  const patterns: FiringPattern[] = ['straight', 'fan', 'v_shape', 'w_shape', 'z_sweep', 'salvo'];
  return Array.from({ length: 2000 }, (_, i) => {
    const palette = palettes[i % palettes.length];
    const form = forms[Math.floor(i / palettes.length) % forms.length];
    const variant = Math.floor(i / (palettes.length * forms.length)) + 1;
    const shots = form.shots + (form.shots > 1 ? (i % 9) * 3 : 0);
    const duration = form.shape === 'fountain' ? 18 + i % 18 : Math.max(2, Math.round(shots * 0.42));
    return {
      id: `bonus-${String(i + 1).padStart(4, '0')}`,
      name: `${palette.name} ${form.name} ${String(variant).padStart(3, '0')}`,
      brand: brands[i % brands.length],
      category: form.category,
      price: Number((4.95 + (i % 47) * 2.35 + (form.shots > 50 ? 45 : 0)).toFixed(2)),
      description: `Extra catalogusmodel ${i + 1}: ${shots} schoten met ${palette.name.toLowerCase()} effecten.`,
      shots, caliberMm: [20, 25, 30][i % 3], durationSec: duration,
      shapeType: form.shape, primaryColor: palette.primary, accentColor: palette.accent,
      badgeText: `${shots} SHOTS`, tier: i % 11 === 0 ? 'premium' : i % 4 === 0 ? 'pro' : 'standard',
      style: palette.style, secondaryStyle: i % 3 === 0 ? 'crackling' : undefined,
      colors: palette.colors, burstHeight: 24 + (i % 20), burstRadius: 6 + (i % 9),
      starCount: 35 + (i % 36), hasCrackle: i % 3 === 0, hasStrobe: i % 5 === 0,
      hasTail: i % 2 === 0, isFountain: form.shape === 'fountain',
      isRocket: form.shape === 'rocket', pattern: patterns[i % patterns.length],
      shotInterval: 0.28 + (i % 7) * 0.08, shakeIntensity: 0.25 + (i % 5) * 0.1,
    };
  });
}

const ALL_RAW = [...CORE_PRODUCTS, ...buildExpandedAssortment(), ...buildBonusAssortment()];

export const PRODUCTS: FireworkProduct[] = ALL_RAW.map((r) => ({
  id: r.id,
  name: r.name,
  brand: r.brand,
  category: r.category,
  price: r.price,
  description: r.description,
  shots: r.shots,
  caliberMm: r.caliberMm,
  durationSec: r.durationSec,
  shapeType: r.shapeType,
  primaryColor: r.primaryColor,
  accentColor: r.accentColor,
  badgeText: r.badgeText,
  tier: r.tier || 'standard',
  effect: {
    style: r.style,
    secondaryStyle: r.secondaryStyle,
    colors: r.colors,
    burstHeight: r.burstHeight,
    burstRadius: r.burstRadius,
    starCount: r.starCount,
    hasCrackle: Boolean(r.hasCrackle),
    hasStrobe: Boolean(r.hasStrobe),
    hasTail: Boolean(r.hasTail),
    isFountain: Boolean(r.isFountain),
    isRocket: Boolean(r.isRocket),
    isWhistle: Boolean(r.isWhistle),
    isSmoke: Boolean(r.isSmoke),
    isSpinner: Boolean(r.isSpinner),
    pattern: r.pattern || 'straight',
    shotInterval: r.shotInterval ?? 0.65,
    shakeIntensity: r.shakeIntensity ?? 0.4,
  },
}));

export const PRODUCT_MAP = new Map<string, FireworkProduct>(
  PRODUCTS.map((p) => [p.id, p]),
);

export const CATEGORIES: ProductCategory[] = [
  'Thunder Kings',
  'Cakes',
  'Compounds',
  'Aerial Fireworks',
  'Fountains',
  'Rockets',
  'Roman Candles',
  'Sparklers & Smoke',
  'Novelty & Premium',
  'Finale',
];
