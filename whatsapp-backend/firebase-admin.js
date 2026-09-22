const admin = require('firebase-admin');
let serviceAccount;
if (process.env.FIREBASE_CREDENTIALS) {
    // Production: Parse from environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
} else {
    // Local development: Use file
    serviceAccount = require('./serviceAccountKey.json');
}
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
// Silently ignore undefined fields instead of throwing
db.settings({ ignoreUndefinedProperties: true });
const auth = admin.auth();
module.exports = { admin, db, auth };