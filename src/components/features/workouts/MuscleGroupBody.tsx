'use client'

import { memo } from 'react'
// import type { MuscleGroup } from '@prisma/client'
import { useMuscleFrequency, type ExerciseWithMuscles } from '@/hooks/useMuscleFrequency'
import { getMuscleColor, ALL_SVG_MUSCLE_KEYS } from '@/lib/muscle-group-map'
import {
  FRONT_BODY_OUTLINE,
  BACK_BODY_OUTLINE,
  FRONT_OUTLINE_STROKES,
  BACK_OUTLINE_STROKES,
  MUSCLE_PATHS,
} from './MuscleGroupBodyPaths'
import { cn } from '@/lib/utils'

interface MuscleGroupBodyProps {
  exercises: ExerciseWithMuscles[]
  size?: 'sm' | 'smd' | 'md' | 'lmd' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-24',
  smd: 'w-32',
  md: 'w-48',
  lmd: 'w-56',
  lg: 'w-64',
}

function MuscleGroupBodyInner({ exercises, size = 'md', className }: MuscleGroupBodyProps) {
  const { counts, maxValue } = useMuscleFrequency(exercises)

  return (
    <div className={cn(SIZE_CLASSES[size], 'h-auto', className)}>
      <svg
        viewBox="0 0 810 1240"
        fill="none"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="body-front-back">
          {/* Front body outline */}
          <g id="front-outline">
            {FRONT_BODY_OUTLINE.map((d, i) => (
              <path key={`fo-${i}`} d={d} fill="#464646" />
            ))}
            {FRONT_OUTLINE_STROKES.map((d, i) => (
              <path key={`fos-${i}`} d={d} stroke="black" strokeWidth="3" />
            ))}
          </g>

          {/* Back body outline */}
          <g id="back-outline">
            {BACK_BODY_OUTLINE.map((d, i) => (
              <path key={`bo-${i}`} d={d} fill="#464646" />
            ))}
            {BACK_OUTLINE_STROKES.map((d, i) => (
              <path key={`bos-${i}`} d={d} stroke="black" strokeWidth="3" />
            ))}
          </g>

          {/* Muscle group fills and strokes */}
          {ALL_SVG_MUSCLE_KEYS.map((muscleKey) => {
            const paths = MUSCLE_PATHS[muscleKey]
            if (!paths) return null
            const color = getMuscleColor(muscleKey, counts, maxValue)

            return (
              <g key={muscleKey} id={muscleKey}>
                {paths.fillPaths.map((d, i) => (
                  <path key={`f-${i}`} d={d} fill={color} />
                ))}
                {paths.strokePaths.map((d, i) => (
                  <path key={`s-${i}`} d={d} stroke="black" />
                ))}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

export const MuscleGroupBody = memo(MuscleGroupBodyInner)
