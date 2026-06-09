# Content Type: Place

Este content type maneja los lugares específicos dentro de cada mundo donde los jugadores pueden interactuar.

## Estructura

### Campos Requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Name` | String | Nombre del lugar (único) |
| `Type` | Enumeration | Tipo de lugar: `shop`, `game`, `information` |

### Campos Opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Description` | Text | Descripción detallada del lugar |
| `Banner` | Media (1 imagen) | Imagen de banner del lugar |

### Relaciones

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `World` | Many-to-One | Mundo al que pertenece este lugar |

## Endpoints

- `GET /api/places` - Listar todos los lugares
- `GET /api/places/:id` - Obtener un lugar específico
- `POST /api/places` - Crear un nuevo lugar
- `PUT /api/places/:id` - Actualizar un lugar
- `DELETE /api/places/:id` - Eliminar un lugar

## Tipos de Lugares

### Shop
Lugares donde los jugadores pueden comprar y vender items.

### Game
Lugares donde los jugadores pueden participar en actividades o minijuegos.

### Information
Lugares informativos donde los jugadores pueden obtener datos sobre el mundo.

## Ejemplos de Uso

### Crear un Lugar

```json
{
  "data": {
    "Name": "Tienda de Armas",
    "Type": "shop",
    "Description": "Una tienda especializada en armas y armaduras",
    "World": 1
  }
}
```

### Obtener Lugar con Mundo

```
GET /api/places/:id?populate=World
```

### Filtrar por Tipo

```
GET /api/places?filters[Type][$eq]=shop
```

### Filtrar por Mundo

```
GET /api/places?filters[World][$eq]=1
```

### Filtrar por Nombre

```
GET /api/places?filters[Name][$contains]=Tienda
```

### Ordenar por Nombre

```
GET /api/places?sort=Name:asc
```

## Relaciones

### Con World

Cada lugar pertenece a un mundo específico. Esta relación es obligatoria.

```json
{
  "data": {
    "Name": "Nuevo Lugar",
    "Type": "game",
    "Description": "Un lugar emocionante",
    "World": 1
  }
}
```

## Casos de Uso

1. **Navegación**: Los jugadores pueden explorar diferentes lugares dentro de un mundo
2. **Comercio**: Lugares tipo "shop" para transacciones
3. **Entretenimiento**: Lugares tipo "game" para actividades
4. **Información**: Lugares tipo "information" para lore y datos
5. **Organización**: Los lugares se agrupan por mundo para mejor navegación

## Estructura de Datos Típica

```json
{
  "id": 1,
  "attributes": {
    "Name": "Tienda de Armas",
    "Type": "shop",
    "Description": "Una tienda especializada...",
    "Banner": {
      "data": {
        "id": 1,
        "attributes": {
          "url": "/uploads/weapon_shop_banner.jpg"
        }
      }
    },
    "World": {
      "data": {
        "id": 1,
        "attributes": {
          "Name": "Eryndor"
        }
      }
    }
  }
}
```

## Consultas Avanzadas

### Obtener Todos los Lugares de un Mundo

```
GET /api/places?filters[World][$eq]=1&populate=World
```

### Obtener Solo Tiendas

```
GET /api/places?filters[Type][$eq]=shop&populate=World
```

### Buscar Lugares por Nombre

```
GET /api/places?filters[Name][$contains]=Tienda&populate=World
``` 