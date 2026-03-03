import fs from 'fs';

const content = fs.readFileSync('src/data/vocab.ts', 'utf-8');
const wordRegex = /word:\s*'([^']+)'/g;
const words: string[] = [];
let match;

while ((match = wordRegex.exec(content)) !== null) {
  words.push(match[1].toLowerCase());
}

const duplicates = words.filter((item, index) => words.indexOf(item) !== index);
const uniqueDuplicates = [...new Set(duplicates)];

if (uniqueDuplicates.length > 0) {
  console.log('Duplicate words found:');
  uniqueDuplicates.forEach(word => {
    const count = words.filter(w => w === word).length;
    console.log(`${word}: ${count} times`);
  });
} else {
  console.log('No duplicate words found.');
}
