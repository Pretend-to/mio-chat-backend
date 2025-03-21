const CACHE_DATABASE_NAME = "my-cache-db";
const CACHE_OBJECT_STORE_NAME = "responses";
const CACHE_VERSION = 8; // 每次修改 Service Worker 文件时，更新此版本号！
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 天的缓存有效期 (毫秒)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 每天清理一次 (毫秒)

let db;
let dbInitialized = false; // 添加一个标志来跟踪数据库是否已初始化
let dbInitializationPromise; // 添加一个 Promise 来等待数据库初始化完成

// 初始化 IndexedDB
function initializeDatabase() {
  if (dbInitializationPromise) {
    return dbInitializationPromise; // 如果已经有初始化 Promise，则返回它
  }

  dbInitializationPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DATABASE_NAME, CACHE_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      dbInitializationPromise = null; // 重置 Promise
      reject(event);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("IndexedDB opened successfully");
      dbInitialized = true; // 设置标志
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(CACHE_OBJECT_STORE_NAME)) {
        db.createObjectStore(CACHE_OBJECT_STORE_NAME, { keyPath: "cacheKey" });
      }
    };
  });

  return dbInitializationPromise;
}

// 删除过期缓存
function deleteExpiredCache() {
  //console.log("Starting expired cache cleanup..."); //移除
  return new Promise((resolve, reject) => {
    if (!dbInitialized) {
      reject("IndexedDB not initialized"); // 如果数据库未初始化，拒绝 Promise
      return;
    }
    const transaction = db.transaction([CACHE_OBJECT_STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(CACHE_OBJECT_STORE_NAME);
    const now = Date.now();
    const expiredThreshold = now - MAX_AGE;
    let count = 0; // 记录删除的数量

    const request = objectStore.openCursor(); // 打开一个游标

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        // 如果有游标
        const cachedData = cursor.value;
        if (cachedData.timestamp < expiredThreshold) {
          // 如果缓存过期
          const deleteRequest = cursor.delete(); // 删除缓存

          deleteRequest.onsuccess = () => {
            //console.log(`Deleted expired cache for ${cachedData.cacheKey}`); //移除
            count++;
          };

          deleteRequest.onerror = (error) => {
            console.error(
              `Error deleting expired cache for ${cachedData.cacheKey}:`,
              error,
            );
            reject(error); // 遇到错误直接reject
            return;
          };
        }
        cursor.continue(); // 继续下一个
      } else {
        // 游标结束
        transaction.oncomplete = () => {
          if (count > 0) {
            console.log(
              `Expired cache cleanup complete. Deleted ${count} entries.`,
            );
          }
          resolve();
        };
        transaction.onerror = (error) => {
          console.error(
            "Transaction error during expired cache cleanup:",
            error,
          );
          reject(error);
        };
        transaction.onabort = (error) => {
          console.warn(
            "Transaction aborted during expired cache cleanup:",
            error,
          );
          reject(error);
        };
      }
    };
    request.onerror = (event) => {
      console.error("Error opening cursor:", event);
      reject(event);
    };
  });
}

// 安装 Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker installing.");
  event.waitUntil(initializeDatabase().then(() => self.skipWaiting()));
});

// 激活 Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating.");
  event.waitUntil(
    (async () => {
      // 清理 CacheStorage
      await caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_DATABASE_NAME) {
              return caches.delete(cacheName);
            }
          }),
        );
      });

      // 初始化数据库 (确保即使在 install 中初始化了，activate 也再次初始化)
      await initializeDatabase();

      // 清理 IndexedDB 中的过期缓存
      await deleteExpiredCache();

      // 设置定期清理任务
      setInterval(deleteExpiredCache, CLEANUP_INTERVAL);

      // 声明控制
      return self.clients.claim();
    })(),
  );
});

// 生成缓存 Key
function generateCacheKey(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  // 获取排序后的搜索参数
  const searchParams = new URLSearchParams(url.search);
  const sortedSearchParams = new URLSearchParams(
    Array.from(searchParams.entries()).sort(),
  );
  // 获取 Accept 头部，用于区分响应类型
  const acceptHeader = request.headers.get("Accept") || ""; // 避免 null 值
  // 其他重要的头部，例如 Content-Type
  const contentTypeHeader = request.headers.get("Content-Type") || "";
  // 组合成缓存 Key
  const cacheKey = `${request.method}-${pathname}?${sortedSearchParams.toString()}-${acceptHeader}-${contentTypeHeader}`;
  return cacheKey;
}

// 从 IndexedDB 获取缓存
function getCachedResponse(cacheKey) {
  return new Promise((resolve, reject) => {
    if (!dbInitialized) {
      reject("IndexedDB not initialized"); // 如果数据库未初始化，拒绝 Promise
      return;
    }
    const transaction = db.transaction([CACHE_OBJECT_STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(CACHE_OBJECT_STORE_NAME);
    const request = objectStore.get(cacheKey);

    request.onsuccess = async (event) => {
      const cachedData = event.target.result;
      if (cachedData) {
        const { response, timestamp } = cachedData;
        const isExpired = Date.now() - timestamp > MAX_AGE;
        if (isExpired) {
          //console.log(`Cache expired for ${cacheKey}`); //移除
          deleteCachedResponse(cacheKey);
          resolve(null); // 返回 null，触发网络请求
        } else {
          //console.log(`Cache hit for ${cacheKey}`); // 移除
          try {
            const body = new Uint8Array(response.body);
            const init = {
              status: response.status,
              statusText: response.statusText,
              headers: new Headers(response.headers),
            };
            const cachedResponse = new Response(body, init);
            resolve(cachedResponse);
          } catch (error) {
            console.error("Error reconstructing response:", error);
            resolve(null);
          }
        }
      } else {
        //console.log(`Cache miss for ${cacheKey}`); //移除
        resolve(null);
      }
    };

    request.onerror = (event) => {
      console.error("Error getting cached response:", event);
      reject(event);
    };
  });
}

// 将响应存储到 IndexedDB
async function storeResponseInCache(cacheKey, response) {
  try {
    if (!dbInitialized) {
      throw new Error("IndexedDB not initialized"); // 如果数据库未初始化，抛出错误
    }
    // 将 Response 的 body 转换为 ArrayBuffer
    const arrayBuffer = await response.clone().arrayBuffer();

    const responseData = {
      cacheKey: cacheKey,
      response: {
        body: arrayBuffer,
        headers: Array.from(response.headers.entries()),
        status: response.status,
        statusText: response.statusText,
        type: response.type,
        url: response.url,
      },
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [CACHE_OBJECT_STORE_NAME],
        "readwrite",
      );
      const objectStore = transaction.objectStore(CACHE_OBJECT_STORE_NAME);
      const request = objectStore.put(responseData);

      request.onsuccess = () => {
        console.log(`Response stored in cache for ${cacheKey}`); // 保留：更新缓存时
        resolve();
      };

      request.onerror = (event) => {
        console.error("Error storing response in cache:", event);
        reject(event);
      };
    });
  } catch (error) {
    console.error("Error cloning and storing response:", error); // 保留：请求失败时
  }
}

// 删除过期缓存 (可选) - 这个函数可以用于手动删除缓存
function deleteCachedResponse(cacheKey) {
  return new Promise((resolve, reject) => {
    if (!dbInitialized) {
      reject("IndexedDB not initialized"); // 如果数据库未初始化，拒绝 Promise
      return;
    }
    const transaction = db.transaction([CACHE_OBJECT_STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(CACHE_OBJECT_STORE_NAME);
    const request = objectStore.delete(cacheKey);

    request.onsuccess = () => {
      //console.log(`Cache deleted for ${cacheKey}`); // 移除
      resolve();
    };

    request.onerror = (event) => {
      console.error("Error deleting cache:", event);
      reject(event);
    };
  });
}

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      // 确保数据库已经初始化完成
      if (!dbInitialized) {
        console.warn("IndexedDB not yet initialized, waiting...");
        try {
          await initializeDatabase(); // 等待初始化完成
          console.log("IndexedDB initialized after waiting.");
        } catch (error) {
          console.error("IndexedDB initialization failed:", error);
          // 如果初始化失败，直接返回网络请求或者一个错误响应
          return fetch(event.request); // 或者 return new Response(..., {status: 500});
        }
      }

      const request = event.request;

      // 1. HTML 页面 (index.html)
      if (request.mode === "navigate" && request.destination === "document") {
        // 网络优先策略 for index.html
        try {
          const networkResponse = await fetch(request); // 尝试从网络获取
          // 可以选择在这里更新 Cache API 中的 index.html 缓存 (可选)
          const cache = await caches.open("html-cache");
          await cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          console.log("Network failed for index.html, fetching cache:", error);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log("index.html Cache hit!");
            return cachedResponse;
          }
          console.error("index.html fetch failed and no cache found.");
          throw error;
        }
      }

      // 2. API 请求 (通过 fetch 或 XMLHttpRequest 发起的)
      // 不需要缓存 API 请求, 直接从网络获取
      if (isAPIRequest(request)) {
        console.log("Bypassing service worker for API request:", request.url);
        return fetch(request); // 跳过 Service Worker 直接从网络获取
      }
      // 3. 静态资源文件 (js, css, images, fonts)
      // (indexedDB缓存)

      // 仅缓存 GET 请求
      if (request.method !== "GET") {
        return fetch(request);
      }
      const cacheKey = generateCacheKey(request);
      try {
        const cachedResponse = await getCachedResponse(cacheKey);
        if (cachedResponse) {
          return cachedResponse;
        }
        const networkResponse = await fetch(request);
        // 检查响应状态码
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse; // 不缓存非 200 响应
        }
        const responseClone = networkResponse.clone();
        await storeResponseInCache(cacheKey, responseClone);
        return networkResponse;
      } catch (error) {
        console.error("Fetch failed:", error);
        throw error;
      }
    })(),
  );
});

// Helper function to determine if the request is for an API
function isAPIRequest(request) {
  // 检查 URL 是否包含 "/api/" 或以 "/api/" 开头
  const isApiUrl =
    request.url.includes("/api/") || request.url.startsWith("/api/");

  // 检查 Content-Type 头部，排除图片和字体
  const contentType = request.headers.get("Content-Type");
  const isImage = contentType && contentType.startsWith("image/");
  const isFont =
    contentType &&
    (contentType.startsWith("font/") || contentType.includes("font-"));

  //只有是/api/并且不是图片和字体，才认为是API请求
  return isApiUrl && !isImage && !isFont;
}
