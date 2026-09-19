const CACHE_NAME = 'test-cache'

const PRECACHE_ASSETS = [
    '../public/icons'
]


self.addEventListener('install',event=>{
    event.waitUntil(async()=>{
        const cache = await caches.open(CACHE_NAME)
        cache.addAll(PRECACHE_ASSETS)
    })
})