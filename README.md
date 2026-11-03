# Tapechi Tactical

Prototipo original de shooter táctico para navegador, inspirado en el género de Counter-Strike. Incluye un jugador contra bots y multijugador online. Usa un renderizador por raycasting, Node.js y WebSocket. No utiliza recursos de Counter-Strike.

## Ejecutar

Requiere Node.js 22 o posterior.

```sh
npm ci
npm start
```

El servidor escucha en el puerto 3000 (se puede cambiar con `PORT`). El modo predeterminado es **Un jugador · Contra bots**: eliminá tres enemigos en 90 segundos. Se ejecuta en el navegador y no abre conexiones WebSocket. Se puede servir la carpeta `web` con cualquier servidor de archivos estáticos.

Para jugar online, elegí **Multijugador online** y abrí la dirección del servidor en dos navegadores. Para jugar por Internet hay que alojarlo en un servidor accesible con HTTPS y soporte para WebSocket; esta ejecución local no publica el juego. Si se pierde la conexión online, podés elegir Un jugador desde el menú.

## Controles

WASD para moverse, mouse para apuntar horizontal y verticalmente, clic o Espacio para disparar, R para recargar, Shift para correr y Esc para pausar. Las flechas izquierda/derecha también permiten apuntar. Hacé clic dentro de la escena para capturar el mouse. Si una vista previa bloquea la captura, el apuntado funciona moviendo el mouse sobre la escena. La sensibilidad se ajusta desde el menú de pausa.

## Primera versión

Hasta 16 jugadores en una sala, partidas de todos contra todos de tres minutos, cobertura, daño y colisiones calculados por el servidor, recarga y reaparición a los tres segundos. La pausa detiene tus controles, pero la partida online continúa.

Todavía no incluye equipos, bombas, compra de armas, cuentas, selección de salas, controles táctiles ni protección avanzada contra trampas.

## Validación

`npm test` comprueba combate, coberturas, recarga, pausa, victoria y derrota en modo solo sin WebSocket. También prueba dos clientes reales contra un servidor temporal: conexión, movimiento, colisiones, disparo, recarga, mensajes inválidos, bajas, reaparición y desconexión.
