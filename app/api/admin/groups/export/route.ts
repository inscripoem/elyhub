import ExcelJS from "exceljs"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth-server"
import { listGroupsForExport } from "@/lib/repositories/groups-admin"

const querySchema = z.object({
  mode: z.enum(["all", "filtered"]).default("filtered"),
  platform: z.enum(["qq", "wechat", "other", "all"]).optional(),
  categoryId: z.string().optional(),
  search: z.string().max(200).optional(),
  status: z.enum(["ACTIVE", "INVALID", "UNKNOWN", "all"]).optional(),
})

function excelSafe(value: string | null | undefined): string {
  if (!value) return ""
  if (/^[=+\-@]/.test(value)) return `'${value}`
  return value
}

const HEADERS: { label: string; key: string; width: number }[] = [
  { label: "ID", key: "id", width: 38 },
  { label: "平台", key: "platform", width: 10 },
  { label: "别名", key: "alias", width: 20 },
  { label: "名称", key: "name", width: 20 },
  { label: "群号", key: "qqNumber", width: 14 },
  { label: "加群链接", key: "joinLink", width: 40 },
  { label: "管理员QQ", key: "adminQq", width: 14 },
  { label: "头像URL", key: "avatarUrl", width: 40 },
  { label: "Worker同步", key: "useWorker", width: 12 },
  { label: "到期时间", key: "expireAt", width: 22 },
  { label: "分类名", key: "categoryName", width: 16 },
  { label: "创建时间", key: "createdAt", width: 22 },
]

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    mode: url.searchParams.get("mode") ?? "filtered",
    platform: url.searchParams.get("platform") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  })

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const rows = await listGroupsForExport(parsed.data)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("groups")

  sheet.columns = HEADERS.map((h) => ({ width: h.width }))

  // 表头行
  const headerRow = sheet.addRow(HEADERS.map((h) => h.label))
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBDD7EE" },
  }
  headerRow.alignment = { vertical: "middle" }

  sheet.views = [{ state: "frozen", ySplit: 1 }]

  // 数据行
  for (const r of rows) {
    sheet.addRow([
      r.id,
      r.platform,
      excelSafe(r.alias),
      excelSafe(r.name),
      excelSafe(r.qqNumber),
      excelSafe(r.joinLink),
      excelSafe(r.adminQq),
      excelSafe(r.avatarUrl),
      r.useWorker === null ? "" : r.useWorker ? "true" : "false",
      r.expireAt ? r.expireAt.toISOString() : "",
      excelSafe(r.categoryName),
      r.createdAt.toISOString(),
    ])
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `groups-export-${timestamp}.xlsx`

  return new Response(blob, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
