const { Command } = require("commander");
const program = new Command();

program
  .name("offline-web")
  .description("CLI to download and serve websites")
  .version("0.0.1");

program.command("download")
  .description("Download website")
  .argument("<url>", "Website's url")
  .option("--depth <integer>", "Number of pages you want to download")
  .action((url, options) => {
    //call the download module from here with the options and url
    console.log({ url, options });
  });

program.parse();