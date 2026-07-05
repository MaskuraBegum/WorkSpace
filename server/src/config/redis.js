import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy(times) {
    if (times > 3) {
      console.log('Redis connection failed, running without cache');
      return null;
    }
    return Math.min(times * 200, 1000);
  },
  lazyConnect: true
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.log('Redis error:', err.message));

export default redis;
