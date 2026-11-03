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

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function parseNdjson(text) {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return Number(value);
}

fs.access(options.input, (error) => {
  if (error) {
    console.error('Cannot find input file');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname !== '/') {
      sendJson(res, 404, { error: 'Маршрут не знайдено' });
      return;
    }

    fs.readFile(options.input, 'utf8', (readError, text) => {
      if (readError) {
        sendJson(res, 500, { error: 'Не вдалося прочитати файл даних' });
        return;
      }

      let cars;
      try {
        cars = parseNdjson(text);
      } catch {
        sendJson(res, 500, { error: 'Файл даних пошкоджено' });
        return;
      }

      const result = cars.map((car) => ({
        model: car.model,
        mpg: toNumber(car.mpg),
      }));

      sendJson(res, 200, result);
    });
  });

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено: http://${options.host}:${options.port}`);
  });
});