export function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  };

  const sw = `
    importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-messaging-compat.js');

    firebase.initializeApp(${JSON.stringify(firebaseConfig)});

    const messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage(function(payload) {
      const title = (payload.notification && payload.notification.title) || 'Notification';
      const options = {
        body: (payload.notification && payload.notification.body) || '',
        icon: '/dynasty.png',
        data: payload.data || {}
      };
      self.registration.showNotification(title, options);
    });

    // Handle notification click event
    self.addEventListener('notificationclick', function(event) {
      event.notification.close();
      const link = (event.notification && event.notification.data && event.notification.data.link) || '/notifications';
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url.includes(self.registration.scope) && 'focus' in client) {
              client.focus();
              client.navigate(link);
              return;
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(link);
          }
        })
      );
    });
  `;

  return new Response(sw, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}


