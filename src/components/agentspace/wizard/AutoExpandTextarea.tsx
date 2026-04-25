import { forwardRef, useEffect, useRef, type TextareaHTMLAttributes } from 'react'

const AutoExpandTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AutoExpandTextarea(props, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
      const el = innerRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }, [props.value])

    return (
      <textarea
        ref={(node) => {
          innerRef.current = node
          if (typeof forwardedRef === 'function') {
            forwardedRef(node)
          } else if (forwardedRef) {
            forwardedRef.current = node
          }
        }}
        rows={1}
        style={{ minHeight: '2.5rem', overflow: 'hidden' }}
        {...props}
      />
    )
  }
)

export default AutoExpandTextarea
