"use server"

import ExcelJS from "exceljs"
import { and, eq, inArray, lt } from "drizzle-orm"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { groupImportJobs, groups } from "@/db/schema"
import { requireAdmin } from "@/lib/auth-server"
import { listCategoriesByName } from "@/lib/repositories/groups-admin"
import type {
  GroupImportError,
  GroupImportPayloadRow,
  GroupImportSummary,
} from "@/db/schema"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_ROWS = 5000
const JOB_TTL_MS = 24 * 60 * 60 * 1000 // 24h

const platformSchema = z.enum(["qq", "wechat", "other"])
const uuidSchema = z.string().uuid()

// 中英文列名映射
const HEADER_ALIASES: Record<string, string> = {
  id: "id",
  platform: "platform",
  平台: "platform",
  alias: "alias",
  别名: "alias",
  name: "name",
  名称: "name",
  群名称: "name",
  qqnumber: "qqNumber",
  qq号: "qqNumber",
  群号: "qqNumber",
  joinlink: "joinLink",
  加群链接: "joinLink",
  adminqq: "adminQq",
  管理员qq: "adminQq",
  avatarurl: "avatarUrl",
  头像url: "avatarUrl",
  useworker: "useWorker",
  worker同步: "useWorker",
  expireat: "expireAt",
  到期时间: "expireAt",
  二维码到期时间: "expireAt",
  categoryname: "categoryName",
  分类名: "categoryName",
  createdat: "createdAt",
  创建时间: "createdAt",
}

function normalizeKey(k: string): string {
  return k.trim().replace(/\s+/g, "").toLowerCase()
}

function clean(v: unknown): string {
  return String(v ?? "").trim()
}

function normalizeRow(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    const mapped = HEADER_ALIASES[normalizeKey(k)]
    if (mapped) out[mapped] = clean(v)
  }
  return out
}

function parseUseWorker(value: string): boolean | null | "invalid" {
  if (!value) return null
  const v = value.toLowerCase()
  if (["true", "1", "yes", "y", "开启"].includes(v)) return true
  if (["false", "0", "no", "n", "关闭"].includes(v)) return false
  if (["default", "defaults", "null", "默认", "inherit", "跟随"].includes(v)) return null
  return "invalid"
}

function parseExpireAt(value: string): string | null | "invalid" {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "invalid"
  return d.toISOString()
}

export async function parseGroupsImport(formData: FormData) {
  const session = await requireAdmin()
  if (!session) return { error: "Unauthorized" as const }

  const file = formData.get("file")
  if (!(file instanceof File)) return { error: "请上传 Excel 文件" as const }
  if (file.size > MAX_FILE_SIZE) {
    return { error: `文件过大，最大 ${MAX_FILE_SIZE / 1024 / 1024}MB` as const }
  }

  const ab = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(ab)
  } catch {
    return { error: "文件解析失败，请上传有效的 .xlsx 文件" as const }
  }

  const sheet = workbook.worksheets[0]
  if (!sheet) return { error: "Excel 缺少工作表" as const }

  const headers: string[] = []
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? "")
  })

  const rawRows: Record<string, unknown>[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const obj: Record<string, unknown> = {}
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col - 1]
      if (key) obj[key] = cell.text ?? ""
    })
    rawRows.push(obj)
  })

  if (rawRows.length === 0) return { error: "文件没有可导入数据" as const }
  if (rawRows.length > MAX_ROWS) {
    return { error: `行数超限，最大 ${MAX_ROWS} 行` as const }
  }

  const categoryMap = await listCategoriesByName()

  const errors: GroupImportError[] = []
  const validRows: Array<{ rowNumber: number; data: GroupImportPayloadRow["data"] & { id?: string } }> = []

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2 // Excel 行号（1=表头，从2开始）
    const row = normalizeRow(rawRows[i])
    const messages: string[] = []

    // alias 必填
    const alias = clean(row.alias)
    if (!alias) messages.push("alias/别名 必填")

    // platform 必填且枚举值
    const platformResult = platformSchema.safeParse(clean(row.platform))
    if (!platformResult.success) {
      messages.push("platform/平台 必须是 qq、wechat 或 other")
    }
    const platform = platformResult.success ? platformResult.data : "other"

    // id 可选，若有必须是合法 UUID
    const idRaw = clean(row.id)
    let id: string | undefined
    if (idRaw) {
      const idResult = uuidSchema.safeParse(idRaw)
      if (!idResult.success) messages.push("id 必须是合法 UUID（或留空）")
      else id = idResult.data
    }

    // qqNumber：platform=qq 时必填
    const qqNumber = clean(row.qqNumber) || null
    if (platform === "qq" && !qqNumber) {
      messages.push("qqNumber/群号 在 QQ 平台必填")
    }

    // useWorker
    const useWorkerResult = parseUseWorker(clean(row.useWorker))
    if (useWorkerResult === "invalid") {
      messages.push("useWorker 仅支持 true、false 或留空（跟随全局）")
    }

    // expireAt
    const expireAtResult = parseExpireAt(clean(row.expireAt))
    if (expireAtResult === "invalid") {
      messages.push("expireAt/到期时间 不是合法日期格式")
    }

    // categoryName → categoryId
    let categoryId: string | null = null
    const categoryName = clean(row.categoryName)
    if (categoryName) {
      const found = categoryMap.get(categoryName.toLowerCase())
      if (!found) messages.push(`分类不存在："${categoryName}"`)
      else categoryId = found
    }

    if (messages.length > 0) {
      errors.push({ rowNumber, messages })
      continue
    }

    validRows.push({
      rowNumber,
      data: {
        id,
        platform,
        alias,
        name: clean(row.name) || null,
        qqNumber: platform === "qq" ? qqNumber : null,
        joinLink: clean(row.joinLink) || null,
        adminQq: platform === "qq" ? clean(row.adminQq) || null : null,
        avatarUrl: clean(row.avatarUrl) || null,
        useWorker: useWorkerResult as boolean | null,
        expireAt: expireAtResult as string | null,
        categoryId,
        categoryName: categoryId ? categoryName : null,
      },
    })
  }

  // round-trip：校验有 id 的行目标必须存在于 groups 表
  const updateIds = validRows
    .map((r) => r.data.id)
    .filter((id): id is string => Boolean(id))

  if (updateIds.length > 0) {
    const existing = await db
      .select({ id: groups.id })
      .from(groups)
      .where(inArray(groups.id, updateIds))
    const existingSet = new Set(existing.map((r) => r.id))

    const notFoundRows = validRows.filter(
      (r) => r.data.id && !existingSet.has(r.data.id)
    )
    for (const r of notFoundRows) {
      errors.push({
        rowNumber: r.rowNumber,
        messages: [`找不到 id 为 "${r.data.id}" 的群聊（UPDATE 目标不存在）`],
      })
    }

    // 从 validRows 中移除 not found 的行
    const errorRowNumbers = new Set(notFoundRows.map((r) => r.rowNumber))
    validRows.splice(
      0,
      validRows.length,
      ...validRows.filter((r) => !errorRowNumbers.has(r.rowNumber))
    )
  }

  const insertRows = validRows.filter((r) => !r.data.id)
  const updateRows = validRows.filter((r) => Boolean(r.data.id))
  const mode = updateRows.length > 0 ? "round_trip" : "standard"

  const summary: GroupImportSummary = {
    totalRows: rawRows.length,
    validRows: validRows.length,
    errorRows: errors.length,
    insertCount: insertRows.length,
    updateCount: updateRows.length,
  }

  const expiresAt = new Date(Date.now() + JOB_TTL_MS)
  const payload: GroupImportPayloadRow[] = validRows.map((r) => ({
    rowNumber: r.rowNumber,
    op: r.data.id ? "update" : "insert",
    data: r.data,
  }))

  const [job] = await db
    .insert(groupImportJobs)
    .values({
      createdByUserId: session.user.id,
      mode,
      status: "PARSED",
      sourceFileName: file.name || "upload.xlsx",
      sourceFileSizeBytes: file.size,
      payload: { rows: payload },
      summary,
      errors,
      expiresAt,
    })
    .returning({ id: groupImportJobs.id })

  return {
    success: true as const,
    jobId: job.id,
    mode,
    summary,
    errors,
    preview: payload,
  }
}

export async function executeGroupsImport(jobId: string) {
  const session = await requireAdmin()
  if (!session) return { error: "Unauthorized" as const }

  const idResult = uuidSchema.safeParse(jobId)
  if (!idResult.success) return { error: "无效 jobId" as const }

  // 清理过期 job（顺手清理）
  await db
    .delete(groupImportJobs)
    .where(lt(groupImportJobs.expiresAt, new Date()))

  const [job] = await db
    .select()
    .from(groupImportJobs)
    .where(
      and(
        eq(groupImportJobs.id, idResult.data),
        eq(groupImportJobs.createdByUserId, session.user.id)
      )
    )
    .limit(1)

  if (!job) return { error: "导入任务不存在或已过期" as const }
  if (job.status !== "PARSED") return { error: "导入任务已执行过，请重新上传" as const }
  if (job.expiresAt < new Date()) return { error: "导入任务已过期，请重新上传" as const }

  const rows = job.payload.rows
  const insertRows = rows.filter((r) => r.op === "insert")
  const updateRows = rows.filter((r) => r.op === "update")

  await db.transaction(async (tx) => {
    if (insertRows.length > 0) {
      await tx.insert(groups).values(
        insertRows.map((r) => ({
          platform: r.data.platform,
          alias: r.data.alias,
          name: r.data.name,
          qqNumber: r.data.platform === "qq" ? r.data.qqNumber : null,
          joinLink: r.data.joinLink,
          adminQq: r.data.platform === "qq" ? r.data.adminQq : null,
          avatarUrl: r.data.avatarUrl,
          useWorker: r.data.useWorker,
          expireAt: r.data.expireAt ? new Date(r.data.expireAt) : null,
          categoryId: r.data.categoryId,
        }))
      )
    }

    for (const r of updateRows) {
      const [updated] = await tx
        .update(groups)
        .set({
          platform: r.data.platform,
          alias: r.data.alias,
          name: r.data.name,
          qqNumber: r.data.platform === "qq" ? r.data.qqNumber : null,
          joinLink: r.data.joinLink,
          adminQq: r.data.platform === "qq" ? r.data.adminQq : null,
          avatarUrl: r.data.avatarUrl,
          useWorker: r.data.useWorker,
          expireAt: r.data.expireAt ? new Date(r.data.expireAt) : null,
          categoryId: r.data.categoryId,
        })
        .where(eq(groups.id, r.data.id!))
        .returning({ id: groups.id })

      if (!updated) {
        throw new Error(`UPDATE 目标不存在: ${r.data.id}`)
      }
    }

    // 执行后删除 job（防重放）
    await tx.delete(groupImportJobs).where(eq(groupImportJobs.id, job.id))
  })

  revalidatePath("/")
  revalidatePath("/admin/groups")
  return { success: true as const, summary: job.summary }
}
