import type { Attribute, Schema } from '@strapi/strapi';

export interface AdminApiToken extends Schema.CollectionType {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    expiresAt: Attribute.DateTime;
    lastUsedAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    type: Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Attribute.Required &
      Attribute.DefaultTo<'read-only'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    token: Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminPermission extends Schema.CollectionType {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Attribute.JSON & Attribute.DefaultTo<{}>;
    conditions: Attribute.JSON & Attribute.DefaultTo<[]>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    properties: Attribute.JSON & Attribute.DefaultTo<{}>;
    role: Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    subject: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminRole extends Schema.CollectionType {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    description: Attribute.String;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::role',
      'oneToMany',
      'admin::permission'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    users: Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
  };
}

export interface AdminTransferToken extends Schema.CollectionType {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    expiresAt: Attribute.DateTime;
    lastUsedAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    token: Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminUser extends Schema.CollectionType {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Attribute.Boolean & Attribute.Private & Attribute.DefaultTo<false>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.Private &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    lastname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Attribute.String;
    registrationToken: Attribute.String & Attribute.Private;
    resetPasswordToken: Attribute.String & Attribute.Private;
    roles: Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Attribute.Private;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    username: Attribute.String;
  };
}

export interface ApiCompanionCompanion extends Schema.CollectionType {
  collectionName: 'companions';
  info: {
    description: 'V\u00EDnculo entre un usuario y un monstruo que cuida, con sus stats de cuidado';
    displayName: 'Companion';
    pluralName: 'companions';
    singularName: 'companion';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bond: Attribute.Integer &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::companion.companion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    currentHealth: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<100>;
    defense: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<10>;
    demandedTotem: Attribute.Relation<
      'api::companion.companion',
      'manyToOne',
      'api::item.item'
    >;
    energy: Attribute.Integer &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<50>;
    equippedItems: Attribute.Relation<
      'api::companion.companion',
      'manyToMany',
      'api::item.item'
    >;
    happiness: Attribute.Integer &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<50>;
    health: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<100>;
    isActive: Attribute.Boolean & Attribute.DefaultTo<false>;
    lastInteraction: Attribute.DateTime;
    level: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Attribute.DefaultTo<1>;
    luck: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<5>;
    monster: Attribute.Relation<
      'api::companion.companion',
      'manyToOne',
      'api::monster.monster'
    >;
    speed: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<10>;
    strength: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<10>;
    trainingEndsAt: Attribute.DateTime;
    trainingGain: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Attribute.DefaultTo<1>;
    trainingStat: Attribute.Enumeration<
      ['strength', 'defense', 'speed', 'health', 'level']
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::companion.companion',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    user: Attribute.Relation<
      'api::companion.companion',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiDuelDuel extends Schema.CollectionType {
  collectionName: 'duels';
  info: {
    description: 'Duelo por turnos entre dos compa\u00F1eros en un lugar de tipo battledome';
    displayName: 'Duel';
    pluralName: 'duels';
    singularName: 'duel';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::duel.duel', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    creator: Attribute.Relation<
      'api::duel.duel',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    creatorCompanion: Attribute.Relation<
      'api::duel.duel',
      'oneToOne',
      'api::companion.companion'
    >;
    opponent: Attribute.Relation<
      'api::duel.duel',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    opponentCompanion: Attribute.Relation<
      'api::duel.duel',
      'oneToOne',
      'api::companion.companion'
    >;
    place: Attribute.Relation<'api::duel.duel', 'oneToOne', 'api::place.place'>;
    result: Attribute.JSON;
    status: Attribute.Enumeration<['open', 'active', 'finished', 'cancelled']> &
      Attribute.Required &
      Attribute.DefaultTo<'open'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'api::duel.duel', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    wager: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    winner: Attribute.Relation<
      'api::duel.duel',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiInventoryEntryInventoryEntry extends Schema.CollectionType {
  collectionName: 'inventory_entries';
  info: {
    description: 'Entrada de inventario de un usuario: relaciona un objeto con una cantidad';
    displayName: 'Inventory Entry';
    pluralName: 'inventory-entries';
    singularName: 'inventory-entry';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::inventory-entry.inventory-entry',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    item: Attribute.Relation<
      'api::inventory-entry.inventory-entry',
      'manyToOne',
      'api::item.item'
    >;
    quantity: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<1>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::inventory-entry.inventory-entry',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    user: Attribute.Relation<
      'api::inventory-entry.inventory-entry',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiItemItem extends Schema.CollectionType {
  collectionName: 'items';
  info: {
    description: 'Objetos del juego que pueden ser recolectados y usados por los jugadores';
    displayName: 'Item';
    pluralName: 'items';
    singularName: 'item';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    attack: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    category: Attribute.Enumeration<
      [
        'fruit',
        'vegetable',
        'meat',
        'seafood',
        'legume',
        'totem',
        'weapon',
        'armor',
        'potion'
      ]
    >;
    cooldown: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::item.item', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    defense: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    description: Attribute.RichText;
    heal: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    icon: Attribute.Media<'images'>;
    is_stackable: Attribute.Boolean & Attribute.DefaultTo<false>;
    max_stack: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Attribute.DefaultTo<1>;
    name: Attribute.String & Attribute.Required & Attribute.Unique;
    publishedAt: Attribute.DateTime;
    rarity: Attribute.Enumeration<
      ['common', 'uncommon', 'rare', 'epic', 'legendary']
    > &
      Attribute.Required;
    slug: Attribute.UID<'api::item.item', 'name'> &
      Attribute.Required &
      Attribute.Unique;
    type: Attribute.Enumeration<
      ['weapon', 'armor', 'consumable', 'key', 'misc']
    > &
      Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'api::item.item', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    usable: Attribute.Boolean & Attribute.DefaultTo<false>;
    users: Attribute.Relation<
      'api::item.item',
      'manyToMany',
      'plugin::users-permissions.user'
    > &
      Attribute.Private;
    value: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    weight: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

export interface ApiMonsterMonster extends Schema.CollectionType {
  collectionName: 'monsters';
  info: {
    description: '';
    displayName: 'Monster';
    pluralName: 'monsters';
    singularName: 'monster';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    AverageHeight: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    AverageWeight: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    BaseDefense: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<10>;
    BaseHealth: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Attribute.DefaultTo<100>;
    BaseLevel: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Attribute.DefaultTo<1>;
    BaseLuck: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<5>;
    BaseSpeed: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<10>;
    BaseStrength: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<10>;
    Biome: Attribute.Enumeration<
      ['forest', 'aqua', 'volcanic', 'space', 'snow', 'arid']
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::monster.monster',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    DiscoveryStrategy: Attribute.JSON;
    Image: Attribute.Media<'images'>;
    InnateAbility: Attribute.Text;
    Name: Attribute.String & Attribute.Required & Attribute.Unique;
    Nature: Attribute.Text;
    Origin: Attribute.Text;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::monster.monster',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    World: Attribute.Relation<
      'api::monster.monster',
      'manyToOne',
      'api::world.world'
    >;
  };
}

export interface ApiPlacePlace extends Schema.CollectionType {
  collectionName: 'places';
  info: {
    description: '';
    displayName: 'Place';
    pluralName: 'places';
    singularName: 'place';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    Banner: Attribute.Media<'images'>;
    Biome: Attribute.Enumeration<
      ['forest', 'aqua', 'volcanic', 'space', 'snow', 'arid']
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::place.place',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    Description: Attribute.Text;
    Difficulty: Attribute.Enumeration<['easy', 'medium', 'hard']>;
    GameKey: Attribute.String;
    HotspotX: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    HotspotY: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    Name: Attribute.String & Attribute.Required & Attribute.Unique;
    publishedAt: Attribute.DateTime;
    region: Attribute.Relation<
      'api::place.place',
      'manyToOne',
      'api::region.region'
    >;
    RestockAt: Attribute.DateTime;
    ShopConfig: Attribute.JSON;
    Type: Attribute.Enumeration<
      ['shop', 'game', 'information', 'battledome', 'training']
    > &
      Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::place.place',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    World: Attribute.Relation<
      'api::place.place',
      'manyToOne',
      'api::world.world'
    >;
  };
}

export interface ApiRegionRegion extends Schema.CollectionType {
  collectionName: 'regions';
  info: {
    description: 'Regi\u00F3n: agrupa lugares dentro de un mundo.';
    displayName: 'Region';
    pluralName: 'regions';
    singularName: 'region';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    Banner: Attribute.Media<'images'>;
    Biome: Attribute.Enumeration<
      ['forest', 'aqua', 'volcanic', 'space', 'snow', 'arid']
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::region.region',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    Description: Attribute.Text;
    HotspotX: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    HotspotY: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    Name: Attribute.String & Attribute.Required & Attribute.Unique;
    places: Attribute.Relation<
      'api::region.region',
      'oneToMany',
      'api::place.place'
    >;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::region.region',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    World: Attribute.Relation<
      'api::region.region',
      'manyToOne',
      'api::world.world'
    >;
  };
}

export interface ApiShopStockShopStock extends Schema.CollectionType {
  collectionName: 'shop_stocks';
  info: {
    description: 'Stock vivo de una tienda: relaciona un lugar (tienda) con un objeto y su cantidad disponible';
    displayName: 'Shop Stock';
    pluralName: 'shop-stocks';
    singularName: 'shop-stock';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::shop-stock.shop-stock',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    item: Attribute.Relation<
      'api::shop-stock.shop-stock',
      'manyToOne',
      'api::item.item'
    >;
    place: Attribute.Relation<
      'api::shop-stock.shop-stock',
      'manyToOne',
      'api::place.place'
    >;
    quantity: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::shop-stock.shop-stock',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTrainerTrainer extends Schema.CollectionType {
  collectionName: 'trainers';
  info: {
    description: 'Entrenador de una escuela de adiestramiento: nombre, imagen y disciplinas en las que se especializa';
    displayName: 'Trainer';
    pluralName: 'trainers';
    singularName: 'trainer';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::trainer.trainer',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    image: Attribute.Media<'images'>;
    name: Attribute.String & Attribute.Required;
    place: Attribute.Relation<
      'api::trainer.trainer',
      'oneToOne',
      'api::place.place'
    >;
    specialties: Attribute.JSON;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::trainer.trainer',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiUserEventUserEvent extends Schema.CollectionType {
  collectionName: 'user_events';
  info: {
    description: 'Registro de actividad del usuario (visitas, juego, compras) usado por el motor de descubrimiento de monstruos';
    displayName: 'User Event';
    pluralName: 'user-events';
    singularName: 'user-event';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::user-event.user-event',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    item: Attribute.Relation<
      'api::user-event.user-event',
      'manyToOne',
      'api::item.item'
    >;
    place: Attribute.Relation<
      'api::user-event.user-event',
      'manyToOne',
      'api::place.place'
    >;
    type: Attribute.Enumeration<['visit_place', 'play_place', 'buy_item']> &
      Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::user-event.user-event',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    user: Attribute.Relation<
      'api::user-event.user-event',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    world: Attribute.Relation<
      'api::user-event.user-event',
      'manyToOne',
      'api::world.world'
    >;
  };
}

export interface ApiWorldWorld extends Schema.CollectionType {
  collectionName: 'worlds';
  info: {
    description: '';
    displayName: 'World';
    pluralName: 'worlds';
    singularName: 'world';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::world.world',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    Description: Attribute.Text;
    Image: Attribute.Media<'images'>;
    monsters: Attribute.Relation<
      'api::world.world',
      'oneToMany',
      'api::monster.monster'
    >;
    Name: Attribute.String & Attribute.Required & Attribute.Unique;
    places: Attribute.Relation<
      'api::world.world',
      'oneToMany',
      'api::place.place'
    >;
    publishedAt: Attribute.DateTime;
    regions: Attribute.Relation<
      'api::world.world',
      'oneToMany',
      'api::region.region'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::world.world',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesRelease extends Schema.CollectionType {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    releasedAt: Attribute.DateTime;
    scheduledAt: Attribute.DateTime;
    status: Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Attribute.Required;
    timezone: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Schema.CollectionType {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Attribute.String & Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    entry: Attribute.Relation<
      'plugin::content-releases.release-action',
      'morphToOne'
    >;
    isEntryValid: Attribute.Boolean;
    locale: Attribute.String;
    release: Attribute.Relation<
      'plugin::content-releases.release-action',
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Attribute.Enumeration<['publish', 'unpublish']> & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginI18NLocale extends Schema.CollectionType {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Attribute.String & Attribute.Unique;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String &
      Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFile extends Schema.CollectionType {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Attribute.String;
    caption: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    ext: Attribute.String;
    folder: Attribute.Relation<
      'plugin::upload.file',
      'manyToOne',
      'plugin::upload.folder'
    > &
      Attribute.Private;
    folderPath: Attribute.String &
      Attribute.Required &
      Attribute.Private &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    formats: Attribute.JSON;
    hash: Attribute.String & Attribute.Required;
    height: Attribute.Integer;
    mime: Attribute.String & Attribute.Required;
    name: Attribute.String & Attribute.Required;
    previewUrl: Attribute.String;
    provider: Attribute.String & Attribute.Required;
    provider_metadata: Attribute.JSON;
    related: Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    size: Attribute.Decimal & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    url: Attribute.String & Attribute.Required;
    width: Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Schema.CollectionType {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    files: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.file'
    >;
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    parent: Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    path: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    pathId: Attribute.Integer & Attribute.Required & Attribute.Unique;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Schema.CollectionType {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String & Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    role: Attribute.Relation<
      'plugin::users-permissions.permission',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Schema.CollectionType {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String;
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    type: Attribute.String & Attribute.Unique;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    users: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser extends Schema.CollectionType {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    balance: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<500>;
    blocked: Attribute.Boolean & Attribute.DefaultTo<false>;
    companions: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::companion.companion'
    >;
    confirmationToken: Attribute.String & Attribute.Private;
    confirmed: Attribute.Boolean & Attribute.DefaultTo<false>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    discoveredMonsters: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToMany',
      'api::monster.monster'
    >;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    gameBestScores: Attribute.JSON & Attribute.Private;
    gameCooldowns: Attribute.JSON & Attribute.Private;
    inventoryEntries: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::inventory-entry.inventory-entry'
    >;
    items: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToMany',
      'api::item.item'
    >;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Attribute.String;
    resetPasswordToken: Attribute.String & Attribute.Private;
    role: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    username: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface ContentTypes {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::companion.companion': ApiCompanionCompanion;
      'api::duel.duel': ApiDuelDuel;
      'api::inventory-entry.inventory-entry': ApiInventoryEntryInventoryEntry;
      'api::item.item': ApiItemItem;
      'api::monster.monster': ApiMonsterMonster;
      'api::place.place': ApiPlacePlace;
      'api::region.region': ApiRegionRegion;
      'api::shop-stock.shop-stock': ApiShopStockShopStock;
      'api::trainer.trainer': ApiTrainerTrainer;
      'api::user-event.user-event': ApiUserEventUserEvent;
      'api::world.world': ApiWorldWorld;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
