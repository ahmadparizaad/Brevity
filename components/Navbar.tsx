'use client'
import React from 'react'
import { useTheme } from "next-themes";
import TextPressure from "@/components/text-pressure";

function Navbar() {
    const { theme } = useTheme();
// Theme-based colors
const textColor = theme === "dark" ? "#FFFFFF" : "#000000";
const strokeColor = theme === "dark" ? "#444444" : "#CCCCCC";
  return (
    <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <TextPressure
            text="Brevity AI"
            flex={true}
            alpha={false}
            stroke={true}
            width={true}
            weight={true}
            italic={true}
            textColor={textColor}
            strokeColor={strokeColor}
            minFontSize={40}
        />
        </div>
  )
}

export default Navbar