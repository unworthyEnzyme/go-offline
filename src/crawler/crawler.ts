import _ from "lodash";
import puppeteer from "puppeteer";
import validator from "validator";

export default class Crawler {
  #browser: puppeteer.Browser;
  #visitedPages: Set<string> = new Set();
  #jobQueue = new JobQueue();

  async init() {
    this.#browser = await puppeteer.launch({ headless: false });
  }

  async visit(url: string, page: puppeteer.Page) {
    await page.goto(url);
    await page.waitForSelector("a");
    //i am using new URL(url).href because https://example.com/ === https://example.com should be the same.
    this.#visitedPages.add(new URL(url).href);
    let hyperlinks = await this.findHyperLinks(page);

    //filter out these links.
    hyperlinks = this.filterHyperlinks(hyperlinks, url);

    this.#jobQueue.enqueueNJobs(hyperlinks);
    await page.close();
    return hyperlinks;
  }

  async crawl(url: string) {
    const page = await this.#browser.newPage();

    let hyperlinks = await this.visit(url, page);

    //filter out these links.
    hyperlinks = this.filterHyperlinks(hyperlinks, url);

    let batch = this.#jobQueue.dequeueNJobs(10);
    do {
      await this.visitNPages(batch);
      batch = this.#jobQueue.dequeueNJobs(10);
      console.log({
        queueLen: this.#jobQueue.length,
        visitedSetSize: this.#visitedPages.size,
      });
    } while (this.#jobQueue.length > 0);
    await this.#browser.close();
  }

  filterHyperlinks(hyperlinks: string[], url: string) {
    hyperlinks = this.filterDifferentHostname(
      hyperlinks,
      new URL(url).hostname
    );
    hyperlinks = this.filterOutVisitedPages(hyperlinks);
    hyperlinks = _.uniq(hyperlinks);
    hyperlinks = this.filterOutHashUrls(hyperlinks);
    return hyperlinks;
  }

  async visitNPages(hyperlinks: string[]) {
    const visits = [];
    for (const hyperlink of hyperlinks) {
      if (!this.#visitedPages.has(hyperlink)) {
        visits.push(this.visit(hyperlink, await this.#browser.newPage()));
      }
    }
    const newLinks = await Promise.all(visits);
    return newLinks.flat(1);
  }

  filterDifferentHostname(hyperLinks: string[], hostname: string) {
    return hyperLinks.filter(
      (hyperLink) => new URL(hyperLink).hostname === hostname
    );
  }

  filterOutVisitedPages(hyperlinks: string[]) {
    return hyperlinks.filter(
      (hyperlink) => !this.#visitedPages.has(new URL(hyperlink).href)
    );
  }

  async findHyperLinks(page: puppeteer.Page) {
    const hyperlinks = await page.$$eval("a", (as) => as.map((a) => a.href));
    return hyperlinks.filter((link) => validator.isURL(link));
  }

  filterOutHashUrls(urls: string[]) {
    return urls.filter(
      (url) => new URL(url).hash === "" && new URL(url).href.indexOf("#") === -1
    );
  }
}

class JobQueue {
  jobs: string[];
  constructor() {
    this.jobs = [];
  }

  enqueue(job: string) {
    this.jobs.push(job);
  }

  enqueueNJobs(jobs: string[]) {
    this.jobs.push(...jobs);
    return this;
  }

  dequeue() {
    const ID = this.jobs.shift();
    return ID;
  }

  dequeueNJobs(n: number) {
    return this.jobs.splice(0, n);
  }

  get length() {
    return this.jobs.length;
  }

  get isEmpty() {
    return this.length === 0;
  }
}
