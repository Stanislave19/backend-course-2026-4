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

function writeResponse(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data, null, 2);

  if (!options.output) {
    writeResponse(res, status, body);
    return;
  }

  fs.writeFile(options.output, body, (writeError) => {
    if (writeError) {
      writeResponse(res, 500, JSON.stringify({ error: 'Не вдалося записати відповідь у файл' }, null, 2));
      return;
    }
    writeResponse(res, status, body);
  });
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

    const showCylinders = url.searchParams.get('cylinders') === 'true';
    const maxMpgText = url.searchParams.get('max_mpg');
    const maxMpg = Number(maxMpgText);

    if (maxMpgText !== null && (maxMpgText === '' || Number.isNaN(maxMpg))) {
      sendJson(res, 400, { error: 'Параметр max_mpg має бути числом' });
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

      let filtered = cars;
      if (maxMpgText !== null) {
        filtered = cars.filter((car) => {
          const mpg = toNumber(car.mpg);
          return mpg !== null && mpg < maxMpg;
        });
      }

      const result = filtered.map((car) => {
        const item = { model: car.model };
        if (showCylinders) {
          item.cyl = toNumber(car.cyl);
        }
        item.mpg = toNumber(car.mpg);
        return item;
      });

      sendJson(res, 200, result);
    });
  });

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено: http://${options.host}:${options.port}`);
  });
});