// Tipos base para las respuestas de Strapi
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiEntity {
  id: number;
  attributes: {
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

// Tipos para imágenes de Strapi
export interface StrapiImage {
  data: {
    id: number;
    attributes: {
      name: string;
      alternativeText: string | null;
      caption: string | null;
      width: number;
      height: number;
      formats: {
        thumbnail: StrapiImageFormat;
        small: StrapiImageFormat;
        medium: StrapiImageFormat;
        large: StrapiImageFormat;
      };
      hash: string;
      ext: string;
      mime: string;
      size: number;
      url: string;
      previewUrl: string | null;
      provider: string;
      provider_metadata: unknown;
      createdAt: string;
      updatedAt: string;
    };
  } | null;
}

export interface StrapiImageFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  path: string | null;
  width: number;
  height: number;
  size: number;
  sizeInBytes: number;
  url: string;
}

// Unión de biomas/ecosistemas (debe coincidir con el enum del backend)
export type BiomeName = 'forest' | 'aqua' | 'volcanic' | 'space' | 'snow' | 'arid';
// Unión de rarezas (debe coincidir con el enum del backend)
export type RarityName = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Estrategia de descubrimiento de un monstruo (campo json en el backend).
// Una tarea queda definida por su `type` + `params` libres; el motor server-side
// es la única fuente de verdad de su evaluación.
export interface DiscoveryTask {
  type: string;
  label?: string;
  params?: Record<string, unknown>;
}
export interface DiscoveryStrategy {
  ordered?: boolean;
  tasks: DiscoveryTask[];
}

// Tipos específicos para cada entidad basados en la respuesta real
export interface Monster extends StrapiEntity {
  attributes: {
    Name: string;
    Image: StrapiImage | null;
    Nature: string | null;
    Origin: string | null;
    AverageHeight: number | null;
    AverageWeight: number | null;
    InnateAbility: string | null;
    Biome: BiomeName | null;
    // Mundo al que pertenece la criatura (relación). El bioma sigue siendo propio
    // del monstruo; el mundo es un dato aparte.
    World?: { data: World | null };
    DiscoveryStrategy?: DiscoveryStrategy | null;
    // Stats base de la especie (heredados por el compañero al crearse)
    BaseHealth: number | null;
    BaseStrength: number | null;
    BaseDefense: number | null;
    BaseSpeed: number | null;
    BaseLuck: number | null;
    BaseLevel: number | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface Place extends StrapiEntity {
  attributes: {
    Name: string;
    Description: string | null;
    Banner: StrapiImage | null;
    Type: 'shop' | 'game' | 'information' | 'battledome' | 'training' | 'neighborhood';
    Biome: BiomeName | null;
    HotspotX: number | null;
    HotspotY: number | null;
    Hidden?: boolean;
    World?: { data: World | null };
    region?: { data: Region | null };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

// Región: capa intermedia entre Mundo y Lugar. Agrupa lugares dentro de un mundo
// y se ubica en el mapa del mundo vía HotspotX/HotspotY.
export interface Region extends StrapiEntity {
  attributes: {
    Name: string;
    Description: string | null;
    Banner: StrapiImage | null;
    Biome: BiomeName | null;
    HotspotX: number | null;
    HotspotY: number | null;
    Hidden?: boolean;
    World?: { data: World | null };
    places?: {
      data: Place[];
    };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface World extends StrapiEntity {
  attributes: {
    Name: string;
    Description: string | null;
    Image: StrapiImage | null;
    Hidden?: boolean;
    places: {
      data: Place[];
    };
    regions?: {
      data: Region[];
    };
    monsters?: {
      data: Monster[];
    };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

// Tipos para las respuestas de la API
export type MonstersResponse = StrapiResponse<Monster[]>;
export type WorldsResponse = StrapiResponse<World[]>;
export type PlacesResponse = StrapiResponse<Place[]>;
export type RegionsResponse = StrapiResponse<Region[]>;

// Tipos para respuestas de getById (un solo objeto)
export type MonsterResponse = StrapiResponse<Monster>;
export type WorldResponse = StrapiResponse<World>;
export type PlaceResponse = StrapiResponse<Place>;
export type RegionResponse = StrapiResponse<Region>;

// Tipos para parámetros de consulta
export interface QueryParams {
  populate?: string | string[] | Record<string, unknown>;
  sort?: string | string[];
  filters?: Record<string, string>;
  pagination?: {
    page?: number;
    pageSize?: number;
  };
  fields?: string[];
}

// Tipo para errores de la API
export interface ApiError {
  message: string;
  status: number;
  details?: unknown;
}

// Tipos para autenticación
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  balance?: number;
  // Solo presente cuando se pide con populate (shape aplanado de users-permissions)
  discoveredMonsters?: { id: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  jwt: string;
  user: AuthUser;
}

export interface AuthError {
  error: {
    message: string;
    status: number;
    details?: unknown;
  };
}

// Tipos para el content type Item
export interface Item extends StrapiEntity {
  attributes: {
    name: string;
    slug: string;
    description: string | null;
    type: 'weapon' | 'armor' | 'consumable' | 'key' | 'misc';
    rarity: RarityName;
    category?: 'fruit' | 'vegetable' | 'meat' | 'seafood' | 'legume' | 'totem' | 'weapon' | 'armor' | 'potion' | 'furniture' | null;
    icon: StrapiImage | null;
    weight: number | null;
    value: number | null;
    // Stats de equipamiento (0 por defecto; >0 en armas/armaduras/tótems).
    attack: number;
    defense: number;
    // Curación (0 por defecto; >0 en pociones — restaura salud del compañero).
    heal: number;
    is_stackable: boolean;
    max_stack: number;
    usable: boolean;
    cooldown: number;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

// Tipos para las respuestas de Item
export type ItemsResponse = StrapiResponse<Item[]>;
export type ItemResponse = StrapiResponse<Item>;

// ============ Compañero (relación usuario ↔ monstruo + cuidados) ============
export interface Companion extends StrapiEntity {
  attributes: {
    happiness: number;
    energy: number;
    bond: number;
    isActive: boolean;
    lastInteraction: string | null;
    // Stats de progresión/combate (arrancan en el base de la especie)
    health: number;
    // Salud actual: baja en los duelos; 0 = debilitado (no puede pelear hasta curarse).
    currentHealth: number;
    strength: number;
    defense: number;
    speed: number;
    luck: number;
    level: number;
    // Entrenamiento en curso (escuela de adiestramiento): null si no entrena.
    trainingStat?: 'strength' | 'defense' | 'speed' | 'health' | 'level' | null;
    trainingEndsAt?: string | null;
    monster?: { data: Monster | null };
    // Objetos equipados (hasta 5). Suman su ataque/defensa al total efectivo.
    equippedItems?: { data: Item[] };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}
export type CompanionsResponse = StrapiResponse<Companion[]>;
export type CompanionResponse = StrapiResponse<Companion>;

// ============ Entrada de inventario (objeto + cantidad) ============
export interface InventoryEntry extends StrapiEntity {
  attributes: {
    quantity: number;
    item?: { data: Item | null };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}
export type InventoryEntriesResponse = StrapiResponse<InventoryEntry[]>;

// ============ Stock de tienda (place de tipo shop) ============
// Una línea de stock: un objeto con su cantidad disponible en la tienda.
export interface ShopStockLine {
  quantity: number;
  item: Item;
}
// Respuesta de GET /shop/:placeId/stock (y campo `stock` de la compra).
export interface ShopStock {
  items: ShopStockLine[];
  total: number;
  // Si la tienda está agotada, momento en que se reabastece y segundos restantes.
  restockAt: string | null;
  restockInSeconds: number | null;
}

// Respuesta del endpoint de compra (POST /shop/buy)
export interface BuyResponse {
  balance: number;
  entry: { id: number; quantity: number };
  // Monstruos recién descubiertos por efecto de la compra (p. ej. "comprar en X").
  newlyDiscovered?: Monster[];
  // Stock actualizado de la tienda tras la compra.
  stock?: ShopStock;
}

// ============ Descubrimiento de monstruos ============
export type DiscoveryEventType = 'visit_place' | 'play_place' | 'buy_item' | 'read_book';

export interface DiscoveryEventRequest {
  type: DiscoveryEventType;
  placeId?: number;
  itemId?: number;
  bookId?: string;
}

// Respuesta de /discovery/event y /discovery/sync
export interface DiscoveryResponse {
  newlyDiscovered: Monster[];
  newWorlds?: World[];
  newRegions?: Region[];
  newPlaces?: Place[];
}

// ============ Motor de eventos ============
export type EventStatus = 'not_started' | 'in_progress' | 'completed';

export interface EventStepView {
  key: string;
  label: string | null;
  type: string;
  done: boolean;
  current: boolean;
}

// Config de recompensas del evento (solo se expone al completarlo).
export interface EventRewardsConfig {
  coins?: number;
  items?: { name: string; quantity?: number }[];
  discoverWorld?: string;
}

// Vista de un evento + el progreso del usuario (GET /events/active, /events/:id).
export interface EventView {
  eventId: number;
  name: string;
  description: string | null;
  active: boolean;
  startsAt: string | null;
  status: EventStatus;
  currentStep: number;
  total: number;
  steps: EventStepView[];
  rewards?: EventRewardsConfig | null;
  state: Record<string, unknown>;
}

// Recompensa otorgada al completar un evento (POST /events/:id/step/:key).
export interface EventRewardResult {
  coins: number;
  items: { itemId: number; quantity: number }[];
  discovery: {
    world: World | null;
    regions: Region[];
    places: Place[];
  } | null;
}

export interface EventStepResponse {
  view: EventView;
  rewardsGranted: EventRewardResult | null;
}

// ============ Battledome (duelos por turnos en vivo) ============
export type DuelStatus = 'open' | 'active' | 'finished' | 'cancelled';
export type DuelSide = 'creator' | 'opponent';
export type BattleAction = 'atacar' | 'defender' | 'esquivar';

// Resumen de un duelo en el lobby del battledome.
export interface DuelSummary {
  id: number;
  status: DuelStatus;
  wager: number;
  creator: { userId: number; username: string } | null;
  monsterName: string;
  monsterImageUrl: string | null;
  level: number;
}
export interface DuelsLobby {
  open: DuelSummary[];
  mine: DuelSummary[];
}

// Objeto equipado (aplanado) que el peleador puede usar en su turno.
export interface BattleItem {
  id: number;
  name: string;
  rarity: RarityName;
  type: string;
  category: string | null;
  attack: number;
  defense: number;
  heal: number;
  iconUrl: string | null;
}
// Compañero preparado para la pantalla de batalla.
export interface BattleCompanion {
  id: number;
  monsterName: string;
  biome: BiomeName | null;
  imageUrl: string | null;
  level: number;
  maxHp: number;
  currentHealth: number;
  strength: number;
  defense: number;
  speed: number;
  luck: number;
  items: BattleItem[];
}
// Duelo poblado (GET /battle/duels/:id → { duel }).
export interface DuelDetail {
  id: number;
  status: DuelStatus;
  wager: number;
  arena: BiomeName;
  place: { id: number; name: string; worldId: number | null; worldName: string | null } | null;
  creator: { userId: number; username: string } | null;
  opponent: { userId: number; username: string } | null;
  winner: { userId: number; username: string } | null;
  creatorCompanion: BattleCompanion | null;
  opponentCompanion: BattleCompanion | null;
  result: BattleResult | null;
}

// Estado de combate difundido por el socket (server-authoritative).
export interface BattleFighter {
  side: DuelSide;
  userId: number;
  username: string;
  companionId: number;
  monsterName: string;
  biome: BiomeName | null;
  level: number;
  maxHp: number;
  hp: number;
  strength: number;
  defense: number;
  speed: number;
  luck: number;
  guard: { type: 'defend' | 'dodge'; mult?: number; chance?: number } | null;
  items: BattleItem[];
}
export interface BattleState {
  duelId: number;
  arena: BiomeName;
  wager: number;
  round: number;
  firstMover: DuelSide;
  turn: DuelSide;
  over: boolean;
  winner: DuelSide | null;
  creator: BattleFighter;
  opponent: BattleFighter;
}
// Entrada estructurada del historial de jugadas (el front la formatea).
export interface BattleLogEntry {
  round: number;
  side: DuelSide;
  actorName: string;
  action: BattleAction;
  item: { name: string; rarity: RarityName } | null;
  dmg?: number;
  crit?: boolean;
  miss?: boolean;
  heal?: number;
  chance?: number;
}
export interface BattleResult {
  winner: DuelSide;
  winnerUserId: number | null;
  reason: 'ko' | 'forfeit';
  creatorHp: number;
  opponentHp: number;
  wager: number;
  rounds: number | null;
}

// ===== Motor de juegos (places de tipo `game`) =====
// Estado del juego para el usuario: qué juego corre + cooldown global de reclamo.
export interface GameStatus {
  gameKey: string;
  cooldownHours: number;
  difficulty: string | null; // 'easy' | 'medium' | 'hard' | null
  bestScore: number;         // mejor puntaje crudo del usuario en ese juego (0 si nunca jugó)
  maxReward: number;         // tope de monedas por reclamo (cap del motor)
  canClaim: boolean;
  secondsLeft: number;
  nextClaimAt: string | null;
}
// Una fila de la tabla de récords de un juego.
export interface GameLeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  score: number; // mejor puntaje crudo del usuario (en la unidad del juego)
  me: boolean;   // true si es el usuario logueado
}
// Tabla de récords: top-N + el standing propio si quedó fuera del top.
export interface GameLeaderboard {
  gameKey: string;
  total: number;
  top: GameLeaderboardEntry[];
  me: { rank: number; score: number } | null;
}
// Respuesta del reclamo: recompensa acreditada + saldo nuevo + cooldown reiniciado.
export interface GameClaimResponse {
  reward: number;
  balance: number;
  gameKey: string;
  bestScore: number;
  canClaim: boolean;
  secondsLeft: number;
  nextClaimAt: string | null;
}

/* ===== Escuela de entrenamiento ===== */
export type TrainStat = 'strength' | 'defense' | 'speed' | 'health' | 'level';
// Entrenador de la escuela (nombre, imagen, disciplinas en las que es experto).
export interface TrainerInfo {
  name: string;
  imageUrl: string | null;
  specialties: TrainStat[];
}
// Una disciplina entrenable, con su valor actual, tope y cuánto sube (+1 ó +2).
export interface TrainStatRow {
  key: TrainStat;
  value: number;
  cap: number;
  canTrain: boolean;
  gain: number;
}
// Tótem puntual exigido por el entrenador para el próximo entrenamiento.
export interface DemandedTotem {
  id: number;
  name: string;
  rarity: string;
  iconUrl: string | null;
}
// Estado de la escuela para un compañero: o está entrenando, o está libre.
export type TrainingInfo =
  | {
      status: 'training';
      stat: TrainStat;
      gain: number;
      endsAt: string;
      secondsLeft: number;
      trainer: TrainerInfo | null;
    }
  | {
      status: 'idle';
      level: number;
      requiredRarity: string;
      days: number;
      trainer: TrainerInfo | null;
      demandedTotem: DemandedTotem | null;
      ownsDemanded: boolean;
      stats: TrainStatRow[];
    };

// ============ Vecindario / Casas (place de tipo neighborhood) ============
export type HouseVisibility = 'public' | 'private';

// Una variante de casa que ofrece el vecindario (resumen plano del endpoint).
export interface HouseDesignInfo {
  id: number;
  name: string;
  imageUrl: string | null;
  interiorUrl: string | null;
}

// Estado de una parcela del mapa del vecindario.
export interface NeighborhoodParcel {
  index: number;
  occupied: boolean;
  owner: { id: number; username: string } | null;
  visibility: HouseVisibility | null;
  houseId: number | null;
  designImageUrl: string | null;
  canEnter: boolean;
  mine: boolean;
}

// Respuesta de GET /neighborhoods/:placeId/parcels.
export interface NeighborhoodParcels {
  cols: number;
  rows: number;
  price: number;
  parcelImageUrl: string | null;
  designs: HouseDesignInfo[];
  parcels: NeighborhoodParcel[];
  // Mi casa (una sola en todo el juego); null si todavía no tengo.
  myHouseId: number | null;
}

// Diseño de casa en shape REST (devuelto dentro de la casa).
export interface HouseDesign {
  id: number;
  attributes: {
    Name: string;
    Image: StrapiImage | null;
    Interior: StrapiImage | null;
  };
}

// Un mueble colocado en un cubo de la casa.
export interface HousePlacement {
  id: number;
  attributes: {
    x: number;
    y: number;
    item?: { data: Item | null };
  };
}

// Casa de un usuario (shape REST devuelto por el controller).
export interface House {
  id: number;
  attributes: {
    parcelIndex: number;
    visibility: HouseVisibility;
    width: number;
    height: number;
    owner: { id: number; username: string } | null;
    place: { id: number; Name: string } | null;
    design?: { data: HouseDesign | null };
    placements?: { data: HousePlacement[] };
  };
}

// Respuesta de los endpoints de casa: { data: House, isOwner }.
export interface HouseResponse {
  data: House | null;
  isOwner: boolean;
}

// Respuesta de la compra de casa: { data: House, balance }.
export interface HouseBuyResponse {
  data: House;
  balance: number;
}
