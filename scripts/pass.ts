import fs from 'fs';
import colors from 'colors';
import { testFilenames } from '../test/filenames';

for (const [testSuiteName, pairs] of Object.entries(testFilenames)) {
  console.log('# ' + colors.bold(testSuiteName));
  for (const [key, pair] of Object.entries(pairs)) {
    if (!pair.expected) {
      continue;
    }
    let status: string;
    let color: colors.Color;
    try {
      const output = fs.readFileSync(pair.output, 'utf8');
      try {
        const expected = fs.readFileSync(pair.expected, 'utf8');
        if (output === expected) {
          color = colors.blue;
          status = '✓ Up to date';
        } else {
          try {
            fs.writeFileSync(pair.expected, output);
            color = colors.green;
            status = '✔ Updated';
          } catch {
            status = '✘ Failed to write';
            color = colors.red;
          }
        }
      } catch {
        try {
          fs.writeFileSync(pair.expected, output);
          color = colors.yellow;
          status = '✔ Created';
        } catch {
          status = '✘ Failed to write';
          color = colors.red;
        }
      }
    } catch {
      status = '✘ Failed to read output';
      color = colors.red;
    }
    console.log(` • ${
      key
    } ${
      colors.gray(''.padEnd(23 - key.length, '.'))
    } ${
      color(status.padEnd(12))
    } ${
      colors.gray(`(${pair.expected})`)
    }`);
  }
}

