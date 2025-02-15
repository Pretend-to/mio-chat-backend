import { MioFunction, Param } from '../../../lib/functions.js';
import puppeteer from 'puppeteer';

export class searchInternet extends MioFunction {
  constructor() {
    super({
      name: 'searchInternet',
      description: 'A tool to scrape web data from Bing search results.',
      params: [
        new Param({
          name: 'query',
          type: 'string',
          description: 'The search query to scrape data for.',
          required: true,
        }),
      ],
    });
    this.func = this.scrapeData;
  }

  async scrapeData(e) {
    const startTime = Date.now(); // 记录开始时间
    logger.debug('Starting scrapeData function...');
    const { query } = e.params;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to Bing search with the provided query
    await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });

    // Wait for the search result items to load
    await page.waitForSelector('li.b_algo', { timeout: 10000 });

    // Extract data
    let results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li.b_algo'));
      return items.map((item) => ({
        title: item.querySelector('h2 a')?.innerText || '',
        url: item.querySelector('h2 a')?.href || '',
        snippet: item.querySelector('p')?.innerText || '',
      }));
    });

    // 限定只取前10个结果
    results.splice(10);

    // 定义解析单个页面的函数
    const parse = async (url) => {
      const pageStartTime = Date.now(); // 记录页面开始时间
      try {
        const parsePage = await browser.newPage();
        await parsePage.goto(url, { waitUntil: 'domcontentloaded' });
        
        const result = await parsePage.evaluate(() => {
          const texts = [];
          // 先把所有 summary 元素展开（如果有）
          const summaryElements = document.querySelectorAll('summary');
          summaryElements.forEach(summary => {
            summary.click();
          });
          // 模拟用户选中整个文档
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(document.body);
          selection.removeAllRanges();
          selection.addRange(range);
          
          // 获取选中的文本
          const selectedText = selection.toString().trim();
          if (selectedText) {
            texts.push(selectedText);
          }
          return {
            pureText: texts.join('\n'),
          };
        });
        
        await parsePage.close(); // 关闭解析完成的页面
        const pageEndTime = Date.now(); // 记录页面结束时间
        logger.debug(`Parsed page ${url} in ${pageEndTime - pageStartTime} ms`);
        
        return { success: true, content: result };
      } catch (error) {
        console.error('Error parsing page:', error);
        return { success: false };
      }
    };

    // 开始所有解析任务，注意这里不会等待所有任务完成，而是在10秒后主动关闭 browser
    const parseTasks = results.map(result => parse(result.url));

    // 创建一个10秒后的超时 Promise
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        logger.debug('10-second timeout reached. Closing browser to cancel pending tasks.');
        // 关闭浏览器会使得后续未完成的页面操作因错误捕获而返回失败
        browser.close().catch(err => logger.debug('Browser already closed.'));
        resolve('timeout');
      }, Math.max(0, 10000 - (Date.now() - startTime)));
    });

    // 等待解析任务或超时，使用 Promise.race 来保证不超过10秒
    const raceResult = await Promise.race([
      Promise.allSettled(parseTasks),
      timeoutPromise
    ]);

    let settledResults = [];
    // raceResult 有可能为 'timeout' 字符串，也有可能为解析任务的 settled 结果
    if (raceResult === 'timeout') {
      // 如果超时，则等待所有已经完成的任务（注意：尚未完成的任务会因为 browser 被关闭而抛错，并在 allSettled 中标记为 rejected）
      settledResults = await Promise.allSettled(parseTasks);
    } else {
      settledResults = raceResult;
    }

    const parsedPages = [];
    // 对所有结果进行过滤，只保留成功解析的
    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value && result.value.success) {
        parsedPages.push({
          title: results[index].title,
          url: results[index].url,
          snippet: results[index].snippet,
          content: result.value.content,
        });
      }
    });

    const endTime = Date.now(); // 记录结束时间
    logger.debug(`Finished scrapeData function. Total time taken: ${endTime - startTime} ms`);
    
    // 返回所有成功解析的结果
    return parsedPages.length > 0 ? parsedPages : null;
  }
}