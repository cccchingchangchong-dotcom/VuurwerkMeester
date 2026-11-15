export type ProductCategory =
  | 'Thunder Kings'
  | 'Cakes'
  | 'Compounds'
  | 'Aerial Fireworks'
  | 'Fountains'
  | 'Rockets'
  | 'Roman Candles'
  | 'Sparklers & Smoke'
  | 'Novelty & Premium'
  | 'Finale';

export type ShapeType =
  | 'thunderking'
  | 'compound'
  | 'cake'
  | 'fountain'
  | 'candle'
  | 'rocket'
  | 'shell'
  | 'finale'
  | 'smoke'
  | 'novelty'
  | 'spinner'
  | 'premium_box';

export type EffectStyle =
  | 'golden_willow'
  | 'golden_kamuro'
  | 'red_peony'
  | 'blue_peony'
  | 'green_peony'
  | 'chrysanthemum'
  | 'brocade_crown'
  | 'crackling'
  | 'silver_glitter'
  | 'white_strobe'
  | 'palm'
  | 'crackle_palm'
  | 'multi_color'
  | 'ring_burst'
  | 'crossette'
  | 'comet_mine'
  | 'finale'
  | 'fountain_gold'
  | 'fountain_crackling'
  | 'fountain_color'
  | 'sparkler_shower'
  | 'smoke_plume'
  | 'ground_spinner'
  | 'salute';

export type FiringPattern = 'straight' | 'fan' | 'v_shape' | 'w_shape' | 'z_sweep' | 'salvo';

export interface FireworkEffectProfile {
  style: EffectStyle;
  secondaryStyle?: EffectStyle;
  colors: string[]; // hex strings
  burstHeight: number; // meters
  burstRadius: number;
  starCount: number;
  hasCrackle: boolean;
  hasStrobe: boolean;
  hasTail: boolean;
  isFountain?: boolean;
  isRocket?: boolean;
  isWhistle?: boolean;
  isSmoke?: boolean;
  isSpinner?: boolean;
  pattern: FiringPattern;
  shotInterval: number; // seconds between shots
  shakeIntensity: number; // 0 to 1
}

export interface FireworkProduct {
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
  effect: FireworkEffectProfile;
}

export interface InventoryItem {
  productId: string;
  quantity: number;
}

export interface BasketItem {
  productId: string;
  quantity: number;
}

export interface PurchaseRecord {
  id: string;
  timestamp: number;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
  total: number;
}

export interface PlacedFireworkData {
  uid: string;
  productId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  state: 'idle' | 'fusing' | 'firing' | 'spent';
}

export interface ShowCue {
  id: string;
  productId: string;
  triggerTime: number; // seconds from show start
  padIndex: number; // 0..6 across display area
  angleDeg: number; // -25 to +25
}

export interface CustomShow {
  id: string;
  name: string;
  cues: ShowCue[];
  createdAt: number;
}

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra' | 'cinematic';

export type WeatherMode = 'clear' | 'rain' | 'mist' | 'wind' | 'auto';

export interface GameSettings {
  infiniteMoney: boolean;
  screenShake: boolean;
  graphicsQuality: GraphicsQuality;
  autoGraphics: boolean;
  resolutionScale: number; // 0.5 to 1.0
  mouseSensitivity: number; // 0.3 to 2.5
  soundVolume: number; // 0 to 1
  musicVolume: number; // 0 to 1
  muted: boolean;
  vsync: boolean;
  performanceMode: boolean;
  timeOfDay: 'night' | 'dusk' | 'day' | 'auto';
  weather: WeatherMode;
}

export type ActiveScreen =
  | 'menu'
  | 'playing'
  | 'shop'
  | 'inventory'
  | 'display'
  | 'settings'
  | 'credits'
  | 'multiplayer'
  | 'test_lab';

export type TutorialStep =
  | 'welcome'
  | 'enter_shop'
  | 'buy_firework'
  | 'equip_item'
  | 'place_firework'
  | 'equip_lighter'
  | 'ignite_fuse'
  | 'complete';

export interface SaveState {
  version: number;
  playerName: string;
  money: number;
  inventory: InventoryItem[];
  hotbar: (string | null)[]; // 6 slots of productId
  purchaseHistory: PurchaseRecord[];
  placedFireworks: PlacedFireworkData[];
  customShows: CustomShow[];
  settings: GameSettings;
  tutorialStep: TutorialStep;
  tutorialDismissed: boolean;
  totalShotsFired: number;
}

// ==================== MULTIPLAYER TYPES ====================

export type PlayerAnimState = 'idle' | 'walk' | 'run' | 'jump';

export interface RemotePlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  animState: PlayerAnimState;
  equippedTool: 'none' | 'lighter' | 'product';
  equippedProductId: string | null;
  isShopping: boolean;
  ready: boolean;
  zone: string;
  mutedByHost: boolean;
  inventoryCount: number;
  showcaseProductId?: string | null;
}

export interface RoomSummary {
  id: string;
  code: string;
  name: string;
  isPublic: boolean;
  playerCount: number;
  maxPlayers: number;
  hostName: string;
}

export interface RoomChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

export interface RoomPlacedFirework extends PlacedFireworkData {
  ownerId: string;
  ownerName: string;
}

export interface RoomStatePayload {
  id: string;
  code: string;
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  hostId: string;
  players: RemotePlayerState[];
  placedFireworks: RoomPlacedFirework[];
  chatHistory: RoomChatMessage[];
}

export interface FastTravelMarker {
  id: string;
  name: string;
  district: string;
  x: number;
  z: number;
  yaw: number;
  color: string;
}

