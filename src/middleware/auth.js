const admin = require('firebase-admin');

/**
 * Inicializa firebase-admin la primera vez que se necesita.
 * En Cloud Run usa las Application Default Credentials del runtime
 * service account; localmente requiere GOOGLE_APPLICATION_CREDENTIALS
 * apuntando a un JSON de service account, o `gcloud auth
 * application-default login`.
 *
 * En tests se mockea todo el módulo (jest.mock('firebase-admin'))
 * y este init nunca llega a ejecutarse de verdad.
 */
function ensureInit() {
  if (admin.apps.length > 0) return;
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'playerhub-d019c',
  });
}

/**
 * Middleware que exige un Firebase ID token válido en
 * `Authorization: Bearer <token>`. Si lo es, deja `req.user` con
 * { uid, email } y continúa. Si no, responde 401.
 *
 * Se aplica solo a endpoints de escritura: crear, actualizar, borrar
 * jugadores e importar/comentar. Los GET siguen siendo públicos.
 */
async function requireAuth(req, res, next) {
  try {
    ensureInit();
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'Missing Bearer token' });
    }
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = { uid: decoded.uid, email: decoded.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
