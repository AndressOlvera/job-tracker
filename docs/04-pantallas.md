# 4. Pantallas

Bocetos de baja fidelidad: definen **qué** hay en cada pantalla y cómo se navega, no el diseño visual final.

## Navegación

| Ruta | Pantalla |
|---|---|
| `/` | Lista de postulaciones |
| `/applications/new` | Nueva postulación |
| `/applications/:id/edit` | Editar postulación |
| `/stats` | Estadísticas |

Barra superior en todas las pantallas: **Job Tracker** · Postulaciones · Estadísticas.

## 1. Lista de postulaciones (`/`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Job Tracker          Postulaciones   Estadísticas                        │
├──────────────────────────────────────────────────────────────────────────┤
│ Mis postulaciones                                 [ + Nueva postulación ]│
│                                                                          │
│ [ Buscar empresa o puesto...  ] [ Estado: Todos ▾ ] [ Desde ] [ Hasta ]  │
│                                                       [ Limpiar filtros ]│
│ ┌──────────────┬──────────────────────┬────────────┬────────────┬──────┐ │
│ │ Empresa ▾    │ Puesto               │ Estado     │ Fecha ▾    │      │ │
│ ├──────────────┼──────────────────────┼────────────┼────────────┼──────┤ │
│ │ Oracle       │ Becario de Software  │ Entrevista │ 28/09/2026 │ ↗ ✎ ✕│ │
│ │ Bosch        │ Practicante QA       │ Postulado  │ 25/09/2026 │ ↗ ✎ ✕│ │
│ │ Intel        │ Becario de Datos     │ Rechazado  │ 20/09/2026 │   ✎ ✕│ │
│ └──────────────┴──────────────────────┴────────────┴────────────┴──────┘ │
│                                                                          │
│ Mostrando 1–20 de 24                  [ ‹ Anterior ] 1 2 [ Siguiente › ] │
└──────────────────────────────────────────────────────────────────────────┘
  ↗ abrir vacante (solo si tiene enlace)   ✎ editar   ✕ eliminar
```

- El estado se muestra como etiqueta de color.
- Los filtros se guardan en la URL (`/?status=interview&q=data`) para que al recargar o compartir el enlace se conserven.
- En celular la tabla se convierte en tarjetas apiladas.

### Estados especiales

| Situación | Qué se muestra |
|---|---|
| Cargando | Esqueleto de la tabla |
| Sin postulaciones | "Aún no registras postulaciones" + botón **Registrar la primera** |
| Filtros sin resultados | "Ninguna postulación coincide con los filtros" + **Limpiar filtros** |
| Error de la API | Mensaje de error + botón **Reintentar** |

### Confirmación al eliminar

```
┌─────────────────────────────────────────────┐
│ ¿Eliminar la postulación a Oracle?          │
│ Esta acción no se puede deshacer.           │
│                   [ Cancelar ] [ Eliminar ] │
└─────────────────────────────────────────────┘
```

## 2. Nueva / editar postulación

```
┌───────────────────────────────────────────────────────────┐
│ ← Volver                                                  │
│ Nueva postulación                                         │
│                                                           │
│ Empresa *            [ Oracle                          ]  │
│ Puesto *             [ Becario de Software             ]  │
│ Estado               [ Postulado ▾ ]                      │
│ Fecha de postulación [ 2026-10-03 ]                       │
│ Enlace de la vacante [ https://...                     ]  │
│                      ⚠ Escribe una URL válida (https://…) │
│ Fuente               [ OCC                             ]  │
│ Notas                ┌──────────────────────────────────┐ │
│                      │                                  │ │
│                      └──────────────────────────────────┘ │
│                                                           │
│                               [ Cancelar ] [ Guardar ]    │
└───────────────────────────────────────────────────────────┘
```

- La misma pantalla sirve para crear y editar; al editar se llena con los datos actuales.
- Los errores se muestran debajo de cada campo, tanto los que detecta el formulario como los que devuelve la API (`422`).
- El botón **Guardar** se desactiva mientras se envía, para evitar duplicados.
- Al guardar se regresa a la lista con un aviso: "Postulación guardada".

## 3. Estadísticas (`/stats`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Estadísticas                                                         │
│                                                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│ │ Total        │ │ Tasa de      │ │ Tasa de      │ │ Ofertas      │  │
│ │     24       │ │ respuesta    │ │ entrevistas  │ │      1       │  │
│ │              │ │   37.5 %     │ │   25.0 %     │ │              │  │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                                      │
│ Por estado                        Por mes                            │
│ Postulado  ███████████████ 15     20 ┤            ██                 │
│ Entrevista █████ 5                10 ┤            ██                 │
│ Oferta     █ 1                     0 ┤   ██       ██                 │
│ Rechazado  ███ 3                     └── ago ──── sep ──             │
└──────────────────────────────────────────────────────────────────────┘
```

- Las gráficas se hacen con Recharts.
- Debajo de cada tarjeta de tasa, un texto corto explica cómo se calcula.
- Sin datos: las tarjetas muestran 0 y las gráficas un mensaje en lugar de quedar vacías.
