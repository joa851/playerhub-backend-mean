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
 * Devuelve la lista (en minúsculas) de emails admin definida en
 * la env var ADMIN_EMAILS (separados por coma). Se lee en cada call
 * para que cambiar la env var en Cloud Run no requiera reinicio
 * del proceso.
 */
function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Middleware que exige un Firebase ID token válido en
 * `Authorization: Bearer <token>`. Si lo es, deja `req.user` con
 * { uid, email, admin } y continúa. Si no, responde 401.
 *
 * `admin` es true si el email del usuario está en ADMIN_EMAILS.
 *
 * Se aplica solo a endpoints de escritura. Los GET siguen siendo
 * públicos.
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
    const email = (decoded.email || '').toLowerCase();
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      admin: getAdminEmails().includes(email),
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware que exige que el usuario ya autenticado sea admin.
 * Se monta DESPUÉS de requireAuth en la cadena: requireAuth pone
 * `req.user.admin`, este lo lee.
 *
 * 401 si no hay sesión (debería haberlo cortado requireAuth ya),
 * 403 si está logueado pero no es admin.
 */
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!req.user.admin) return res.status(403).json({ error: 'Admin only' });
  return next();
}

module.exports = { requireAuth, requireAdmin };
