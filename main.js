import fs from 'node:fs';
import http from 'node:http';
import { Command } from 'commander';

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'шлях до файлу даних')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .option('-o, --output <path>', 'файл для запису останньої відповіді')
  .helpOption('--help', 'показати довідку');

program.parse();
const options = program.opts();

fs.access(options.input, (error) => {
  if (error) {
    console.error('Cannot find input file');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'Сервер працює' }));
  });

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено: http://${options.host}:${options.port}`);
  });
});