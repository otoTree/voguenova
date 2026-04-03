import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL);

// Video Queue Functions
export async function pushVideoTask(taskId: string, imageId: string) {
  await redis.rpush('video:tasks', JSON.stringify({ taskId, imageId, timestamp: Date.now() }));
}

export async function popVideoTask() {
  const result = await redis.lpop('video:tasks');
  return result ? JSON.parse(result) : null;
}

export async function setTaskStatus(taskId: string, status: string, videoUrl?: string) {
  await redis.set(`video:status:${taskId}`, JSON.stringify({ status, videoUrl }), 'EX', 86400); // Expires in 24 hours
}

export async function getTaskStatus(taskId: string) {
  const data = await redis.get(`video:status:${taskId}`);
  return data ? JSON.parse(data) : null;
}

export default redis;
