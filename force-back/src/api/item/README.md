# Content Type: Item

Este content type maneja los objetos del juego que pueden ser recolectados y usados por los jugadores.

## Estructura

### Campos Requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | String | Nombre del objeto (único) |
| `slug` | UID | Slug único generado desde el nombre |
| `type` | Enumeration | Tipo de objeto: `weapon`, `armor`, `consumable`, `key`, `misc` |
| `rarity` | Enumeration | Rareza: `common`, `uncommon`, `rare`, `epic`, `legendary` |

### Campos Opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `description` | Rich Text | Descripción detallada del objeto |
| `icon` | Media (1 imagen) | Ícono representativo |
| `weight` | Decimal | Peso del objeto (mínimo 0) |
| `value` | Integer | Valor en monedas del juego (mínimo 0) |
| `is_stackable` | Boolean | ¿Se puede acumular? (default: false) |
| `max_stack` | Integer | Cantidad máxima por stack (default: 1, mínimo 1) |
| `usable` | Boolean | Si se puede usar como consumible (default: false) |
| `cooldown` | Integer | Tiempo de espera en segundos (default: 0, mínimo 0) |

## Endpoints

- `GET /api/items` - Listar todos los items
- `GET /api/items/:id` - Obtener un item específico
- `POST /api/items` - Crear un nuevo item
- `PUT /api/items/:id` - Actualizar un item
- `DELETE /api/items/:id` - Eliminar un item

## Ejemplos de Uso

### Crear un Item

```json
{
  "data": {
    "name": "Espada de Fuego",
    "type": "weapon",
    "rarity": "rare",
    "description": "Una espada mágica que arde con fuego eterno",
    "weight": 2.5,
    "value": 1500,
    "is_stackable": false,
    "usable": true,
    "cooldown": 30
  }
}
```

### Filtrar por Tipo

```
GET /api/items?filters[type][$eq]=weapon
```

### Filtrar por Rareza

```
GET /api/items?filters[rarity][$eq]=legendary
```

### Ordenar por Valor

```
GET /api/items?sort=value:desc
```

## Relaciones

Este content type está preparado para futuras relaciones con:
- Inventarios de usuarios
- Drop tables de monstruos
- Tiendas y comerciantes
- Crafting recipes 