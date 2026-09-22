# 04 — Selector de skins

- **Estado:** Refinado
- **Dependencias:** 01-mvp-arkanoid, 02-animacion-explosion-bloques, 03-sonidos-y-niveles
- **Objetivo:** Permitir cambiar la apariencia completa del juego entre 4 skins (Retro, Neon, Pastel, Pixel art) desde el overlay de pausa, sin recargar la página y recordando la preferencia entre sesiones.

> Los criterios de aceptación de este spec se entregan **sin marcar**. Se marcan solo
> cuando existe código verificado que los cumple.

---

## Alcance

### Dentro del spec

- 4 skins seleccionables: `retro`, `neon`, `pastel`, `pixel`
- Cada skin define el fondo, la paleta de bloques, el color del HUD y cómo se dibujan
  bloque, paddle, pelota y explosión
- Selector de skin en el overlay de pausa, debajo de los botones de nivel
- El cambio se aplica en el frame siguiente, sin recargar y sin perder la partida en curso
  (score, vidas, nivel, posición de pelota y bloques vivos se conservan)
- La preferencia se guarda en `localStorage` y se restaura al cargar la página
- Si `localStorage` no está disponible o contiene un valor inválido, se usa `retro`

### Fuera del alcance

- Skins adicionales o definidas por el usuario
- Editor de paletas
- Cambiar sonidos o música según la skin
- Cambiar la geometría del juego (tamaños de bloque, paddle o pelota)
- Animaciones de transición al cambiar de skin
- Temas para los overlays más allá del color de fondo y de texto

---

## Modelo de datos

### Nuevas variables de estado en `game.js`

```js
currentSkin; // 'retro' | 'neon' | 'pastel' | 'pixel'
// se inicializa desde localStorage; por defecto 'retro'
```

### Clave de persistencia

```js
SKIN_STORAGE_KEY = 'arkanoid.skin';
```

### Definición de skins

Objeto estático `SKINS` en un archivo nuevo `skins.js`, incluido en `index.html`
después de `assets/spritesheet.js` y antes de `game.js`.

```js
SKINS = {
  retro: {
    id: 'retro',
    label: 'Retro',
    background: '#000000',
    hudColor: '#ffffff',
    overlayFill: 'rgba(0, 0, 0, 0.7)',
    overlayColor: '#ffffff',
    drawBlock( ctx, block ) {},        // block: { x, y, w, h, color }
    drawPaddle( ctx, paddle ) {},      // paddle: { x, y, w, h }
    drawBall( ctx, ball ) {},          // ball: { x, y, w, h }
    drawExplosion( ctx, exp, progress ) {}, // progress: 0..1 sobre EXPLOSION_DURATION
  },
  // neon, pastel y pixel con la misma forma
};
```

Toda skin expone **exactamente** esas cuatro funciones de dibujo y esas cinco constantes
de color. `game.js` nunca consulta el nombre de la skin para decidir cómo dibujar:
solo delega en el objeto activo.

### Colores lógicos

Los bloques siguen guardando el color lógico que define `levels.js`
(`red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`, `gray`).
Cada skin no basada en sprites traduce ese nombre lógico a un color CSS con su propia tabla:

```js
blockColors = { red: '#e8394a', yellow: '#f2c14e', cyan: '#3ec9c9' /* ... */ };
```

---

## Las 4 skins

| Skin          | Fondo             | Bloques                                               | Paddle y pelota                  | Explosión                                    |
| ------------- | ----------------- | ----------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| **Retro**     | Negro             | Sprites del spritesheet — apariencia actual           | Sprites del spritesheet          | `EXPLOSION_FRAMES` con `drawFrame`           |
| **Neon**      | Negro             | Relleno y borde del mismo tono con `shadowBlur`       | Trazo brillante con `shadowBlur` | Anillo que crece y se desvanece              |
| **Pastel**    | Crema `#f4efe6`   | Relleno suave, esquinas redondeadas, borde más oscuro | Cápsula y círculo                | Círculo que crece con opacidad decreciente   |
| **Pixel art** | Gris muy oscuro   | Relleno plano más textura de celdas de 4 px           | Relleno plano con la misma trama | Cuadrícula de píxeles que se apaga por pasos |

Detalles obligatorios:

- **Neon** usa `ctx.shadowBlur` y `ctx.shadowColor`. Toda función que los active debe
  restaurarlos a `0` y `'transparent'` antes de salir, para no contaminar el HUD ni los overlays.
- **Pastel** usa `ctx.roundRect()` cuando existe y cae a `arcTo()` si no, para no depender
  de un navegador reciente.
- **Pixel art** deriva su textura de `block.x` y `block.y`, nunca de un valor aleatorio,
  para que el patrón sea estable entre frames.
- La **explosión** de las skins no basadas en sprites recibe `progress` (0..1) en vez de un
  índice de frame, y debe seguir durando exactamente `EXPLOSION_DURATION`.

---

## Plan de implementación

1. **Crear `skins.js`** — declarar `SKINS` con las 4 entradas y sus tablas de color.
   Incluirlo en `index.html` después del spritesheet y antes de `game.js`.
2. **Estado y persistencia** — en `game.js`, añadir `currentSkin`. Leerlo de `localStorage`
   al arrancar dentro de un `try/catch` (el modo privado puede lanzar), validarlo contra
   las claves de `SKINS` y caer a `retro` si no coincide.
3. **Función `setSkin(id)`** — valida el id, asigna `currentSkin`, persiste en `localStorage`
   dentro de `try/catch` y no toca ninguna otra variable de estado.
4. **Delegar el dibujo** — en `draw()`, resolver `const skin = SKINS[currentSkin]` una vez por
   frame y sustituir cada llamada directa a `drawSprite` y `drawFrame` por `skin.drawBlock`,
   `skin.drawPaddle`, `skin.drawBall` y `skin.drawExplosion`. El fondo pasa a usar
   `skin.background`.
5. **Colorear HUD y overlays** — `drawHud`, `drawOverlay` y `drawPauseOverlay` usan
   `skin.hudColor`, `skin.overlayFill` y `skin.overlayColor` en vez de valores fijos.
6. **Botones de skin en la pausa** — declarar `SKIN_BUTTONS` con la misma forma que
   `PAUSE_BUTTONS`: 4 botones centrados de 120×44, separación 16, `y = 420`.
   Dibujarlos en `drawPauseOverlay` con la etiqueta de cada skin y resaltar la activa.
7. **Clic en el selector** — extender el listener de `click` existente: si el punto cae en un
   botón de `SKIN_BUTTONS`, llamar `setSkin(id)` y **mantener la pausa abierta**, para que se
   vea el cambio aplicado antes de reanudar.
8. **Ajustar el arnés de tests** — el stub de `ctx` en `tests/game.test.js` debe registrar
   `fillStyle`, `strokeStyle`, `shadowBlur` y las llamadas a `fillRect`, `stroke` y `arc`,
   porque las skins procedurales no pasan por `drawImage`.

---

## Criterios de aceptación

- [ ] `SKINS` define exactamente 4 skins con id `retro`, `neon`, `pastel` y `pixel`
- [ ] Cada skin expone `background`, `hudColor`, `overlayFill`, `overlayColor` y las 4 funciones de dibujo
- [ ] La skin por defecto al primer arranque es `retro` y se ve igual que antes de este spec
- [ ] El overlay de pausa muestra 4 botones de skin bajo los 5 de nivel
- [ ] El botón de la skin activa se distingue visualmente de los demás
- [ ] Al hacer clic en un botón de skin, el juego se redibuja con esa skin sin recargar
- [ ] Al cambiar de skin se conservan score, vidas, nivel, bloques vivos y posición de la pelota
- [ ] Al cambiar de skin la pausa sigue activa
- [ ] La skin elegida se guarda en `localStorage` bajo `arkanoid.skin`
- [ ] Al recargar la página se restaura la skin guardada
- [ ] Un valor inválido o ausente en `localStorage` cae a `retro` sin lanzar
- [ ] Si `localStorage` lanza al leer o al escribir, el juego sigue funcionando con `retro`
- [ ] El fondo del canvas cambia según la skin activa
- [ ] El HUD es legible en las 4 skins
- [ ] La explosión dura `EXPLOSION_DURATION` en las 4 skins
- [ ] Tras dibujar con la skin Neon, `shadowBlur` queda en `0` y no afecta al HUD
- [ ] Ninguna skin altera la geometría: bloques 64×24, paddle 162×14, pelota 16×16

---

## Decisiones tomadas y descartadas

| Decisión                | Elegida                                | Descartada                                 | Motivo                                                                     |
| ----------------------- | -------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| Qué es Retro            | El render actual con spritesheet       | Cuadrados planos sin sprite                | El enunciado lo define como estilo actual, y el actual es el spritesheet    |
| Contrato de skin        | Objeto con 4 funciones de dibujo       | Condicionales por nombre dentro de `draw()` | Añadir una skin no debe obligar a tocar `draw()`                            |
| Ubicación del selector  | Overlay de pausa                       | Menú aparte o barra HTML fuera del canvas  | Reutiliza el patrón ya decidido en el spec 03                               |
| Pausa tras cambiar skin | Se mantiene abierta                    | Reanudar al elegir                         | Permite comparar skins sin que la pelota siga corriendo                     |
| Persistencia            | `localStorage` con `try/catch`         | Sin persistencia, o cookie                 | Es preferencia local; el spec 03 ya descartó persistir el progreso          |
| Explosión no-sprite     | `progress` de 0 a 1                    | Índice de frame de 0 a 3                   | Desacopla la animación del número de frames del spritesheet                 |
| Textura de Pixel art    | Derivada de las coordenadas del bloque | Aleatoria por frame                        | Una textura aleatoria parpadearía en cada frame                             |
| Geometría               | Idéntica en las 4 skins                | Tamaños propios por skin                   | Cambiar tamaños altera las colisiones y rompería los specs 01 a 03          |

---

## Riesgos y notas para quien implemente

- **Los nombres de color del spritesheet no coinciden con lo que se ve.** En el asset actual
  el sprite `cyan` se ve verde, `green` se ve azul claro, `magenta` morado y `hotpink` naranja.
  Las skins procedurales usarán colores CSS reales, así que **el mismo bloque cambiará de tono
  al cambiar de skin**. Es esperado, pero conviene elegir las tablas `blockColors` mirando el
  render de Retro y no los nombres, si se quiere continuidad visual.
- **`shadowBlur` contamina.** Se aplica a todo lo que se dibuje después, incluido el texto del
  HUD. Restaurarlo es un requisito, no una buena práctica opcional.
- **`localStorage` puede lanzar**, no solo devolver `null`: en modo privado o con las cookies
  bloqueadas, el acceso tira excepción. Por eso el `try/catch` va en lectura y en escritura.
- **El arnés headless no valida estética.** Puede comprobar que se llama a la función de la
  skin correcta, que la geometría no cambia y que `shadowBlur` se restaura, pero que una skin
  se vea bien solo se comprueba en el navegador.
