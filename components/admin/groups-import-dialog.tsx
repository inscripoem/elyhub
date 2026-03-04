"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconUpload, IconFileSpreadsheet } from "@tabler/icons-react"
import { parseGroupsImport, executeGroupsImport } from "@/lib/actions/groups-import"
import type { GroupImportError, GroupImportPayloadRow, GroupImportSummary } from "@/db/schema"

type Step = "upload" | "preview" | "result"

interface ImportState {
  step: Step
  jobId: string | null
  summary: GroupImportSummary | null
  errors: GroupImportError[]
  preview: GroupImportPayloadRow[]
  isLoading: boolean
  errorMsg: string | null
  result: GroupImportSummary | null
}

const INITIAL_STATE: ImportState = {
  step: "upload",
  jobId: null,
  summary: null,
  errors: [],
  preview: [],
  isLoading: false,
  errorMsg: null,
  result: null,
}

interface GroupsImportDialogProps {
  onSuccess: () => void
}

export function GroupsImportDialog({ onSuccess }: GroupsImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<ImportState>(INITIAL_STATE)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  function handleOpen() {
    setState(INITIAL_STATE)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith(".xlsx")) {
      setState((s) => ({ ...s, errorMsg: "仅支持 .xlsx 格式文件" }))
      return
    }

    setState((s) => ({ ...s, isLoading: true, errorMsg: null }))

    const formData = new FormData()
    formData.append("file", file)

    const res = await parseGroupsImport(formData)

    if ("error" in res) {
      setState((s) => ({ ...s, isLoading: false, errorMsg: res.error as string }))
      return
    }

    setState((s) => ({
      ...s,
      isLoading: false,
      step: "preview",
      jobId: res.jobId,
      summary: res.summary,
      errors: res.errors,
      preview: res.preview,
    }))
  }

  async function handleExecute() {
    if (!state.jobId) return
    setState((s) => ({ ...s, isLoading: true, errorMsg: null }))

    const res = await executeGroupsImport(state.jobId)

    if ("error" in res) {
      setState((s) => ({ ...s, isLoading: false, errorMsg: res.error as string }))
      return
    }

    setState((s) => ({
      ...s,
      isLoading: false,
      step: "result",
      result: res.summary,
    }))
    onSuccess()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  const { step, summary, errors, preview, isLoading, errorMsg, result } = state

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <IconUpload size={16} />
        导入
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent
          className="max-h-[90vh] flex flex-col"
          style={{ maxWidth: step === "preview" ? "80rem" : undefined }}
        >
          <DialogHeader>
            <DialogTitle>
              {step === "upload" && "导入群聊"}
              {step === "preview" && "预览导入数据"}
              {step === "result" && "导入完成"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* ── Step 1: Upload ── */}
            {step === "upload" && (
              <div className="flex flex-col gap-4 py-2">
                <div
                  ref={dropRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <IconFileSpreadsheet
                    size={40}
                    className="mx-auto mb-3 text-muted-foreground"
                  />
                  <p className="text-sm font-medium mb-1">点击或拖拽上传 Excel 文件</p>
                  <p className="text-xs text-muted-foreground">仅支持 .xlsx 格式，最大 5MB，最多 5000 行</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFile(file)
                      e.target.value = ""
                    }}
                  />
                </div>

                {errorMsg && (
                  <p className="text-sm text-destructive">{errorMsg}</p>
                )}

                {isLoading && (
                  <p className="text-sm text-muted-foreground text-center">解析中...</p>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>没有模板？</span>
                  <a
                    href="/api/admin/groups/import-template"
                    download
                    className="text-primary underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    下载标准模板
                  </a>
                  <span className="text-xs">（导出的文件也可直接编辑后导入）</span>
                </div>
              </div>
            )}

            {/* ── Step 2: Preview ── */}
            {step === "preview" && summary && (
              <div className="flex flex-col gap-3 min-h-0">
                {/* Summary bar */}
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="text-muted-foreground">共 {summary.totalRows} 条：</span>
                  {summary.insertCount > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      新增 {summary.insertCount}
                    </Badge>
                  )}
                  {summary.updateCount > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      更新 {summary.updateCount}
                    </Badge>
                  )}
                  {summary.errorRows > 0 && (
                    <Badge variant="destructive">
                      错误 {summary.errorRows}
                    </Badge>
                  )}
                </div>

                {errorMsg && (
                  <p className="text-sm text-destructive">{errorMsg}</p>
                )}

                {/* Preview table */}
                <div className="flex-1 overflow-auto border rounded-md min-h-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="sticky left-0 bg-muted z-10 w-20">状态</TableHead>
                        <TableHead className="w-8 text-muted-foreground text-xs">行</TableHead>
                        <TableHead className="min-w-28">别名</TableHead>
                        <TableHead className="min-w-20">平台</TableHead>
                        <TableHead className="min-w-28">名称</TableHead>
                        <TableHead className="min-w-28">群号</TableHead>
                        <TableHead className="min-w-48">加群链接</TableHead>
                        <TableHead className="min-w-24">管理员QQ</TableHead>
                        <TableHead className="min-w-48">头像URL</TableHead>
                        <TableHead className="min-w-20">分类名</TableHead>
                        <TableHead className="min-w-20">useWorker</TableHead>
                        <TableHead className="min-w-40">到期时间</TableHead>
                        <TableHead className="min-w-48 text-destructive">错误原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Valid rows */}
                      {preview.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell className="sticky left-0 bg-background z-10">
                            {row.op === "insert" ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">新增</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs">更新</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.rowNumber}</TableCell>
                          <TableCell className="font-medium">{row.data.alias}</TableCell>
                          <TableCell>{row.data.platform}</TableCell>
                          <TableCell className="text-muted-foreground">{row.data.name ?? "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{row.data.qqNumber ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs truncate max-w-48">{row.data.joinLink ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{row.data.adminQq ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs truncate max-w-48">{row.data.avatarUrl ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{row.data.categoryName ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{row.data.useWorker === null ? "默认" : row.data.useWorker ? "开启" : "关闭"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{row.data.expireAt ? new Date(row.data.expireAt).toLocaleString("zh-CN") : "—"}</TableCell>
                          <TableCell />
                        </TableRow>
                      ))}
                      {/* Error rows */}
                      {errors.map((err) => (
                        <TableRow key={`err-${err.rowNumber}`} className="bg-destructive/5">
                          <TableCell className="sticky left-0 bg-background z-10">
                            <Badge variant="destructive" className="text-xs">错误</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{err.rowNumber}</TableCell>
                          <TableCell colSpan={10} />
                          <TableCell className="text-destructive text-xs">
                            {err.messages.join("；")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {preview.length === 0 && summary.errorRows > 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    所有行均有错误，请修正后重新上传
                  </p>
                )}
              </div>
            )}

            {/* ── Step 3: Result ── */}
            {step === "result" && result && (
              <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                <div className="text-4xl">✅</div>
                <div>
                  <p className="font-semibold text-lg">导入成功</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    新增 {result.insertCount} 条，更新 {result.updateCount} 条
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            {step === "upload" && (
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
            )}

            {step === "preview" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setState((s) => ({ ...s, step: "upload", errorMsg: null }))}
                  disabled={isLoading}
                >
                  重新上传
                </Button>
                <Button
                  onClick={handleExecute}
                  disabled={isLoading || state.summary?.validRows === 0}
                >
                  {isLoading ? "执行中..." : `确认导入 ${state.summary?.validRows ?? 0} 条`}
                </Button>
              </>
            )}

            {step === "result" && (
              <Button onClick={handleClose}>关闭</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
