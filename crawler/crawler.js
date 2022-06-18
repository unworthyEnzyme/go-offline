import chalk from "chalk";
import puppeteer from 'puppeteer';
const logger = (...messages) =>
  console.log(chalk.cyanBright("[crawler]"), ...messages);

export default class Crawler {
  /** @type {import('puppeteer').Browser} browser */
  #browser;

  async init() {
    this.#browser = await puppeteer.launch({ headless: false });
  }

  /**@param {string} url */
  async visit(url) {
    const page = await this.#browser.newPage();
    await page.goto(url);
  }
}
