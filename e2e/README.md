# Pruebas de navegador (E2E)

Pruebas con **Playwright** que usan la app completa como lo haría una persona: abren un navegador real (Chromium), llenan el formulario, buscan, filtran y eliminan. A diferencia de las pruebas de Vitest, aquí no se simula nada: hablan con Nginx, la API y PostgreSQL de verdad.

| Archivo | Qué revisa |
|---|---|
| `tests/postulaciones.spec.ts` | Crear, buscar, editar, filtrar y eliminar una postulación; validación del formulario |
| `tests/app.spec.ts` | La API responde por el mismo dominio y cada pantalla carga al abrirla directo, sin errores en la consola |

Las pruebas crean postulaciones con nombres como `Empresa E2E 1791234567890` y las borran al terminar, aunque fallen.

## Correrlas en tu computadora

Primero levanta la app con Docker (desde la raíz del proyecto):

```bash
cd ~/proyectos/job-tracker
docker compose up -d
```

Luego, en la carpeta `e2e/`:

```bash
cd e2e
npm install                                  # la primera vez (crea package-lock.json)
npx playwright install --with-deps chromium  # la primera vez: descarga Chromium (pide tu contraseña de Ubuntu)
npm test                                     # corre las pruebas
npm run report                               # abre el reporte en el navegador
```

`npm run test:ui` abre una ventana para ver cada paso de las pruebas mientras corren.

También se pueden correr contra el modo desarrollo: `BASE_URL=http://localhost:5173 npm test`.

## En la CI

El job **E2E** de `.github/workflows/ci.yml` levanta la app con `docker compose up -d` y corre estas mismas pruebas. Si alguna falla, el reporte (con capturas y el *trace* de cada paso) queda como artefacto `reporte-playwright` en la página de la ejecución.

El navegador usa la zona horaria de México, igual que la API (`APP_TIMEZONE`). Si usara la de la CI (UTC), de 6 p. m. a medianoche la fecha por defecto del formulario sería "mañana" para la API, y la rechazaría.
