self.addEventListener('fetch', (event) => {
    if (event.request.destination === 'image') {
      console.log('Image request intercepted:', event.request.url);
      
      // 您可以在这里修改请求或返回自定义响应
      event.respondWith(
        fetch(event.request).then((response) => {
          // 处理响应
          return response;
        })
      );
    }
  });