// Service worker des notifications push de l'admin (Firebase Cloud Messaging).
// La configuration Firebase (publique) arrive dans l'adresse d'enregistrement (?apiKey=…), car
// ce fichier statique ne passe pas par Vite. Les messages envoyés par les Cloud Functions
// contiennent une « notification » et un lien (webpush.fcmOptions.link) : le SDK affiche la
// notification et, au clic, ouvre l'écran concerné de l'admin.
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});
firebase.messaging();
