'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

const defaultVariants = {
  hidden: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeInOut' } }
}

export function PageTransition({ 
  children, 
  className = "" 
}: PageTransitionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={defaultVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
} 