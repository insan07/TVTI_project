import React from 'react'

export default function SectionHeading({
  title,
  subtitle,
  align = 'left',
  className = '',
  ...props
}) {
  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }

  return (
    <div
      className={`flex flex-col ${alignmentClasses[align]} ${className}`}
      {...props}
    >
      <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-brand-black tracking-tight uppercase">
        {title}
      </h2>
      
      {/* Orange accent line */}
      <span className="h-1.5 w-16 bg-brand-orange mt-3 rounded-full transition-all duration-500 hover:w-24" />
      
      {subtitle && (
        <p className="mt-4 text-brand-charcoal/80 font-sans font-normal text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
