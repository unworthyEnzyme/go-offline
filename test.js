import fs from 'fs/promises';

let urls = await fs.readFile('second-run.txt', { encoding: 'utf-8' });
urls = urls.split('\n');
// console.log(urls.length);
const unique = new Set(urls);
// console.log(unique.size);

const toFindDuplicates = arry => arry.filter((item, index) => arry.indexOf(item) !== index);
const duplicates = toFindDuplicates(urls);
console.log(duplicates);