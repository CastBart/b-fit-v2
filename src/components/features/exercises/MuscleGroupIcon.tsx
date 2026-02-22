'use client'

import { memo } from 'react'
import { MuscleGroup } from '@prisma/client'
import {
  MUSCLE_GROUP_TO_SVG_KEYS,
  ALL_SVG_MUSCLE_KEYS,
  MUSCLE_GROUP_VIEWBOX,
} from '@/lib/muscle-group-map'
import {
  FRONT_BODY_OUTLINE,
  FRONT_OUTLINE_STROKES,
  BACK_BODY_OUTLINE,
  BACK_OUTLINE_STROKES,
  MUSCLE_PATHS,
} from '@/components/features/workouts/MuscleGroupBodyPaths'

interface MuscleGroupIconProps {
  muscleGroup: MuscleGroup
}

export const MuscleGroupIcon = memo(function MuscleGroupIcon({
  muscleGroup,
}: MuscleGroupIconProps) {
  const highlightedKeys = MUSCLE_GROUP_TO_SVG_KEYS[muscleGroup]
  const viewBox = MUSCLE_GROUP_VIEWBOX[muscleGroup]

  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      style={{ overflow: 'hidden' }}
    >
      {/* Front body outline */}
      {FRONT_BODY_OUTLINE.map((d, i) => (
        <path key={`front-outline-${i}`} d={d} fill="#3A3A3A" stroke="none" />
      ))}
      {FRONT_OUTLINE_STROKES.map((d, i) => (
        <path key={`front-stroke-${i}`} d={d} fill="none" stroke="#555" strokeWidth={2} />
      ))}

      {/* Back body outline */}
      {BACK_BODY_OUTLINE.map((d, i) => (
        <path key={`back-outline-${i}`} d={d} fill="#3A3A3A" stroke="none" />
      ))}
      {BACK_OUTLINE_STROKES.map((d, i) => (
        <path key={`back-stroke-${i}`} d={d} fill="none" stroke="#555" strokeWidth={2} />
      ))}

      {/* Muscle regions */}
      {ALL_SVG_MUSCLE_KEYS.map((key) => {
        const paths = MUSCLE_PATHS[key]
        if (!paths) return null
        const isHighlighted = highlightedKeys.includes(key)
        const fill = isHighlighted ? 'rgba(59, 130, 246, 1.0)' : '#6E6E6E'

        return (
          <g key={key}>
            {paths.fillPaths.map((d, i) => (
              <path key={`${key}-fill-${i}`} d={d} fill={fill} stroke="none" />
            ))}
            {paths.strokePaths.map((d, i) => (
              <path
                key={`${key}-stroke-${i}`}
                d={d}
                fill="none"
                stroke={isHighlighted ? 'rgba(59, 130, 246, 0.6)' : '#555'}
                strokeWidth={1.5}
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
})
