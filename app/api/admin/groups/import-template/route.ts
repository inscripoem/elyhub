import ExcelJS from "exceljs"
import { requireAdmin } from "@/lib/auth-server"

const HEADERS: { label: string; width: number }[] = [
  { label: "平台", width: 10 },
  { label: "别名", width: 20 },
  { label: "名称", width: 20 },
  { label: "群号", width: 14 },
  { label: "加群链接", width: 40 },
  { label: "管理员QQ", width: 14 },
  { label: "头像URL", width: 40 },
  { label: "Worker同步", width: 12 },
  { label: "到期时间", width: 22 },
  { label: "分类名", width: 16 },
]

const EXAMPLE_ROW = [
  "qq",
  "示例群聊",
  "",
  "123456789",
  "",
  "",
  "",
  "",
  "",
  "",
]

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("template")

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

  // 示例行（灰色字体）
  const exampleRow = sheet.addRow(EXAMPLE_ROW)
  exampleRow.font = { color: { argb: "FF9E9E9E" } }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  return new Response(blob, {
    headers: {
      "Content-Disposition":
        'attachment; filename="groups-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  })
}
