import { MioFunction, Param } from '../../../lib/functions.js';
import parsePage from '../lib/parsePage.js'

export class parseWebPage extends MioFunction {
    constructor() {
        super({
            name: 'parseWebPage',
            description:
                'A tool to scrape all text content from a specified website while preserving images and hyperlinks.  Uses either Puppeteer or a fallback API. If one fails gracefully, race continues. Puppeteer method prioritizes image and link gathering, while the fallback API prioritizes speed (but may not always work).',
            params: [
                new Param({
                    name: 'url',
                    type: 'string',
                    description: 'The URL of the website to scrape text content from.',
                    required: true,
                }),
            ],
        });
        this.func = this.parsePage;
    }

    async parsePage(e){
        const {url} = e.params
        return await parsePage(url)
    }
}