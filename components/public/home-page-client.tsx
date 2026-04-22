"use client"

import { useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GroupSection } from "@/components/public/group-section"
import { IconInfoCircle, IconSearch } from "@tabler/icons-react"
import type { Group, GroupCategory } from "@/db/schema"

interface HomePageClientProps {
  groups: Group[]
  categories: GroupCategory[]
  announcement: string | null | undefined
  initialSearch: string
  initialPlatform: string
  initialStatus: string
}

const PLATFORM_OPTIONS = [
  { value: "all", label: "全部平台" },
  { value: "qq", label: "QQ" },
  { value: "wechat", label: "微信" },
  { value: "other", label: "其他" },
]

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "ACTIVE", label: "活跃" },
  { value: "INVALID", label: "已失效" },
  { value: "UNKNOWN", label: "未知" },
]

function buildQueryString(search: string, platform: string, status: string) {
  const params = new URLSearchParams()
  if (search.trim()) params.set("search", search.trim())
  if (platform !== "all") params.set("platform", platform)
  if (status !== "all") params.set("status", status)
  const query = params.toString()
  return query ? `/?${query}` : "/"
}

export function HomePageClient({
  groups,
  categories,
  announcement,
  initialSearch,
  initialPlatform,
  initialStatus,
}: HomePageClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch)
  const [platformFilter, setPlatformFilter] = useState(initialPlatform)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const now = useMemo(() => new Date(), [])

  const { sections, uncategorized } = useMemo(() => {
    const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const sections = sortedCategories
      .map((cat) => ({
        category: cat,
        groups: groups.filter((g) => g.categoryId === cat.id),
      }))
      .filter((s) => s.groups.length > 0)

    const categoryIds = new Set(categories.map((c) => c.id))
    const uncategorized = groups.filter(
      (g) => !g.categoryId || !categoryIds.has(g.categoryId)
    )

    return { sections, uncategorized }
  }, [groups, categories])

  const hasCategories = categories.length > 0

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.replace(buildQueryString(value, platformFilter, statusFilter))
    }, 300)
  }

  function handlePlatformChange(value: string) {
    setPlatformFilter(value)
    router.replace(buildQueryString(search, value, statusFilter))
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value)
    router.replace(buildQueryString(search, platformFilter, value))
  }

  return (
    <div>
      {announcement && announcement.trim() && (
        <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">公告</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400 whitespace-pre-wrap">
            {announcement}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-48">
          <IconSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="搜索群聊..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={platformFilter} onValueChange={handlePlatformChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groups.length === 0 && (
        <div className="border rounded-lg py-12 text-center text-muted-foreground text-sm">
          没有匹配的群聊
        </div>
      )}

      {hasCategories ? (
        <>
          {sections.map(({ category, groups: catGroups }) => (
            <GroupSection
              key={category.id}
              title={category.name}
              groups={catGroups}
              now={now}
            />
          ))}
          {uncategorized.length > 0 && (
            <GroupSection title="其他" groups={uncategorized} now={now} />
          )}
        </>
      ) : (
        groups.length > 0 && (
          <GroupSection title="全部群聊" groups={groups} now={now} />
        )
      )}
    </div>
  )
}
