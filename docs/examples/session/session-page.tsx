// "use client";
// import { useCallback, useEffect, useState } from "react";
// import useEmblaCarousel from "embla-carousel-react";
// import {
//   createExerciseNode,
//   ExerciseNode,
//   flattenExerciseNodeList,
//   getHeadNode,
//   unFlattenExerciseNodeList,
// } from "@/lib/exercise-linked-list";
// import { useDispatch, useSelector } from "react-redux";
// import { RootState } from "@/store";
// import {
//   setActiveExerciseId,
//   updateExerciseMap,
//   ExerciseProgress,
//   addExercises,
//   removeExercise,
//   resumeSession,
//   endSession,
//   sessionViewLoaded
// } from "@/store/sessionSlice";
// import { SupersetManager } from "@/lib/superset-manager";
// import { Exercise } from "@/lib/definitions";
// import SetDrawer from "@/components/session/session-set-drawer";
// import SessionSetTable from "@/components/session/session-set-table";
// import {
//   OptionsDrawer,
//   SupersetDrawer,
// } from "@/components/workouts/workout-selected-exercises";
// import ExerciseCarousel from "@/components/session/session-exercise-carousel";
// import { Button } from "@/components/ui/button";
// import RestTimerDrawer from "@/components/session/session-timer-drawer";
// import SessionSettingsDrawer from "@/components/session/session-settings-drawer";
// import { SessionInput } from "@/actions/session-complete";
// import { useElapsedSessionTime } from "@/hooks/use-elapsed-session-time";
// import { useRouter } from "next/navigation";
// import { useSession } from "@/hooks/queries/use-session";
// import { ExerciseDetailsDrawer } from "@/components/exercises/exercise-details-drawer";
// import { clearSessionStorage } from "@/providers/store-provider";
// import NoActiveSession from "@/components/session/session-no-active-session";

// export default function SessionPage() {
//   const dispatch = useDispatch();
//   const {
//     workoutCompleted,
//     exerciseMap,
//     progress,
//     activeExerciseId,
//     headExerciseId,
//     workoutName,
//     isPaused,
//     timer,
//     sessionId,
//     workoutId,
//     startTime,
//     isActive,
//   } = useSelector((state: RootState) => state.session);
//   const workoutDuration = useElapsedSessionTime();
//   const router = useRouter();
//   const { createSession } = useSession();

//   //currentExercise from map
//   const currentExercise = activeExerciseId
//     ? exerciseMap[activeExerciseId]
//     : null;
//   //curr
//   const exerciseProgress = currentExercise
//     ? progress[currentExercise.instanceId]
//     : null;
//   //init emblaAPI
//   const [emblaRef, emblaApi] = useEmblaCarousel();

//   //order exercises into ID array
//   // const orderedExerciseArray = Object.values(exerciseMap);
//   const [exerciseIds, setExerciseIds] = useState(
//     Object.values(exerciseMap).map((ex) => ex.instanceId)
//   );

//   // variable to track navigation state and prevent showing flickering UI
//   const [isNavigating, setIsNavigating] = useState(false);

//   // When we hit the session page, mark it as fully loaded
//   useEffect(() => {
//     dispatch(sessionViewLoaded());
//   }, [dispatch]);

//   //update ordered Array od ID exericses when exercises change
//   useEffect(() => {
//     const orderedExerciseArray = Object.values(exerciseMap);
//     setExerciseIds(orderedExerciseArray.map((ex) => ex.instanceId));
//   }, [exerciseMap]);

//   const indexFromId = useCallback(
//     (id: string) => exerciseIds.findIndex((exID) => exID === id),
//     [exerciseIds]
//   );

//   const idFromIndex = useCallback(
//     (index: number) => exerciseIds[index] ?? null,
//     [exerciseIds]
//   );

//   const onSelect = useCallback(() => {
//     if (!emblaApi) return;
//     const index = emblaApi.selectedScrollSnap();
//     const selectedId = idFromIndex(index);
//     if (selectedId && selectedId !== activeExerciseId) {
//       dispatch(setActiveExerciseId(selectedId));
//     }
//   }, [emblaApi, idFromIndex, dispatch, activeExerciseId]);

//   //re-initialize carousel after adding or removing
//   useEffect(() => {
//     if (!emblaApi) return;
//     emblaApi.on("select", onSelect).on("reInit", onSelect);
//     if (!activeExerciseId) {
//       onSelect(); // initialize on mount
//     }
//   }, [emblaApi, onSelect, activeExerciseId]);

//   //update index after user click or complete set logic
//   useEffect(() => {
//     if (!emblaApi) return;
//     const index = indexFromId(activeExerciseId!);
//     if (index >= 0) emblaApi.scrollTo(index);
//   }, [activeExerciseId, emblaApi, indexFromId]);

//   const [selectedOptionsExercise, setSelectedOptionsExercise] =
//     useState<ExerciseNode | null>(null);

//   const [supersetExercise, setSupersetExercise] = useState<ExerciseNode | null>(
//     null
//   );

//   const [exerciseDetails, setExerciseDetails] = useState<string | null>(null);

//   const [setDrawerID, setSetDrawerID] = useState<string | null>(null);

//   const [supersetManager, setSupersetManager] =
//     useState<SupersetManager | null>(null);

//   /**
//    * Sets the ID of the exercise to show details for in the Exercise Details Drawer
//    * @param id ID of exercise to show details for
//    */
//   function handleSetExerciseDetails(id: string | null) {
//     setExerciseDetails(id);
//   }

//   /**
//    * Sets the ID of the exercise to show sets for in the Set Drawer
//    * @param id ID of exercise to show sets for
//    */
//   function handleSetDrawerID(id: string | null) {
//     setSetDrawerID(id);
//   }

//   /**
//    * Handles when an exercise is selected and opens the options drawer
//    * Finds the corresponding ExerciseNode in the linked list and sets it to state
//    * @param exerciseID ID of exercise to show options for
//    */
//   function handleSelectedExerciseOptions(exerciseID: string) {
//     // Unflatten the exercise map to get the linked list
//     const headNode = unFlattenExerciseNodeList(exerciseMap, headExerciseId!);

//     setSupersetManager(new SupersetManager(headNode));
//     // Traverse to find the selected node
//     let current: ExerciseNode | null = headNode;
//     while (current) {
//       if (current.instanceId === exerciseID) {
//         setSelectedOptionsExercise(current);
//         break;
//       }
//       current = current.next;
//     }
//   }

//   /**
//    * Handles when the user confirms the superset selection
//    * Updates the exercise map in Redux with the new superset structure
//    */
//   function handleSuperSetSelect() {
//     if (!supersetManager) return;

//     const updatedList = flattenExerciseNodeList(supersetManager.head);

//     dispatch(
//       updateExerciseMap({
//         newMap: updatedList,
//         newHead: supersetManager.head.instanceId,
//       })
//     );
//     setSupersetExercise(null);
//   }

//   /**
//    * Handles adding new exercises to the exercise list during the session
//    * @param newExercises Array of exercises to add to the session at the end of the current list
//    */
//   function handleAddedExercises(newExercises: Exercise[]) {
//     const existingIds = Object.keys(exerciseMap);
//     const newProgress: Record<string, ExerciseProgress> = {};
//     const firstNode = existingIds
//       .map((id) => exerciseMap[id])
//       .find((node) => node.prev === null);
//     //get current head from map
//     const currentHead = unFlattenExerciseNodeList(
//       exerciseMap,
//       firstNode?.instanceId!
//     );
//     //create new nodes
//     const newNodes = newExercises.map((exercise) =>
//       createExerciseNode({
//         id: exercise.id,
//         name: exercise.name,
//         equipment: exercise.equipment,
//         primaryMuscle: exercise.primaryMuscle,
//         auxiliaryMuscles: exercise.auxiliaryMuscles,
//         type: exercise.type,
//         supersetGroupId: null,
//       })
//     );

//     // Link the new nodes together (both next and prev)
//     for (let i = 0; i < newNodes.length; i++) {
//       if (i > 0) newNodes[i].prev = newNodes[i - 1];
//       if (i < newNodes.length - 1) newNodes[i].next = newNodes[i + 1];
//     }

//     let lastNode = currentHead;
//     while (lastNode.next) {
//       lastNode = lastNode.next;
//     }

//     lastNode.next = newNodes[0];
//     newNodes[0].prev = lastNode;
//     const joinedHead = getHeadNode(lastNode);

//     //create progress for new nodes
//     for (const node of newNodes) {
//       newProgress[node.instanceId] = {
//         exerciseId: node.instanceId,
//         sets: [
//           { setNumber: 1, reps: 0, weight: 0, completed: false },
//           { setNumber: 2, reps: 0, weight: 0, completed: false },
//           { setNumber: 3, reps: 0, weight: 0, completed: false },
//         ],
//         activeSetNumber: 1,
//         notes: "",
//       };
//     }
//     const newFlattenedNodes = flattenExerciseNodeList(joinedHead);

//     dispatch(
//       addExercises({
//         newExerciseMap: newFlattenedNodes,
//         newProgressMap: newProgress,
//       })
//     );
//     setExerciseIds(Object.values(newFlattenedNodes).map((ex) => ex.instanceId));
//   }

//   /**
//    * Handles removing an exercise from the session
//    * Updates the linked list pointers and Redux state
//    * @param instanceId ID of exercise instance to remove from session
//    * @returns exits if exercise not found
//    */
//   function handleRemoveExercise(instanceId: string) {
//     const nodeToRemove = exerciseMap[instanceId];
//     if (!nodeToRemove) return;

//     const { prev, next } = nodeToRemove;

//     const newExerciseMap = { ...exerciseMap };
//     delete newExerciseMap[instanceId];

//     const newProgress = { ...progress };
//     delete newProgress[instanceId];

//     if (prev) {
//       newExerciseMap[prev] = {
//         ...newExerciseMap[prev],
//         next,
//       };
//     }
//     if (next) {
//       newExerciseMap[next] = {
//         ...newExerciseMap[next],
//         prev,
//       };
//     }

//     let newHeadId = headExerciseId;
//     if (headExerciseId === instanceId) {
//       newHeadId = next ?? prev ?? null;
//     }

//     let newActiveId = activeExerciseId;
//     if (activeExerciseId === instanceId) {
//       newActiveId = next ?? prev ?? newHeadId ?? null;
//     }
//     setExerciseIds(
//       Object.values(newExerciseMap).map((node) => node.instanceId)
//     );
//     setSelectedOptionsExercise(null);
//     dispatch(
//       removeExercise({
//         newExerciseMap: newExerciseMap,
//         newProgress: newProgress,
//         newHeadId: newHeadId,
//         newActiveId: newActiveId,
//       })
//     );
//   }

//   /**
//    * Handles completing the session and sending data to the backend
//    * Gathers all necessary session data and calls the createSession action
//    */
//   async function handleCompleteSession() {
//     setIsNavigating(true);
//     const sessionData: SessionInput = {
//       sessionId: sessionId!,
//       workoutId: workoutId!,
//       workoutName,
//       startTime: startTime!,
//       duration: workoutDuration!,
//       exerciseMap,
//       progress,
//     };
//     dispatch(endSession());
//     // clearSessionStorage();
//     router.replace("/dashboard");
//     createSession(sessionData);
//   }

//   // No Active session UI
//   if (!isActive && !isNavigating) return <NoActiveSession />;

//   return (
//     <div className="p-4 max-w-[900px] mx-auto">
//       {/* <div className="flex flex-col"> */}

//       <SessionSettingsDrawer setIsNavigating={setIsNavigating}/>

//       <ExerciseCarousel
//         exerciseIds={exerciseIds}
//         onReorder={(newOrder) => {
//           setExerciseIds(newOrder);
//         }}
//         onExerciseSelect={handleAddedExercises}
//       />
//       {/* <WorkoutSelectExerciseDrawer onExerciseSelect={handleAddedExercises} /> */}

//       <div className="overflow-hidden " ref={emblaRef}>
//         <div className="flex space-x-4">
//           {exerciseIds.map((ex) => (
//             <div key={ex} className="flex-shrink-0 w-full">
//               <SessionSetTable
//                 exerciseID={ex}
//                 onSelectExerciseOptions={handleSelectedExerciseOptions}
//                 onSelectSetDrawerID={handleSetDrawerID}
//                 onSelectExerciseDetails={handleSetExerciseDetails}
//               />
//             </div>
//           ))}
//         </div>
//       </div>
//       {/* Padding for Timer button */}
//       <div className="h-[110px]"></div>

//       {/* Timer Button */}
//       {timer && timer.isRunning && !workoutCompleted && <RestTimerDrawer />}

//       {/* Resume Button */}
//       {isPaused && (
//         <div className="fixed bottom-0 left-0 right-0 p-4 z-10 flex justify-center">
//           <Button
//             onClick={() => dispatch(resumeSession())}
//             className="rounded-full py-10 px-10 text-3xl flex  justify-center space-x-2"
//           >
//             Resume session
//           </Button>
//         </div>
//       )}

//       {/* Complete Button */}
//       {workoutCompleted && (
//         <div className="fixed bottom-0 left-0 right-0 p-4 z-10 flex justify-center">
//           <Button
//             onClick={handleCompleteSession}
//             className="rounded-full py-10 px-10 text-3xl "
//           >
//             Complete Workout
//           </Button>
//         </div>
//       )}

//       {/* Exercise Details Drawer */}
//       {/* TODO: Implement delete option */}
//       <ExerciseDetailsDrawer
//         selectedExercise={exerciseDetails}
//         onClose={() => setExerciseDetails(null)}
//         onDelete={() => {}}
//       />

//       {/* Option Drawer */}
//       <OptionsDrawer
//         selectedExercise={selectedOptionsExercise}
//         onClose={() => setSelectedOptionsExercise(null)}
//         onSuperSet={() => {
//           if (selectedOptionsExercise) {
//             setSupersetExercise(selectedOptionsExercise);
//             setSelectedOptionsExercise(null); // Hide options drawer
//           }
//         }}
//         onRemove={() =>
//           selectedOptionsExercise &&
//           handleRemoveExercise(selectedOptionsExercise.instanceId)
//         }
//       />
//       {/* Superset Drawer */}
//       <SupersetDrawer
//         exercise={supersetExercise}
//         onClose={() => setSupersetExercise(null)}
//         onSelect={handleSuperSetSelect}
//         supersetManager={supersetManager}
//       />
//       {/* Set Drawer */}
//       <SetDrawer
//         exerciseId={setDrawerID}
//         onClose={() => handleSetDrawerID(null)}
//       />
//     </div>
//   );
// }
