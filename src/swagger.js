/**
 * Spec OpenAPI 3 del backend MEAN (PlayerHub).
 */

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'PlayerHub – MEAN Backend',
    version: '0.1.0',
    description:
      'Backend Node/Express/Mongoose para gestión de jugadores de fútbol. ' +
      'Comments embebidos, búsqueda en API-Football, importación a BD local, ' +
      'y "Equipo Ideal" con Gemini.',
    contact: { name: 'joa851', email: 'joa851@inlumine.ual.es' },
    license: { name: 'Academic use' },
  },
  servers: [
    { url: '/', description: 'Current server' },
  ],
  tags: [
    { name: 'Players',  description: 'CRUD local + filtros' },
    { name: 'Comments', description: 'Comments embebidos en cada Player' },
    { name: 'External', description: 'API-Football (búsqueda e importación)' },
    { name: 'LLM',      description: 'Equipo Ideal con Gemini' },
  ],

  // ─── Schemas reusables ─────────────────────────────────────────────
  components: {
    securitySchemes: {
      firebaseBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Firebase ID token obtenido en el frontend con `user.getIdToken()`. ' +
          'Requerido en POST/PUT/DELETE de /players, /players/external/import ' +
          'y /players/:id/comments.',
      },
    },
    schemas: {
      Location: {
        type: 'object',
        properties: {
          latitude:  { type: 'number', example: 41.38 },
          longitude: { type: 'number', example: 2.13 },
        },
      },
      Birth: {
        type: 'object',
        properties: {
          date:    { type: 'string', example: '2002-11-25' },
          place:   { type: 'string', example: 'Tegucigalpa' },
          country: { type: 'string', example: 'Spain' },
        },
      },
      Comment: {
        type: 'object',
        required: ['author', 'text', 'rating'],
        properties: {
          _id:       { type: 'string', readOnly: true, example: '6a17299366b7c57e3ac6bef0' },
          author:    { type: 'string', maxLength: 200, example: 'Anon' },
          text:      { type: 'string', maxLength: 1000, example: 'Crack absoluto' },
          rating:    { type: 'integer', minimum: 0, maximum: 5, example: 5 },
          location:  { $ref: '#/components/schemas/Location' },
          createdAt: { type: 'string', format: 'date-time', readOnly: true },
          updatedAt: { type: 'string', format: 'date-time', readOnly: true },
        },
      },
      Player: {
        type: 'object',
        required: ['name'],
        properties: {
          _id:         { type: 'string', readOnly: true },
          externalId:  { type: 'integer', nullable: true, description: 'Id en API-Football (solo en importados)' },
          name:        { type: 'string', example: 'Pedri' },
          firstname:   { type: 'string', example: 'Pedro' },
          lastname:    { type: 'string', example: 'González' },
          age:         { type: 'integer', example: 23 },
          birth:       { $ref: '#/components/schemas/Birth' },
          nationality: { type: 'string', example: 'Spain' },
          height:      { type: 'string', example: '174 cm' },
          weight:      { type: 'string', example: '60 kg' },
          number:      { type: 'integer', example: 8 },
          position:    { type: 'string', enum: ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'] },
          photo:       { type: 'string', format: 'uri' },
          team:        { type: 'string', example: 'Barcelona' },
          league:      { type: 'string', example: 'La Liga' },
          location:    { $ref: '#/components/schemas/Location' },
          comments:    { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
          createdAt:   { type: 'string', format: 'date-time', readOnly: true },
          updatedAt:   { type: 'string', format: 'date-time', readOnly: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Player not found' },
        },
      },
    },
  },

  // ─── Endpoints ─────────────────────────────────────────────────────
  paths: {
    '/players': {
      get: {
        tags: ['Players'],
        summary: 'Lista jugadores con filtros opcionales',
        parameters: [
          { in: 'query', name: 'name',   schema: { type: 'string' }, description: 'Coincidencia parcial case-insensitive' },
          { in: 'query', name: 'team',   schema: { type: 'string' } },
          { in: 'query', name: 'league', schema: { type: 'string' } },
          { in: 'query', name: 'from',   schema: { type: 'string', format: 'date-time' }, description: 'createdAt ≥ from' },
          { in: 'query', name: 'to',     schema: { type: 'string', format: 'date-time' }, description: 'createdAt ≤ to' },
        ],
        responses: {
          200: {
            description: 'Array de jugadores',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Player' } } } },
          },
        },
      },
      post: {
        tags: ['Players'],
        summary: 'Crea un jugador desde formulario',
        security: [{ firebaseBearer: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Player' } } },
        },
        responses: {
          201: { description: 'Creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Player' } } } },
          400: { description: 'Validación falló', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Token Firebase ausente o inválido' },
        },
      },
    },

    '/players/{id}': {
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'ObjectId Mongo' },
      ],
      get: {
        tags: ['Players'],
        summary: 'Devuelve un jugador (incluye sus comments embebidos)',
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Player' } } } },
          400: { description: 'Id mal formado' },
          404: { description: 'No existe' },
        },
      },
      put: {
        tags: ['Players'],
        summary: 'Actualiza un jugador',
        security: [{ firebaseBearer: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Player' } } },
        },
        responses: {
          200: { description: 'Actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Player' } } } },
          400: { description: 'Id mal formado o validación' },
          401: { description: 'Token Firebase ausente o inválido' },
          404: { description: 'No existe' },
        },
      },
      delete: {
        tags: ['Players'],
        summary: 'Borra un jugador',
        security: [{ firebaseBearer: [] }],
        responses: {
          204: { description: 'Borrado' },
          400: { description: 'Id mal formado' },
          401: { description: 'Token Firebase ausente o inválido' },
          404: { description: 'No existe' },
        },
      },
    },

    '/players/{id}/comments': {
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
      ],
      post: {
        tags: ['Comments'],
        summary: 'Añade un comment al array embebido del jugador',
        security: [{ firebaseBearer: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Comment' } } },
        },
        responses: {
          201: { description: 'Comment creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Comment' } } } },
          400: { description: 'Validación falló' },
          401: { description: 'Token Firebase ausente o inválido' },
          404: { description: 'Player no existe' },
        },
      },
    },

    '/players/{id}/comments/{commentId}': {
      parameters: [
        { in: 'path', name: 'id',        required: true, schema: { type: 'string' } },
        { in: 'path', name: 'commentId', required: true, schema: { type: 'string' } },
      ],
      delete: {
        tags: ['Comments'],
        summary: 'Borra un comment por id',
        security: [{ firebaseBearer: [] }],
        responses: {
          204: { description: 'Borrado' },
          400: { description: 'Id mal formado' },
          401: { description: 'Token Firebase ausente o inválido' },
          404: { description: 'Player o comment no existen' },
        },
      },
    },

    '/players/external': {
      get: {
        tags: ['External'],
        summary: 'Busca jugadores en API-Football (no toca BD local)',
        parameters: [
          { in: 'query', name: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Array crudo de API-Football' },
          400: { description: 'Falta query' },
          502: { description: 'API-Football inalcanzable' },
          503: { description: 'API_FOOTBALL_KEY no configurada' },
        },
      },
    },

    '/players/external/import': {
      post: {
        tags: ['External'],
        summary: 'Importa a la BD local los ids externos indicados',
        security: [{ firebaseBearer: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'array', items: { type: 'integer' } },
              example: [109026, 198360],
            },
          },
        },
        responses: {
          201: { description: 'Players importados', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Player' } } } } },
          400: { description: 'Body no es array no-vacío' },
          401: { description: 'Token Firebase ausente o inválido' },
          502: { description: 'API-Football inalcanzable' },
          503: { description: 'API_FOOTBALL_KEY no configurada' },
        },
      },
    },

    '/players/ideal-team': {
      post: {
        tags: ['LLM'],
        summary: 'Genera el "Equipo Ideal" con Gemini sobre los jugadores de la BD',
        responses: {
          200: { description: 'Players seleccionados en el orden del LLM', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Player' } } } } },
          502: { description: 'Gemini inalcanzable' },
          503: { description: 'LLM_KEY no configurada' },
        },
      },
    },
  },
};

module.exports = spec;
