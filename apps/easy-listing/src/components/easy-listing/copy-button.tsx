'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/client-utils'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  text: string
  label?: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  className?: string
  onCopied?: () => void
}

export function CopyButton({
  text,
  label = 'نسخ',
  variant = 'secondary',
  size = 'sm',
  className,
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const ok = await copyText(text)
    if (ok) {
      setCopied(true)
      onCopied?.()
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      aria-label={label}
      className={cn('gap-1.5 shrink-0', className)}
    >
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
      {size !== 'icon' && <span>{copied ? 'تم النسخ' : label}</span>}
    </Button>
  )
}
