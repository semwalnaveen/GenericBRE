"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export function AnimatedNumber({ value }: { value: number }) {
  const [hasMounted, setHasMounted] = useState(false);
  
  // Spring configuration for smooth, decelerating counter
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  
  const display = useTransform(spring, (current) => {
    const val = Math.floor(current);
    return val > 1000 ? (val / 1000).toFixed(1) + "K" : val.toString();
  });

  useEffect(() => {
    setHasMounted(true);
    spring.set(value);
  }, [spring, value]);

  // Prevent hydration mismatch
  if (!hasMounted) {
    return <span>{value > 1000 ? (value / 1000).toFixed(1) + "K" : value}</span>;
  }

  return <motion.span>{display}</motion.span>;
}
