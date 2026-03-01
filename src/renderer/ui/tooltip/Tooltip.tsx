import React, { useState, useRef, useEffect, ReactElement } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: React.ReactNode
  children: ReactElement
  delay?: number
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, delay = 300 }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLElement | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const showTooltip = () => {
    if (!content) return
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setCoords({
          x: rect.left + rect.width / 2,
          y: rect.bottom + 6 // 6px gap below the element
        })
        setIsVisible(true)
      }
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // If there's no content to show, just return the child unchanged
  if (!content) return children

  // Clone the child to attach event listeners and ref
  const child = React.Children.only(children)
  const clone = React.cloneElement(child, {
    ref: (node: HTMLElement) => {
      triggerRef.current = node
      // Handle existing refs on the child if any
      const existingRef = (child as any).ref
      if (typeof existingRef === 'function') {
        existingRef(node)
      } else if (existingRef && 'current' in existingRef) {
        existingRef.current = node
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      showTooltip()
      if (child.props.onMouseEnter) child.props.onMouseEnter(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hideTooltip()
      if (child.props.onMouseLeave) child.props.onMouseLeave(e)
    }
  })

  return (
    <>
      {clone}
      {isVisible && createPortal(
        <div
          className="fixed z-[9999] px-2.5 py-1.5 text-[11px] font-medium text-white bg-gray-800 rounded-md shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: coords.x,
            top: coords.y,
            transform: 'translateX(-50%)'
          }}
        >
          {content}
          {/* Arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45" />
        </div>,
        document.body
      )}
    </>
  )
}
