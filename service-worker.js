// 버전을 날짜+시간으로 자동 설정 → 항상 새 캐시 생성
var CACHE_VERSION = '2026-v3';
var CACHE_NAME = 'guri-checklist-' + CACHE_VERSION;

// 설치
self.addEventListener('install', function(e){
  console.log('[SW] 설치:', CACHE_NAME);
  self.skipWaiting();
});

// 활성화: 이전 캐시 전부 삭제
self.addEventListener('activate', function(e){
  console.log('[SW] 활성화, 이전 캐시 삭제');
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.map(function(k){
          console.log('[SW] 삭제:', k);
          return caches.delete(k);
        })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// 모든 요청: 항상 네트워크 우선 → 실패 시에만 캐시
self.addEventListener('fetch', function(e){
  // html 파일은 항상 네트워크에서 최신 버전
  if(e.request.mode === 'navigate' ||
     e.request.url.endsWith('.html') ||
     e.request.url.endsWith('/')){
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).catch(function(){
        return caches.match(e.request);
      })
    );
    return;
  }

  // 나머지 리소스: 네트워크 우선
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
});

// 메시지 수신
self.addEventListener('message', function(e){
  if(e.data === 'skipWaiting') self.skipWaiting();
});
