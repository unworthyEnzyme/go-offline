import { Command } from "commander";
const program = new Command();
import Crawler from "../crawler/crawler.js";

program
  .name("offline-web")
  .description("CLI to download and serve websites")
  .version("0.0.1");

program.command("download")
  .description("Download website")
  .argument("<url>", "Website's url")
  .option("--depth <integer>", "Number of pages you want to download")
  .action(async (url, options) => {
    //TODO: call the download module from here with the options and url
    //TODO: validate url and options
    const crawler = new Crawler();
    await crawler.init();
    crawler.crawl(url);
  });

export default program;
