# Content Type: Monster

Este content type maneja las criaturas y monstruos que habitan en los diferentes mundos del juego.

## Estructura

### Campos Requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Name` | String | Nombre del monstruo (único) |

### Campos Opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Image` | Media (1 imagen) | Imagen representativa del monstruo |
| `Nature` | Text | Descripción de la naturaleza y comportamiento del monstruo |
| `Origin` | Text | Origen y hábitat natural del monstruo |
| `AverageHeight` | Decimal | Altura promedio en metros (mínimo 0) |
| `AverageWeight` | Decimal | Peso promedio en kilogramos (mínimo 0) |
| `InnateAbility` | Text | Habilidades naturales o especiales del monstruo |

## Endpoints

- `GET /api/monsters` - Listar todos los monstruos
- `GET /api/monsters/:id` - Obtener un monstruo específico
- `POST /api/monsters` - Crear un nuevo monstruo
- `PUT /api/monsters/:id` - Actualizar un monstruo
- `DELETE /api/monsters/:id` - Eliminar un monstruo

## Ejemplos de Uso

### Crear un Monstruo

```json
{
  "data": {
    "Name": "Dragón de Cristal",
    "Nature": "Criatura majestuosa y territorial que habita en las montañas cristalinas",
    "Origin": "Nacido en las profundidades de las minas de cristal de Eryndor",
    "AverageHeight": 15.5,
    "AverageWeight": 2500.0,
    "InnateAbility": "Puede crear cristales mágicos y lanzar rayos de energía cristalina"
  }
}
```

### Obtener Monstruo con Imagen

```
GET /api/monsters/:id?populate=Image
```

### Filtrar por Nombre

```
GET /api/monsters?filters[Name][$contains]=Dragón
```

### Filtrar por Altura

```
GET /api/monsters?filters[AverageHeight][$gte]=10
```

### Filtrar por Peso

```
GET /api/monsters?filters[AverageWeight][$lte]=1000
```

### Ordenar por Nombre

```
GET /api/monsters?sort=Name:asc
```

### Ordenar por Altura (más altos primero)

```
GET /api/monsters?sort=AverageHeight:desc
```

## Casos de Uso

1. **Bestiario**: Los jugadores pueden consultar información sobre monstruos
2. **Encuentros**: Los monstruos pueden aparecer en lugares específicos
3. **Lore**: Cada monstruo tiene su propia historia y características
4. **Estadísticas**: Información física para inmersión en el mundo
5. **Habilidades**: Descripción de capacidades especiales

## Estructura de Datos Típica

```json
{
  "id": 1,
  "attributes": {
    "Name": "Dragón de Cristal",
    "Nature": "Criatura majestuosa...",
    "Origin": "Nacido en las profundidades...",
    "AverageHeight": 15.5,
    "AverageWeight": 2500.0,
    "InnateAbility": "Puede crear cristales mágicos...",
    "Image": {
      "data": {
        "id": 1,
        "attributes": {
          "url": "/uploads/crystal_dragon.jpg"
        }
      }
    }
  }
}
```

## Consultas Avanzadas

### Buscar Monstruos por Naturaleza

```
GET /api/monsters?filters[Nature][$contains]=territorial
```

### Monstruos Grandes (altura > 10m)

```
GET /api/monsters?filters[AverageHeight][$gt]=10&sort=AverageHeight:desc
```

### Monstruos Pesados (peso > 1000kg)

```
GET /api/monsters?filters[AverageWeight][$gt]=1000&sort=AverageWeight:desc
```

### Buscar por Habilidad

```
GET /api/monsters?filters[InnateAbility][$contains]=cristal
```

### Monstruos con Imagen

```
GET /api/monsters?populate=Image&filters[Image][$notNull]=true
```

## Categorías Sugeridas

### Por Tamaño
- **Pequeños**: < 2m de altura
- **Medianos**: 2-5m de altura
- **Grandes**: 5-10m de altura
- **Enormes**: > 10m de altura

### Por Comportamiento
- **Territoriales**: Defienden su territorio
- **Migratorios**: Se mueven entre zonas
- **Sociales**: Viven en grupos
- **Sol itarios**: Viven solos

### Por Hábitat
- **Acuáticos**: Viven en el agua
- **Terrestres**: Viven en tierra
- **Aéreos**: Vuelan
- **Subterráneos**: Viven bajo tierra

## Relaciones Futuras

Este content type está preparado para futuras relaciones con:
- **Lugares**: Dónde aparecen los monstruos
- **Items**: Qué items pueden dropear
- **Jugadores**: Encuentros y batallas
- **Misiones**: Objetivos relacionados con monstruos 