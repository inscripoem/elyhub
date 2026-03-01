"use client"

import { QRCodeSVG } from "qrcode.react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { IconQrcode } from "@tabler/icons-react"

export function QrCodePopover({ url }: { url: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="显示二维码"
        >
          <IconQrcode size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" side="left">
        <QRCodeSVG value={url} size={160} />
        <p className="text-xs text-muted-foreground text-center mt-2 max-w-[160px] break-all">
          {url}
        </p>
      </PopoverContent>
    </Popover>
  )
}
