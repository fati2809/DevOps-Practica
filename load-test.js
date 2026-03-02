import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 20 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {

  // Endpoint 1: Health
  const healthRes = http.get('http://localhost:3000/health');

  check(healthRes, {
    'Health status 200': (r) => r.status === 200,
  });

  sleep(1);

  // Endpoint 2: Items
  const itemsRes = http.get('http://localhost:3000/items');

  check(itemsRes, {
    'Items status 200': (r) => r.status === 200,
    'Response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
