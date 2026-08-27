const SW_VERSION='2.1.7';
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');
importScripts('/firebase-config-sw.js?v=217');
firebase.initializeApp(self.firebaseConfig);
const messaging=firebase.messaging();
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
messaging.onBackgroundMessage(payload=>{
  const title=payload?.notification?.title||'交易小提醒';
  self.registration.showNotification(title,{
    body:payload?.notification?.body||'重大市場事件即將公布',
    icon:'/icon-192.png',badge:'/icon-192.png',data:payload?.data||{}
  });
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus'in c)return c.focus()}
    if(clients.openWindow)return clients.openWindow('/');
  }));
});
