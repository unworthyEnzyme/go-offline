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
   */
  async visit(url, page) {
    await page.goto(url);
    const links = await this.findHyperLinks(page);
    logger({ links });
  }

  /**@param {string} url */
  async crawl(url) {
    const page = await this.#browser.newPage();
    this.visit(url, page);
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
