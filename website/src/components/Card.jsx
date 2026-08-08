import React from 'react'

export default function Card({
  children,
  className = '',
  hoverEffect = true,
  ...props
}) {
  return (
    <div
      className={`
        bg-brand-light 
        rounded-xl 
        p-6 
        md:p-8 
        border 
        border-black/5 
        shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
        ${hoverEffect ? 'transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
