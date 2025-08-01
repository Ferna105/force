# Content Type: World

Este content type maneja los mundos del juego donde los jugadores pueden explorar y vivir aventuras.

## Estructura

### Campos Requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Name` | String | Nombre del mundo (único) |

### Campos Opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Description` | Text | Descripción detallada del mundo |
| `Image` | Media (1 imagen) | Imagen representativa del mundo |

### Relaciones

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `places` | One-to-Many | Lugares que pertenecen a este mundo |

## Endpoints

- `GET /api/worlds` - Listar todos los mundos
- `GET /api/worlds/:id` - Obtener un mundo específico
- `POST /api/worlds` - Crear un nuevo mundo
- `PUT /api/worlds/:id` - Actualizar un mundo
- `DELETE /api/worlds/:id` - Eliminar un mundo

## Ejemplos de Uso

### Crear un Mundo

```json
{
  "data": {
    "Name": "Eryndor",
    "Description": "Un mundo mágico lleno de criaturas fantásticas y paisajes asombrosos"
  }
}
```

### Obtener Mundo con Lugares

```
GET /api/worlds/:id?populate=places
```

### Filtrar por Nombre

```
GET /api/worlds?filters[Name][$contains]=Eryndor
```

### Ordenar por Nombre

```
GET /api/worlds?sort=Name:asc
```

## Relaciones

### Con Places

Un mundo puede tener múltiples lugares. La relación se establece automáticamente cuando se crea un lugar y se asigna a un mundo.

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

1. **Exploración**: Los jugadores pueden navegar entre diferentes mundos
2. **Organización**: Los lugares se agrupan por mundo para mejor organización
3. **Narrativa**: Cada mundo puede tener su propia historia y ambientación
4. **Contenido**: Los mundos pueden tener diferentes tipos de contenido (lugares, monstruos, etc.)

## Estructura de Datos Típica

```json
{
  "id": 1,
  "attributes": {
    "Name": "Eryndor",
    "Description": "Un mundo mágico...",
    "Image": {
      "data": {
        "id": 1,
        "attributes": {
          "url": "/uploads/Eryndor_world.jpg"
        }
      }
    },
    "places": {
      "data": [
        {
          "id": 1,
          "attributes": {
            "Name": "Ciudad de Cristal",
            "Type": "shop"
          }
        }
      ]
    }
  }
}
``` 