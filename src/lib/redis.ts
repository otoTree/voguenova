import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const VIDEO_TASK_TTL_SECONDS = 86400

const redis = new Redis(REDIS_URL);

export interface PersistedStoryboardScene {
  id: string
  title: string
  duration: number
  visualPrompt: string
  camera: string
  motion: string
  transition: string
  voiceover: string
  referenceUrls: string[]
  soundMode: string
  aspectRatio: string
}

export interface PersistedVideoTask {
  taskId: string
  sceneId: string
  sceneTitle: string
  sceneOrder: number
  duration: number
  prompt: string
  status: string
  progress: number | null
  videoUrl: string | null
  error: string | null
  scene: PersistedStoryboardScene | null
  createdAt: string
  updatedAt: string
}

function getUserVideoTaskIndexKey(userId: string) {
  return `video:tasks:user:${userId}`
}

function getUserVideoTaskKey(userId: string, taskId: string) {
  return `video:task:${userId}:${taskId}`
}

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

export async function upsertUserVideoTask(userId: string, task: PersistedVideoTask) {
  const indexKey = getUserVideoTaskIndexKey(userId)
  const taskKey = getUserVideoTaskKey(userId, task.taskId)
  const payload = JSON.stringify(task)

  const pipeline = redis.pipeline()
  pipeline.sadd(indexKey, task.taskId)
  pipeline.expire(indexKey, VIDEO_TASK_TTL_SECONDS)
  pipeline.set(taskKey, payload, 'EX', VIDEO_TASK_TTL_SECONDS)
  await pipeline.exec()
}

export async function getUserVideoTask(userId: string, taskId: string) {
  const data = await redis.get(getUserVideoTaskKey(userId, taskId))
  return data ? (JSON.parse(data) as PersistedVideoTask) : null
}

export async function getUserVideoTasks(userId: string) {
  const indexKey = getUserVideoTaskIndexKey(userId)
  const taskIds = await redis.smembers(indexKey)

  if (!taskIds.length) {
    return [] as PersistedVideoTask[]
  }

  const values = await redis.mget(taskIds.map((taskId) => getUserVideoTaskKey(userId, taskId)))
  const missingTaskIds = taskIds.filter((_, index) => !values[index])

  if (missingTaskIds.length) {
    await redis.srem(indexKey, ...missingTaskIds)
  }

  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => JSON.parse(value) as PersistedVideoTask)
    .sort((left, right) => {
      if (left.sceneOrder !== right.sceneOrder) {
        return left.sceneOrder - right.sceneOrder
      }

      return left.createdAt.localeCompare(right.createdAt)
    })
}

export default redis;
