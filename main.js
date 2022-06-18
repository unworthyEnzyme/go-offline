import Crawler from "./crawler/crawler.js";

async function main() {
  const crawler = new Crawler();
  await crawler.init();
  crawler.visit("https://vitejs.dev");
}

main();
