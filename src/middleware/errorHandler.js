/**
 * Middleware Express de manejo de errores.
 *
 * Convierte cualquier `next(err)` lanzado en una ruta en una respuesta JSON
 * con el código HTTP correcto. Centraliza la lógica para no repetir
 * try/catch tipo-específicos en cada handler.
 *
 * Tipos reconocidos:
 *  - ValidationError (Mongoose): 400 con el mensaje completo de validación.
 *  - CastError (Mongoose): 400 — id mal formado o tipo incorrecto.
 *  - err.status definido manualmente: lo respeta.
 *  - Cualquier otro: 500 + mensaje genérico (loguea el stack en consola).
 *
 * Va montado al final de la cadena de middlewares (después de las rutas).
 * La firma con 4 parámetros (err, req, res, next) le dice a Express que
 * este middleware es de errores.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id format' });
  }
  if (err.status && err.status >= 400 && err.status < 600) {
    return res.status(err.status).json({ error: err.message });
  }

  // No silenciar errores inesperados.
  console.error('[errorHandler]', err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
