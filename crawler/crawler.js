import chalk from "chalk";
import puppeteer from "puppeteer";
import validator from "validator";

const logger = (...messages) =>
  console.log(chalk.cyanBright("[crawler]"), ...messages);

export default class Crawler {
  /** @type {import('puppeteer').Browser} browser */
  #browser;

  async init() {
    this.#browser = await puppeteer.launch({ headless: false });
  }

  /**
   * @param {string} url
   * @param {import("puppeteer").Page} page
   * @returns {Promise<string[]>}
   */
  async visit(url, page) {
    await page.goto(url);
    return await this.findHyperLinks(page);
  }

  /**@param {string} url */
  async crawl(url) {
    const page = await this.#browser.newPage();
    let hyperlinks = await this.visit(url, page);
    hyperlinks = this.filterDifferentHostname(hyperlinks, new URL(url).hostname);
    logger({ hyperlinks });
    await this.#browser.close();
  }

  /**
   * @param {string[]} hyperLinks 
   * @param {string} hostname
   * @returns {string[]}
   */
  filterDifferentHostname(hyperLinks, hostname) {
    return hyperLinks.filter((hyperLink) =>
      new URL(hyperLink).hostname === hostname
    );
  }

  /**@param {import("puppeteer").Page} page */
  async findHyperLinks(page) {
    const hyperlinks = await page.$$eval(
      "a",
      (as) => as.map((a) => a.href),
    );
    return hyperlinks.filter((link) => validator.isURL(link));
  }
}
