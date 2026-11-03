# Tapechi Tactical

Prototipo original de shooter táctico multijugador para navegador, inspirado en el género de Counter-Strike. Usa un renderizador por raycasting, Node.js y WebSocket. No utiliza recursos de Counter-Strike.

## Ejecutar

Requiere Node.js 22 o posterior.

```sh
npm ci
npm start
```

El servidor escucha en el puerto 3000 (se puede cambiar con `PORT`). Abrí la dirección del servidor en dos navegadores para entrar a la misma partida. Para jugar por Internet hay que alojarlo en un servidor accesible con HTTPS y soporte para WebSocket; esta ejecución local no publica el juego.

## Controles

WASD para moverse, mouse para apuntar, clic o Espacio para disparar, R para recargar, Shift para correr y Esc para pausar. Las flechas izquierda/derecha también permiten apuntar. Hacé clic dentro de la escena para capturar el mouse.

## Primera versión

Hasta 16 jugadores en una sala, partidas de todos contra todos de tres minutos, cobertura, daño y colisiones calculados por el servidor, recarga y reaparición a los tres segundos. La pausa detiene tus controles, pero la partida online continúa.

Todavía no incluye equipos, bombas, compra de armas, cuentas, selección de salas, controles táctiles ni protección avanzada contra trampas.

## Validación

`npm test` prueba dos clientes reales contra un servidor temporal: conexión, movimiento, colisiones, disparo, recarga, mensajes inválidos y desconexión.
