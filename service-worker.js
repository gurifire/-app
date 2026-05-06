// 매 배포마다 자동으로 캐시 갱신 (타임스탬프 기반)
var CACHE_NAME = 'guri-checklist-' + new Date().toISOString().slice(0,10);
var CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// 설치: 필요한 파일 캐시
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      console.log('캐시 저장 중...');
      return cache.addAll(CACHE_FILES);
    })
  );
  // 즉시 활성화 (대기 없이)
  self.skipWaiting();
});

// 활성화: 이전 캐시 모두 삭제
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){
              console.log('이전 캐시 삭제:', k);
              return caches.delete(k);
            })
      );
    })
  );
  // 즉시 모든 클라이언트 제어
  self.clients.claim();
});

// 요청 가로채기: 네트워크 우선 → 실패 시 캐시
self.addEventListener('fetch', function(e){
  // index.html은 항상 네트워크에서 최신 버전 가져오기
  if(e.request.url.endsWith('index.html') || e.request.url.endsWith('/')){
    e.respondWith(
      fetch(e.request).then(function(response){
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(e.request, clone);
        });
        return response;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
    return;
  }

  // 나머지 파일: 캐시 우선 → 없으면 네트워크
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(response){
        if(response && response.status === 200){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function(){
        return caches.match('./index.html');
      });
    })
  );
});

// 메시지 수신: 클라이언트에서 업데이트 요청 시
self.addEventListener('message', function(e){
  if(e.data === 'skipWaiting'){
    self.skipWaiting();
  }
});
