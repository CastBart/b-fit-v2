// import { useMemo } from "react";
// import { ExerciseNode, FlattenedExerciseNode } from "@/lib/exercise-linked-list";
// import { MuscleGroup } from "@/lib/definitions";

// export function useMuscleFrequency(head: ExerciseNode | null) {
//   return useMemo(() => {
//     const counts = new Map<string, number>(); // store normalized string keys

//     // helper to normalize enum value
//     const normalize = (muscle: MuscleGroup) =>
//       muscle.toLowerCase().replace(/\s+/g, "-");

//     let current = head;
//     while (current) {
//       // primary
//       if (current.primaryMuscle) {
//         const key = normalize(current.primaryMuscle);
//         counts.set(key, (counts.get(key) ?? 0) + 1);
//       }

//       // auxiliary
//       if (current.auxiliaryMuscles) {
//         for (const muscle of current.auxiliaryMuscles) {
//           const key = normalize(muscle);
//           counts.set(key, (counts.get(key) ?? 0) + 0.5);
//         }
//       }

//       current = current.next;
//     }

//     return counts;
//   }, [head]);
// }
