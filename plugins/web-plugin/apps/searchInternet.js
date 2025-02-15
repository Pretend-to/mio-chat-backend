import { MioFunction, Param } from '../../../lib/functions.js'
import puppeteer from 'puppeteer'

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
    })
    this.func = this.scrapeData
  }

  async scrapeData(e) {
    const startTime = Date.now(); // 记录开始时间
    logger.debug('Starting scrapeData function...');

    const { query } = e.params;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to Bing search with the provided query
    await page.goto(
      `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      { waitUntil: 'domcontentloaded' }
    );

    // Wait for the search result items to load
    await page.waitForSelector('li.b_algo', { timeout: 10000 }); // Wait for up to 10 seconds

    // Extract data
    const results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li.b_algo'));
      return items.map((item) => ({
        title: item.querySelector('h2 a')?.innerText || '',
        url: item.querySelector('h2 a')?.href || '',
        snippet: item.querySelector('p')?.innerText || '',
      }));
    });

    // results 只取前五个
    results.splice(5);

    const parsedPages = [];

    const parse = async (url) => {
      const pageStartTime = Date.now(); // 记录页面开始时间
      try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const result = await page.evaluate(() => {
          const texts = [];
          // 先把所有summary都展开
          const summaryElements = document.querySelectorAll('summary');
          summaryElements.forEach(summary => {
            summary.click();
          });
          // 模拟用户选择所有文本
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
            pureText: texts.join('\\n'),
          };
        });
        const pageEndTime = Date.now(); // 记录页面结束时间
        logger.debug(`Parsed page ${url} in ${pageEndTime - pageStartTime} ms`);
        return { success: true, content: result };
      } catch (error) {
        console.error('Error parsing page:', error);
        return { success: false };
      }
    };

    // 使用 Promise.all()，在所有请求完成后检查结果
    const parseResults = await Promise.all(results.map(result => parse(result.url)));

    // 检查是否有任何解析成功
    const successfulResults = parseResults.filter(res => res.success);

    if (successfulResults.length > 0) {
      successfulResults.forEach((result, index) => {
        parsedPages.push({
          title: results[index].title,
          url: results[index].url,
          snippet: results[index].snippet,
          content: result.content,
        });
      });
    }

    await browser.close();
    const endTime = Date.now(); // 记录结束时间
    logger.debug(`Finished scrapeData function. Time taken: ${endTime - startTime} ms`);

    // 返回所有成功解析的结果
    return parsedPages.length > 0 ? parsedPages : null; // 如果没有任何成功，返回 null
  }
}
