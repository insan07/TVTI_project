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
  const baseStyles = 'inline-flex items-center justify-center font-heading font-semibold text-sm rounded-lg min-h-[44px] px-6 py-2.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
  
  const variants = {
    primary: 'bg-brand-orange text-brand-white hover:bg-brand-black hover:text-brand-white shadow-sm hover:shadow-md',
    secondary: 'bg-brand-black text-brand-white hover:bg-brand-orange hover:text-brand-white shadow-sm hover:shadow-md border border-brand-charcoal',
    outline: 'bg-transparent border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-brand-white',
    darkOutline: 'bg-transparent border-2 border-brand-white text-brand-white hover:bg-brand-white hover:text-brand-black',
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
