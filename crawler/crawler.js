import chalk from "chalk";
import puppeteer from "puppeteer";
import validator from "validator";
import EventEmitter from 'node:events';
import _ from 'lodash';

const logger = (...messages) =>
  console.log(chalk.cyanBright("[crawler]"), ...messages);

export default class Crawler {
  /** @type {import('puppeteer').Browser} browser */
  #browser;
  /**@type {Set<string>} */
  #visitedPages = new Set();
  #jobQueue = new JobQueue();

  async init() {
    this.#browser = await puppeteer.launch({ headless: true });
  }

  /**
   * @param {string} url
   * @param {import("puppeteer").Page} page
   * @returns {Promise<string[]>}
   */
  async visit(url, page) {
    try {
      await page.goto(url);
      //i am using new URL(url).href because https://example.com/ === https://example.com should be the same.
      this.#visitedPages.add(new URL(url).href);
      let hyperlinks = await this.findHyperLinks(page);

      //filter out these links.
      hyperlinks = this.filterHyperlinks(hyperlinks, url);

      console.log(url);

      this.#jobQueue.enqueueNJobs(hyperlinks);
      await page.close();
      return hyperlinks;
    } catch (err) {
      // await page.waitForNavigation();
      //there is probably a navigation
      //i am using new URL(url).href because https://example.com/ === https://example.com should be the same.
      this.#visitedPages.add(new URL(url).href);
      let hyperlinks = await this.findHyperLinks(page);

      //filter out these links.
      hyperlinks = this.filterHyperlinks(hyperlinks, url);

      console.log(url);

      this.#jobQueue.enqueueNJobs(hyperlinks);
      await page.close();
      return hyperlinks;
    }
  }

  /**@param {string} url */
  async crawl(url) {
    const page = await this.#browser.newPage();

    let hyperlinks = await this.visit(url, page);

    //filter out these links.
    hyperlinks = this.filterHyperlinks(hyperlinks, url);

    let batch = this.#jobQueue.dequeueNJobs(10);
    do {
      await this.visitNPages(batch);
      batch = this.#jobQueue.dequeueNJobs(10);
    } while (this.#jobQueue.length > 0);
    await this.#browser.close();
  }

  filterHyperlinks(hyperlinks, url) {
    hyperlinks = this.filterDifferentHostname(hyperlinks, new URL(url).hostname);
    hyperlinks = this.filterOutVisitedPages(hyperlinks);
    hyperlinks = _.uniq(hyperlinks);
    hyperlinks = this.filterOutHashUrls(hyperlinks);
    return hyperlinks;
  }

  /**
   * @param {string[]} hyperlinks
   */
  async visitNPages(hyperlinks) {
    const visits = [];
    for (const hyperlink of hyperlinks) {
      if (!this.#visitedPages.has(hyperlink)) {
        visits.push(this.visit(hyperlink, await this.#browser.newPage()));
      }
    }
    const newLinks = await Promise.all(visits);
    return newLinks.flat(1);
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

  /**
   * @param {string[]} hyperlinks
   * @returns {string[]}
   */
  filterOutVisitedPages(hyperlinks) {
    return hyperlinks.filter((hyperlink) => !this.#visitedPages.has(new URL(hyperlink).href));
  }

  /**
   * @param {import("puppeteer").Page} page 
   * @returns {Promise<string[]>} 
   **/
  async findHyperLinks(page) {
    const hyperlinks = await page.$$eval(
      "a",
      (as) => as.map((a) => a.href),
    );
    return hyperlinks.filter((link) => validator.isURL(link));
  }

  /**
   * @param {string[]} urls
   */
  filterOutHashUrls(urls) {
    return urls.filter((url) => (new URL(url).hash === '') && (new URL(url).href.indexOf('#') === -1));
  }
}

class JobQueue {
  constructor() {
    this.jobs = [];
  }

  enqueue(job) {
    this.jobs.push(job);
  }

  enqueueNJobs(jobs) {
    this.jobs.push(...jobs);
    return this;
  }

  dequeue() {
    const ID = this.jobs.shift();
    return ID;
  }

  dequeueNJobs(n) {
    return this.jobs.splice(0, n);
  }

  get length() {
    return this.jobs.length;
  }

  get isEmpty() {
    return this.length === 0;
  }
}