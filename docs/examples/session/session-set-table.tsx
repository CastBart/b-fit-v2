// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Check, Wrench } from "lucide-react";

// import { useSelector, useDispatch } from "react-redux";
// import { RootState } from "@/store";
// import { Input } from "../ui/input";
// import { updateSet, completeSet, addNote } from "@/store/sessionSlice";
// import { EllipsisHorizontalIcon } from "@heroicons/react/24/solid";
// import { Textarea } from "../ui/textarea";
// import LatestExerciseHistory from "./session-latest-history";

// /**
//  * Checks which set is active in a active exercise
//  * @param state state of redux
//  * @returns active set boolean
//  */
// const selectActiveSet = (state: RootState) => {
//   const activeId = state.session.activeExerciseId;
//   const progress = state.session.progress[activeId ?? ""];
//   return progress?.sets.find((s) => s.setNumber === progress.activeSetNumber);
// };

// interface SessionSetTableProps {
//   exerciseID: string;
//   onSelectExerciseOptions: (exID: string) => void;
//   onSelectSetDrawerID: (exID: string | null) => void;
//   onSelectExerciseDetails: (exID: string | null) => void;
// }

// export default function SessionSetTable({
//   exerciseID,
//   onSelectExerciseOptions,
//   onSelectSetDrawerID,
//   onSelectExerciseDetails,
// }: SessionSetTableProps) {
//   const dispatch = useDispatch();
//   const { exerciseMap, progress, activeExerciseId, headExerciseId } =
//     useSelector((state: RootState) => state.session);
//   const activeSet = useSelector(selectActiveSet);

//   const exerciseNode = exerciseMap[exerciseID];
//   const exerciseProgress = progress[exerciseID];

//   // ✅ Defensive: if this exercise no longer exists in the map or progress,
//   // don't try to render it (can happen during resets / reorders).
//   if (!exerciseNode || !exerciseProgress) {
//     return null;
//   }

//   return (
//     <div className="space-y-8">
//       <div className="flex space-x-2 items-center mt-2">
//         <h3
//           className="text-2xl font-semibold cursor-pointer"
//           onClick={() => {
//             onSelectExerciseDetails(exerciseNode.id);
//           }}
//         >
//           {exerciseNode.name}
//         </h3>
//         <EllipsisHorizontalIcon
//           className="w-12 h-8 cursor-pointer border rounded-2xl bg-muted hover:bg-muted/80"
//           onClick={() => onSelectExerciseOptions(exerciseID)}
//         />
//       </div>

//       {/* Notes */}
//       <div className="mt-4">
//         <Textarea
//           placeholder="Add notes..."
//           value={exerciseProgress.notes ?? ""}
//           onChange={(e) =>
//             dispatch(
//               addNote({
//                 exerciseId: exerciseID,
//                 note: e.target.value,
//               })
//             )
//           }
//           className="w-full border rounded p-2 focus-visible:ring-0"
//         />
//       </div>

//       <Table>
//         <TableCaption className="hidden">Exercise Sets</TableCaption>
//         <TableHeader>
//           <TableRow>
//             <TableHead className="text-center">Set</TableHead>
//             <TableHead className="text-center">Weight</TableHead>
//             <TableHead className="text-center">Reps</TableHead>
//             <TableHead className="flex justify-center items-center cursor-pointer">
//               <Wrench
//                 size={"16px"}
//                 onClick={() => onSelectSetDrawerID(exerciseID)}
//               />
//             </TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {exerciseProgress.sets.map((set) => {
//             const currentIsActive =
//               exerciseProgress.activeSetNumber === set.setNumber;
//             return (
//               <TableRow key={set.setNumber}>
//                 {/* Set number */}
//                 <TableCell className="text-center">{set.setNumber}</TableCell>

//                 {/* Weight input */}
//                 <TableCell>
//                   <Input
//                     name="Weight"
//                     type="number"
//                     step="any"
//                     className={`text-center rounded-full transition 
//                       ${currentIsActive ? "bg-muted" : ""} 
//                       ${
//                         !currentIsActive && !set.completed
//          /                 ? "opacity-40"
//                           : ""
//                       }`}
//                     value={set.weight}
//                     onChange={(e) =>
//                       dispatch(
//                         updateSet({
//                           exerciseId: exerciseID,
//                           setNumber: set.setNumber,
//                           weight: parseFloat(e.target.value),
//                         })
//                       )
//                     }
//                   />
//                 </TableCell>

//                 {/* Reps Input */}
//                 <TableCell>
//                   <Input
//                     name="Reps"
//                     type="number"
//                     className={`text-center rounded-full transition
//                       ${currentIsActive ? "bg-muted" : ""}
//                       ${
//                         !currentIsActive && !set.completed
//       /                    ? "opacity-40 "
//                           : ""
//                       }`}
//                     value={set.reps}
//                     onChange={(e) =>
//                       dispatch(
//                         updateSet({
//                           exerciseId: exerciseID,
//                           setNumber: set.setNumber,
//                           reps: parseInt(e.target.value),
//                         })
//                       )
//                     }
//                   />
//                 </TableCell>

//                 {/* Complete Check box */}
//                 <TableCell className="flex items-center justify-center">
//                   <div
//                     className={`transition ${
//                       set.completed
//       /                  ? ""
//                         : currentIsActive
//        /                   ? "bg-primary cursor-pointer border py-1 px-2 rounded-full"
//                           : "opacity-40 cursor-not-allowed"
//                     }`}
//                     onClick={() => {
//                       if (!set.completed && currentIsActive) {
//                         dispatch(
//                           completeSet({
//                             reps: set.reps,
//                             weight: set.weight,
//                           })
//                         );
//                       } else {
//                         onSelectSetDrawerID(exerciseID);
//                       }
//                     }}
//                   >
//                     <Check
//                       strokeWidth={3}
//                       className={`transition ${
//                         set.completed
//   /                        ? "text-muted-foreground"
//                           : currentIsActive
//    /                         ? "text-primary-foreground"
//                             : "hidden"
//                       }`}
//                     />
//                   </div>
//                 </TableCell>
//               </TableRow>
//             );
//           })}
//         </TableBody>
//       </Table>

//       <LatestExerciseHistory
//         id={exerciseNode.id}
//         onSelectExerciseDetails={onSelectExerciseDetails}
//       />
//     </div>
//   );
// }
