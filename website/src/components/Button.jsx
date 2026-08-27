import React from 'react'

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-heading font-extrabold text-xs uppercase tracking-widest rounded-lg min-h-[44px] px-6 py-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-orange active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
  
  const variants = {
    primary: 'bg-brand-orange text-brand-white border-2 border-brand-orange hover:bg-brand-black hover:text-brand-white hover:border-brand-black active:bg-slate-900 active:text-brand-white shadow-md hover:shadow-lg',
    secondary: 'bg-brand-white text-brand-black border-2 border-brand-white hover:bg-brand-orange hover:text-brand-white hover:border-brand-orange active:bg-brand-black active:text-brand-white shadow-md hover:shadow-lg',
    outline: 'bg-transparent border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-brand-white active:bg-brand-black active:text-brand-white active:border-brand-black shadow-sm',
    darkOutline: 'bg-transparent border-2 border-brand-white text-brand-white hover:bg-brand-white hover:text-brand-black active:bg-brand-orange active:text-brand-white active:border-brand-orange shadow-sm',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
