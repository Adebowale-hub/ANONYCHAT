const admin = require('firebase-admin');
let serviceAccount;
if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
} else {
    serviceAccount = require('./serviceAccountKey.json');
}
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
// Silently ignore undefined fields instead of crashing
db.settings({ ignoreUndefinedProperties: true });
const auth = admin.auth();
module.exports = { admin, db, auth };
