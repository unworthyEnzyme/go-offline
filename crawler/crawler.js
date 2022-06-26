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
    await page.goto(url, { waitUntil: 'networkidle2' });
    //i am using new URL(url).href because https://example.com/ === https://example.com should be the same.
    this.#visitedPages.add(new URL(url).href);
    let hyperlinks = await this.findHyperLinks(page);
    page.close();
    console.log(url);
    hyperlinks = this.filterDifferentHostname(hyperlinks, new URL(url).hostname);
    hyperlinks = this.filterOutVisitedPages(hyperlinks);
    hyperlinks = _.uniq(hyperlinks);
    this.#jobQueue.enqueueNJobs(hyperlinks);
    this.#jobQueue.done(url);
    return hyperlinks;
  }

  /**@param {string} url */
  async crawl(url) {
    const page = await this.#browser.newPage();


    this.#jobQueue.emitter.on('done', async () => {
      const job = this.#jobQueue.dequeue();
      if (job && !this.#visitedPages.has(job)) this.visit(job, await this.#browser.newPage());
    });

    let hyperlinks = await this.visit(url, page);
    hyperlinks = this.filterDifferentHostname(hyperlinks, new URL(url).hostname);
    hyperlinks = this.filterOutVisitedPages(hyperlinks);
    hyperlinks = _.uniq(hyperlinks);

    const firstBatch = this.#jobQueue.enqueueNJobs(hyperlinks).dequeueNJobs(10);

    for (const hyperlink of firstBatch) {
      if (!this.#visitedPages.has(hyperlink)) {
        this.visit(hyperlink, await this.#browser.newPage());
      }
    }
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
}

class JobQueue {
  constructor() {
    this.jobs = [];
    this.currentProcessingJobs = new Set();
    this.emitter = new EventEmitter();
  }

  log() {
    console.log({ jobs: this.jobs.length, processing: this.currentProcessingJobs });
  }

  done(ID) {
    this.currentProcessingJobs.delete(ID);
    this.emitter.emit('done');
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
    this.currentProcessingJobs.add(ID);
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