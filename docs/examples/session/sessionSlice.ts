// import { createSlice, PayloadAction } from "@reduxjs/toolkit";
// import {
//   ExerciseNode,
//   FlattenedExerciseNode,
// } from "@/lib/exercise-linked-list";
// import { ExerciseType } from "@/lib/definitions";
// import { v4 as uuidv4 } from "uuid";

// type Set = {
//   setNumber: number;
//   reps: number;
//   weight: number;
//   completed: boolean;
// };

// export type ExerciseProgress = {
//   exerciseId: string;
//   sets: Set[];
//   activeSetNumber: number;
//   notes?: string;
// };

// interface TimerState {
//   isRunning: boolean;
//   endTime: number | null;
//   duration: number;
// }

// export interface SessionState {
//   sessionId: string | null;
//   workoutId: string | null;
//   workoutName: string;
//   startTime: number | null;
//   isPaused: boolean;
//   pauseTime: number | null;
//   accumulatedPauseDuration: number;
//   completeTime: number | null;
//   isActive: boolean;
//   workoutCompleted: boolean;
//   activeExerciseId: string | null;
//   exerciseMap: Record<string, FlattenedExerciseNode>; // flatten linked list into a map
//   headExerciseId: string | null;
//   progress: Record<string, ExerciseProgress>;
//   timer: TimerState | null;
//   isStarting: boolean;
// }

// const initialState: SessionState = {
//   sessionId: null,
//   workoutId: null,
//   workoutName: "",
//   startTime: null,
//   isPaused: false,
//   pauseTime: null,
//   accumulatedPauseDuration: 0,
//   completeTime: null,
//   isActive: false,
//   workoutCompleted: false,
//   activeExerciseId: null,
//   exerciseMap: {},
//   headExerciseId: null,
//   progress: {},
//   timer: { isRunning: false, endTime: null, duration: 0 },
//   isStarting: false,
// };

// /**
//  * Helper function to determin the timer start time based on the exercise type
//  * @param type of timer based on the exercise
//  * @returns number in seconds
//  */
// function getTimerDuration(type: ExerciseType): number {
//   switch (type) {
//     case ExerciseType.Small:
//       return 90; // 1:30
//     case ExerciseType.Medium:
//       return 120; // 2:00
//     case ExerciseType.Large:
//       return 180; // 3:00
//     default:
//       return 120; // fallback
//   }
// }

// /**
//  * Function returning the id the next exercise that is incomplete
//  * @param startId ID of the next exercise of the active exercise
//  * @param exerciseMap exercise map
//  * @param progress progress of the exercise
//  * @returns ID of the next exercise or null if all sets are completed
//  */
// function findNextIncompleteNode(
//   startId: string | null,
//   exerciseMap: Record<string, FlattenedExerciseNode>,
//   progress: Record<string, ExerciseProgress>
// ): string | null {
//   let currentId = startId;
//   while (currentId) {
//     const node = exerciseMap[currentId];
//     const prog = progress[currentId];
//     const isComplete = prog.sets.every((s) => s.completed);
//     if (!isComplete) return currentId;
//     currentId = node.next;
//   }
//   return null;
// }

// /**
//  * Return ID of next exercise in a superset that does not have the active set number completed
//  * @param currentSetNumber active set number
//  * @param supersetNodes all exercises within the superset
//  * @param progress progress of the exercise
//  * @returns
//  */
// function getNextSupersetExercise(
//   currentSetNumber: number,
//   supersetNodes: FlattenedExerciseNode[],
//   progress: Record<string, ExerciseProgress>
// ): string | null {
//   for (const node of supersetNodes) {
//     const prog = progress[node.instanceId];
//     const set = prog.sets[currentSetNumber - 1];
//     if (!set?.completed) {
//       return node.instanceId;
//     }
//   }
//   return null;
// }

// export const sessionSlice = createSlice({
//   name: "session",
//   initialState,
//   reducers: {
//     /**
//      * Starts the session and assigns initial values to state. Creates set progress map for each exercise
//      * @param state Redux Sessions Slice State
//      * @param action PayloadAction Type holds workoutId, workoutName, headId, FlattenedExerciseMap
//      */
//     startSession: (
//       state,
//       action: PayloadAction<{
//         workoutId: string;
//         workoutName: string;
//         headId: string;
//         flattenedMap: Record<string, FlattenedExerciseNode>;
//       }>
//     ) => {
//       state.sessionId = uuidv4();
//       state.workoutId = action.payload.workoutId;
//       state.workoutName = action.payload.workoutName;
//       state.startTime = Date.now();
//       state.isActive = true;
//       state.workoutCompleted = false;
//       state.exerciseMap = action.payload.flattenedMap;
//       state.headExerciseId = action.payload.headId;
//       state.activeExerciseId = action.payload.headId;
//       state.isStarting = true;

//       Object.values(action.payload.flattenedMap).forEach((node) => {
//         state.progress[node.instanceId] = {
//           exerciseId: node.instanceId,
//           sets: Array.from({ length: 3 }, (_, i) => ({
//             setNumber: i + 1,
//             reps: 0,
//             weight: 0,
//             completed: false,
//           })),
//           activeSetNumber: 1,
//         };
//       });
//     },

//     addSet: (
//       state,
//       action: PayloadAction<{
//         exerciseId: string;
//       }>
//     ) => {
//       const ex = state.progress[action.payload.exerciseId];
//       if (ex) {
//         const nextSetNumber = ex.sets.length + 1;

//         // Check if all existing sets were completed
//         const allSetsCompleted = ex.sets.every((set) => set.completed);

//         // Add new set
//         ex.sets.push({
//           setNumber: nextSetNumber,
//           reps: 0,
//           weight: 0,
//           completed: false,
//         });

//         // Make new set active only if all previous sets were completed
//         if (allSetsCompleted) {
//           ex.activeSetNumber = nextSetNumber;
//         }

//         // Mark workout as not completed
//         state.workoutCompleted = false;
//       }
//     },

//     removeLastSet: (
//       state,
//       action: PayloadAction<{
//         exerciseId: string;
//       }>
//     ) => {
//       const ex = state.progress[action.payload.exerciseId];
//       if (!ex || ex.sets.length === 0) return;

//       // Remove last set
//       ex.sets.pop();

//       // Reset activeSetNumber if needed
//       ex.activeSetNumber = Math.min(
//         ex.activeSetNumber,
//         ex.sets.length === 0 ? 1 : ex.sets.length
//       );

//       // ✅ Check if all exercises are complete
//       const allComplete = Object.values(state.progress).every(
//         (prog) =>
//           prog.sets.length > 0 && prog.sets.every((set) => set.completed)
//       );

//       state.workoutCompleted = allComplete;
//     },

//     updateSet: (
//       state,
//       action: PayloadAction<{
//         exerciseId: string;
//         setNumber: number;
//         reps?: number;
//         weight?: number;
//       }>
//     ) => {
//       const ex = state.progress[action.payload.exerciseId];
//       if (ex) {
//         const targetSet = ex.sets.find(
//           (s) => s.setNumber === action.payload.setNumber
//         );
//         if (targetSet) {
//           if (action.payload.reps !== undefined) {
//             targetSet.reps = action.payload.reps;
//           }
//           if (action.payload.weight !== undefined) {
//             targetSet.weight = action.payload.weight;
//           }
//         }
//       }
//     },

//     completeSet: (
//       state,
//       action: PayloadAction<{ reps: number; weight: number }>
//     ) => {
//       const activeId = state.activeExerciseId;
//       if (!activeId) return;

//       const activeNode = state.exerciseMap[activeId];
//       const activeProgress = state.progress[activeId];
//       if (!activeNode || !activeProgress) return;

//       const activeSetIndex = activeProgress.activeSetNumber - 1;
//       const set = activeProgress.sets[activeSetIndex];
//       if (!set || set.completed) return;

//       // Mark current set as completed
//       set.completed = true;
//       set.reps = action.payload.reps;
//       set.weight = action.payload.weight;

//       const startRestTimerIfApplicable = () => {
//         const exerciseType = activeNode.type;
//         const duration = getTimerDuration(exerciseType);
//         state.timer = {
//           isRunning: true,
//           endTime: Date.now() + duration * 1000,
//           duration: duration,
//         };
//       };

//       const totalSets = activeProgress.sets.length;
//       const supersetId = activeNode.supersetGroupId;

//       // CASE 1: Not in superset
//       if (!supersetId) {
//         if (activeProgress.activeSetNumber < totalSets) {
//           activeProgress.activeSetNumber += 1;
//         } else {
//           const nextId = findNextIncompleteNode(
//             activeNode.next,
//             state.exerciseMap,
//             state.progress
//           );
//           if (nextId) {
//             state.activeExerciseId = nextId;
//           } else {
//             const fallback = Object.values(state.exerciseMap).find((node) => {
//               const prog = state.progress[node.instanceId];
//               return prog.sets.some((s) => !s.completed);
//             });
//             if (fallback) {
//               state.activeExerciseId = fallback.instanceId;
//             } else {
//               //Workout Completed
//               state.workoutCompleted = true;
//               state.timer!.isRunning = false;
//             }
//           }
//         }
//         startRestTimerIfApplicable();
//         return;
//       }

//       // CASE 2: In superset
//       const supersetNodes = Object.values(state.exerciseMap).filter(
//         (n) => n.supersetGroupId === supersetId
//       );

//       const currentSetNumber = activeProgress.activeSetNumber;

//       // Check if current round of superset is complete
//       const supersetSetComplete = supersetNodes.every((node) => {
//         const prog = state.progress[node.instanceId];
//         return prog.sets[currentSetNumber - 1]?.completed;
//       });

//       if (supersetSetComplete) {
//         // All exercises finished current round → start timer
//         startRestTimerIfApplicable();

//         // Increment activeSetNumber for all exercises in superset
//         supersetNodes.forEach((node) => {
//           const prog = state.progress[node.instanceId];
//           if (prog.activeSetNumber < totalSets) {
//             prog.activeSetNumber += 1;
//           }
//         });

//         // After increment: check if entire superset is fully complete
//         const supersetFullyComplete = supersetNodes.every((node) => {
//           const prog = state.progress[node.instanceId];
//           return prog.sets.every((s) => s.completed);
//         });

//         if (supersetFullyComplete) {
//           //  Move to next non-superset exercise
//           const lastSupersetNode = supersetNodes.reduce((acc, node) => {
//             return state.exerciseMap[acc.instanceId].next === node.instanceId
//    /           ? node
//               : acc;
//           }, supersetNodes[0]);

//           const nextUnfinished = findNextIncompleteNode(
//             state.exerciseMap[lastSupersetNode.instanceId].next,
//             state.exerciseMap,
//             state.progress
//           );

//           if (nextUnfinished) {
//             state.activeExerciseId = nextUnfinished;
//           } else {
//             const fallback = Object.values(state.exerciseMap).find((node) => {
//               const prog = state.progress[node.instanceId];
//               return prog.sets.some((s) => !s.completed);
//             });
//             if (fallback) {
//               state.activeExerciseId = fallback.instanceId;
//             } else {
//               //Workout Completed
//               state.workoutCompleted = true;
//               state.timer!.isRunning = false;
//             }
//           }
//         } else {
//           // Move to first unfinished exercise in next superset round
//           const nextSetNumber = currentSetNumber + 1;
//           const nextExerciseId = getNextSupersetExercise(
//             nextSetNumber,
//             supersetNodes,
//             state.progress
//           );

//           if (nextExerciseId) {
//             state.activeExerciseId = nextExerciseId;
//           }
//         }

//         return;
//       }

//       // If supersetSetComplete === false → move to next unfinished within current set
//       const nextExerciseId = getNextSupersetExercise(
//         currentSetNumber,
//         supersetNodes,
//         state.progress
//       );

//       if (nextExerciseId) {
//         state.activeExerciseId = nextExerciseId;
//       }
//     },

//     undoLastCompletedSet: (
//       state,
//       action: PayloadAction<{
//         exerciseId: string;
//       }>
//     ) => {
//       const ex = state.progress[action.payload.exerciseId];
//       if (!ex) return;

//       // Iterate in reverse to find the last completed set
//       for (let i = ex.sets.length - 1; i >= 0; i--) {
//         if (ex.sets[i].completed) {
//           ex.sets[i].completed = false;

//           // Set activeSetNumber to 1-based index of this undone set
//           ex.activeSetNumber = i + 1;

//           // Also make this exercise the active one again
//           state.activeExerciseId = action.payload.exerciseId;

//           // Undoing a set implies workout is not complete
//           state.workoutCompleted = false;

//           break;
//         }
//       }
//     },

//     addNote: (
//       state,
//       action: PayloadAction<{ exerciseId: string; note: string }>
//     ) => {
//       const ex = state.progress[action.payload.exerciseId];
//       if (ex) {
//         ex.notes = action.payload.note;
//       }
//     },

//     setActiveExerciseId: (state, action: PayloadAction<string>) => {
//       state.activeExerciseId = action.payload;
//     },

//     addExercises: (
//       state,
//       action: PayloadAction<{
//         newExerciseMap: Record<string, FlattenedExerciseNode>;
//         newProgressMap: Record<string, ExerciseProgress>;
//       }>
//     ) => {
//       const { newExerciseMap, newProgressMap } = action.payload;
//       // state.exerciseMap = newExerciseMap;
//       //Merge new nodes
//       for (const [id, node] of Object.entries(newExerciseMap)) {
//         state.exerciseMap[id] = node;
//       }
//       const tempMap = state.exerciseMap;
//       // Merge new progress
//       for (const [id, progress] of Object.entries(newProgressMap)) {
//         state.progress[id] = progress;
//       }

//       //update workout completed state
//       state.workoutCompleted = false;

//       // If no activeExerciseId yet, set to first added node
//       if (!state.activeExerciseId) {
//         state.activeExerciseId = Object.keys(newExerciseMap)[0];
//       }
//     },

//     removeExercise: (
//       state,
//       action: PayloadAction<{
//         newExerciseMap: SessionState["exerciseMap"];
//         newProgress: SessionState["progress"];
//         newHeadId: string | null;
//         newActiveId: string | null;
//       }>
//     ) => {
//       state.exerciseMap = action.payload.newExerciseMap;
//       state.progress = action.payload.newProgress;
//       state.headExerciseId = action.payload.newHeadId;
//       state.activeExerciseId = action.payload.newActiveId;

//       state.workoutCompleted = Object.values(state.progress).every((p) =>
//         p.sets.every((s) => s.completed)
//       );
//     },

//     goToExercise: (state, action: PayloadAction<string>) => {
//       state.activeExerciseId = action.payload;
//     },

//     updateExerciseMap: (
//       state,
//       action: PayloadAction<{
//         newMap: Record<string, FlattenedExerciseNode>;
//         newHead: string;
//       }>
//     ) => {
//       state.exerciseMap = action.payload.newMap;
//       state.headExerciseId = action.payload.newHead;
//     },

//     startTimer: (state, action: PayloadAction<number>) => {
//       state.timer = {
//         isRunning: true,
//         endTime: Date.now() + action.payload * 1000,
//         duration: action.payload,
//       };
//     },

//     stopTimer: (state) => {
//       if (state.timer) {
//         state.timer.isRunning = false;
//         state.timer.endTime = null;
//       }
//     },

//     resetTimer: (state) => {
//       state.timer = {
//         isRunning: false,
//         endTime: null,
//         duration: 0,
//       };
//     },

//     addTimeToTimer: (state, action: PayloadAction<number>) => {
//       if (state.timer?.isRunning && state.timer.endTime) {
//         state.timer.endTime += action.payload * 1000;
//         state.timer.duration += action.payload;
//       }
//     },

//     sessionViewLoaded: (state) => {
//       if (state.isActive) {
//         state.isStarting = false;
//       }
//     },

//     pauseSession(state) {
//       if (!state.isPaused) {
//         state.isPaused = true;
//         state.pauseTime = Date.now();
//       }
//       state.timer!.isRunning = false;
//     },

//     resumeSession(state) {
//       if (state.isPaused && state.pauseTime) {
//         const pauseDuration = Date.now() - state.pauseTime;
//         state.accumulatedPauseDuration += pauseDuration;
//         state.pauseTime = null;
//         state.isPaused = false;
//       }
//     },

//     endSession: (state) => {
//       state.isActive = false;
//       state.workoutCompleted = false;
//       state.completeTime = Date.now();
//       if (state.timer) {
//         state.timer.isRunning = false;
//       }
//     },

//     resetSessionState: (state) => {
//       Object.assign(state, initialState);
//     },

//     rehydrateSession: (state, action: PayloadAction<SessionState>) => {
//       return { ...action.payload };
//     },
//   },
// });

// export const {
//   startSession,
//   addSet,
//   removeLastSet,
//   updateSet,
//   undoLastCompletedSet,
//   completeSet,
//   addNote,
//   setActiveExerciseId,
//   goToExercise,
//   updateExerciseMap,
//   endSession,
//   resetSessionState,
//   addExercises,
//   removeExercise,
//   startTimer,
//   stopTimer,
//   resetTimer,
//   addTimeToTimer,
//   sessionViewLoaded,
//   pauseSession,
//   resumeSession,
//   rehydrateSession,
// } = sessionSlice.actions;

// export default sessionSlice.reducer;
