import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto"
import { promisify } from "node:util"
import { desc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { db } from "@/lib/db"
import { appUsers, campaignRequests, models } from "@/lib/schema"

const scrypt = promisify(scryptCallback)

export const USER_ROLES = ["admin", "operator", "user"] as const
export const USER_STATUSES = ["active", "invited", "disabled"] as const
export const REQUEST_STATUSES = [
  "submitted",
  "in_review",
  "producing",
  "delivered",
] as const

export type UserRole = (typeof USER_ROLES)[number]
export type UserStatus = (typeof USER_STATUSES)[number]
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  company: string | null
  createdAt: string
}

export interface CampaignRequest {
  id: string
  productName: string
  brief: string | null
  status: RequestStatus
  requesterName: string
  preferredModelName: string | null
  operatorName: string | null
  createdAt: string
}

export interface RoleSummary {
  role: UserRole
  label: string
  description: string
  total: number
}

export interface UserSystemSnapshot {
  source: "database" | "unavailable"
  users: AppUser[]
  requests: CampaignRequest[]
  roleSummaries: RoleSummary[]
  totals: {
    users: number
    activeOperators: number
    pendingRequests: number
  }
}

interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  status: string
  company: string | null
  createdAt: string | Date
}

interface UserAuthRecord extends UserRecord {
  passwordHash: string | null
}

interface CampaignRequestRecord {
  id: string
  productName: string
  brief: string | null
  status: string
  requesterName: string | null
  preferredModelName: string | null
  operatorName: string | null
  createdAt: string | Date
}

interface CreateUserInput {
  name: string
  email: string
  role: UserRole
  company?: string | null
  status?: UserStatus
  password?: string
}

interface AuthenticateUserInput {
  email: string
  password: string
}

interface RegisterUserInput {
  name: string
  email: string
  company?: string | null
  password: string
}

const ADMIN_USER_ID = "system-admin"
const ADMIN_EMAIL = "admin@voguenova.ai"
const ADMIN_LOGIN_ALIASES = ["admin", ADMIN_EMAIL]

const ROLE_META: Record<
  UserRole,
  {
    label: string
    description: string
  }
> = {
  admin: {
    label: "Admin",
    description: "管理账号、权限、模特资产和运营队列。",
  },
  operator: {
    label: "运营",
    description: "负责生成图文与视频内容，推进交付进度。",
  },
  user: {
    label: "User",
    description: "提交商品需求，选择模特并发起带货项目。",
  },
}

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

function isUserStatus(value: string): value is UserStatus {
  return USER_STATUSES.includes(value as UserStatus)
}

function isRequestStatus(value: string): value is RequestStatus {
  return REQUEST_STATUSES.includes(value as RequestStatus)
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function mapUserRecord(row: UserRecord): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: isUserRole(row.role) ? row.role : "user",
    status: isUserStatus(row.status) ? row.status : "invited",
    company: row.company,
    createdAt: toIsoString(row.createdAt),
  }
}

function mapCampaignRequestRecord(row: CampaignRequestRecord): CampaignRequest {
  return {
    id: row.id,
    productName: row.productName,
    brief: row.brief,
    status: isRequestStatus(row.status) ? row.status : "submitted",
    requesterName: row.requesterName ?? "未分配用户",
    preferredModelName: row.preferredModelName,
    operatorName: row.operatorName,
    createdAt: toIsoString(row.createdAt),
  }
}

function buildRoleSummaries(users: AppUser[]): RoleSummary[] {
  return USER_ROLES.map((role) => ({
    role,
    label: ROLE_META[role].label,
    description: ROLE_META[role].description,
    total: users.filter((user) => user.role === role).length,
  }))
}

function getAdminSecret() {
  return (process.env.AUTH_SECRET || process.env.SESSION_SECRET || "").trim()
}

function getErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return ""
  }

  if ("code" in error) {
    return String(error.code)
  }

  if (
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "code" in error.cause
  ) {
    return String(error.cause.code)
  }

  return ""
}

function isAdminLogin(email: string) {
  return ADMIN_LOGIN_ALIASES.includes(email.trim().toLowerCase())
}

export function getAdminUser(): AppUser {
  return {
    id: ADMIN_USER_ID,
    name: "Platform Admin",
    email: ADMIN_EMAIL,
    role: "admin",
    status: "active",
    company: "VogueNova",
    createdAt: "2026-04-03T00:00:00.000Z",
  }
}

const requesterUser = alias(appUsers, "requester_user")
const preferredModel = alias(models, "preferred_model")
const operatorUser = alias(appUsers, "operator_user")

function buildSnapshot(
  users: AppUser[],
  requests: CampaignRequest[],
  source: "database" | "unavailable"
): UserSystemSnapshot {
  const usersWithAdmin = [getAdminUser(), ...users.filter((user) => user.role !== "admin")]

  return {
    source,
    users: usersWithAdmin,
    requests,
    roleSummaries: buildRoleSummaries(usersWithAdmin),
    totals: {
      users: usersWithAdmin.length,
      activeOperators: usersWithAdmin.filter(
        (user) => user.role === "operator" && user.status === "active"
      ).length,
      pendingRequests: requests.filter(
        (request) => request.status !== "delivered"
      ).length,
    },
  }
}

function buildUnavailableSnapshot() {
  return buildSnapshot([], [], "unavailable")
}

function normalizeText(value: string) {
  return value.trim()
}

function validateCreateUserInput(input: CreateUserInput) {
  const name = normalizeText(input.name)
  const email = normalizeText(input.email).toLowerCase()
  const company = input.company ? normalizeText(input.company) : null
  const status = input.status ?? "invited"

  if (!name) {
    throw new Error("用户名不能为空。")
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("邮箱格式不正确。")
  }

  if (email === ADMIN_EMAIL) {
    throw new Error("该邮箱保留给唯一 admin 使用。")
  }

  if (!isUserRole(input.role)) {
    throw new Error("角色不在允许范围内。")
  }

  if (!isUserStatus(status)) {
    throw new Error("用户状态不在允许范围内。")
  }

  if (input.password && input.password.trim().length < 8) {
    throw new Error("密码至少需要 8 位。")
  }

  return {
    name,
    email,
    role: input.role,
    company,
    status,
    password: input.password?.trim() || "",
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return `${salt}:${derivedKey.toString("hex")}`
}

async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":")

  if (!salt || !storedHash) {
    return false
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  const storedBuffer = Buffer.from(storedHash, "hex")

  if (derivedKey.length !== storedBuffer.length) {
    return false
  }

  return timingSafeEqual(derivedKey, storedBuffer)
}

export async function getUserSystemSnapshot(): Promise<UserSystemSnapshot> {
  if (!isDatabaseConfigured()) {
    return buildUnavailableSnapshot()
  }

  try {
    const [users, requests] = await Promise.all([
      db
        .select({
          id: appUsers.id,
          name: appUsers.name,
          email: appUsers.email,
          role: appUsers.role,
          status: appUsers.status,
          company: appUsers.company,
          createdAt: appUsers.createdAt,
        })
        .from(appUsers)
        .orderBy(desc(appUsers.createdAt))
        .limit(12),
      db
        .select({
          id: campaignRequests.id,
          productName: campaignRequests.productName,
          brief: campaignRequests.brief,
          status: campaignRequests.status,
          requesterName: requesterUser.name,
          preferredModelName: preferredModel.name,
          operatorName: operatorUser.name,
          createdAt: campaignRequests.createdAt,
        })
        .from(campaignRequests)
        .leftJoin(
          requesterUser,
          eq(requesterUser.id, campaignRequests.requesterUserId)
        )
        .leftJoin(
          preferredModel,
          eq(preferredModel.id, campaignRequests.preferredModelId)
        )
        .leftJoin(
          operatorUser,
          eq(operatorUser.id, campaignRequests.assignedOperatorId)
        )
        .orderBy(desc(campaignRequests.createdAt))
        .limit(8),
    ])

    return buildSnapshot(
      users.map(mapUserRecord),
      requests.map(mapCampaignRequestRecord),
      "database"
    )
  } catch {
    return buildUnavailableSnapshot()
  }
}

export async function createUser(input: CreateUserInput): Promise<AppUser> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入用户。")
  }

  if (input.role === "admin") {
    throw new Error("admin 是唯一系统账号，不允许通过数据库创建。")
  }

  const validatedInput = validateCreateUserInput(input)
  const passwordHash = validatedInput.password
    ? await hashPassword(validatedInput.password)
    : null

  try {
    const [createdUser] = await db
      .insert(appUsers)
      .values({
        name: validatedInput.name,
        email: validatedInput.email,
        role: validatedInput.role,
        company: validatedInput.company,
        status: validatedInput.status,
        passwordHash,
      })
      .returning({
        id: appUsers.id,
        name: appUsers.name,
        email: appUsers.email,
        role: appUsers.role,
        status: appUsers.status,
        company: appUsers.company,
        createdAt: appUsers.createdAt,
      })

    return mapUserRecord(createdUser)
  } catch (error: unknown) {
    const errorCode = getErrorCode(error)

    if (errorCode === "23505") {
      throw new Error("该邮箱已存在。")
    }

    throw error
  }
}

export function getRoleMeta(role: UserRole) {
  return ROLE_META[role]
}

export async function registerUser(input: RegisterUserInput) {
  return createUser({
    name: input.name,
    email: input.email,
    company: input.company,
    password: input.password,
    role: "user",
    status: "active",
  })
}

export async function authenticateUser(input: AuthenticateUserInput) {
  const email = normalizeText(input.email).toLowerCase()
  const password = input.password.trim()

  if (!email || !password) {
    throw new Error("邮箱和密码不能为空。")
  }

  if (isAdminLogin(email)) {
    const adminSecret = getAdminSecret()

    if (!adminSecret) {
      throw new Error("AUTH_SECRET 未配置，无法登录 admin。")
    }

    if (password !== adminSecret) {
      throw new Error("admin 密钥错误。")
    }

    return getAdminUser()
  }

  if (!isDatabaseConfigured()) {
    throw new Error("数据库未配置，当前仅支持 admin 登录。")
  }

  const [row] = await db
    .select({
      id: appUsers.id,
      name: appUsers.name,
      email: appUsers.email,
      role: appUsers.role,
      status: appUsers.status,
      company: appUsers.company,
      createdAt: appUsers.createdAt,
      passwordHash: appUsers.passwordHash,
    })
    .from(appUsers)
    .where(eq(appUsers.email, email))
    .limit(1)

  if (!row || !row.passwordHash) {
    throw new Error("邮箱或密码错误。")
  }

  const isPasswordValid = await verifyPassword(password, row.passwordHash)

  if (!isPasswordValid) {
    throw new Error("邮箱或密码错误。")
  }

  const user = mapUserRecord(row as UserAuthRecord)

  if (user.status !== "active") {
    throw new Error("当前账号不可用。")
  }

  return user
}

export async function findUserById(userId: string) {
  if (!userId) {
    return null
  }

  if (userId === ADMIN_USER_ID) {
    return getAdminUser()
  }

  if (!isDatabaseConfigured()) {
    return null
  }

  const [row] = await db
    .select({
      id: appUsers.id,
      name: appUsers.name,
      email: appUsers.email,
      role: appUsers.role,
      status: appUsers.status,
      company: appUsers.company,
      createdAt: appUsers.createdAt,
    })
    .from(appUsers)
    .where(eq(appUsers.id, userId))
    .limit(1)

  return row ? mapUserRecord(row) : null
}

export function getAdminLoginHint() {
  return {
    email: ADMIN_EMAIL,
    alias: "admin",
    requiresSecret: true,
  }
}
