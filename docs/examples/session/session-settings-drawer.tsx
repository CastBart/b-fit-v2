// "use client";
// import {
//   Drawer,
//   DrawerClose,
//   DrawerContent,
//   DrawerDescription,
//   DrawerFooter,
//   DrawerHeader,
//   DrawerTitle,
//   DrawerTrigger,
// } from "@/components/ui/drawer";
// import { useRestTimer } from "@/hooks/use-rest-timer";
// import { Separator } from "../ui/separator";
// import { MinusIcon, PlusIcon, Wrench } from "lucide-react";
// import { formatTime } from "@/lib/formatTime";
// import { Button } from "../ui/button";
// import {
//   Pause,
//   CalendarDays,
//   CircleCheck,
//   Hourglass,
//   RotateCcw,
//   Ban,
// } from "lucide-react";
// import clsx from "clsx";
// import { useDispatch, useSelector } from "react-redux";
// import { pauseSession, resumeSession } from "@/store/sessionSlice";
// import { RootState } from "@/store";
// import { useElapsedSessionTime } from "@/hooks/use-elapsed-session-time";
// import { Session } from "inspector/promises";
// import SessionCancelAlert from "./session-cancel-alert";
// import SessionCompleteAlert from "./session-complete-alert";

// export function formatStartTime(dateTimeStamp: number | null): string {
//   if (!dateTimeStamp) return "Not started";
//    const date = new Date(dateTimeStamp);

//   return date.toLocaleString(undefined, {
//     weekday: "short", // "Mon", "Tue", etc.
//     year: "numeric", // 2025
//     month: "short", // "Jun"
//     day: "numeric", // 17
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: false, // Use 24-hour format; change to true for 12-hour
//   });
// }

// type SessionSettingDrawerProps = {
//   setIsNavigating: (navigate: boolean) => void;
// }

// export default function SessionSettingsDrawer({setIsNavigating}: SessionSettingDrawerProps) {
//   const { workoutName, startTime, isPaused } = useSelector(
//     (state: RootState) => state.session
//   );
//   const workoutDuration = useElapsedSessionTime();

//   const dispatch = useDispatch();
//   return (
//     <Drawer>
//       <DrawerTrigger asChild>
//         <div className="mb-4 w-full">
//           <Button
//             variant={"outline"}
//             className="text-2xl flex justify-center items-center space-x-2 max-w-full"
//           >
//             <span className="w-full truncate">{workoutName}</span>
//             <Wrench />
//           </Button>
//         </div>
//       </DrawerTrigger>
//       <DrawerContent className="w-screen lg:w-[600px] justify-self-center">
//         <DrawerHeader>
//           <DrawerTitle className="text-center text-3xl">
//             {workoutName}
//           </DrawerTitle>
//           <DrawerDescription className="hidden">
//             Session settings drawer displaying start time of the workout,
//             duration and allows a user to complete the workout.
//           </DrawerDescription>
//           <Separator className="h-1" />
//         </DrawerHeader>
//         <div className="flex flex-col gap-2 px-4">
//           {/* Start Time */}
//           <div className="flex border rounded-lg justify-between px-2 py-4">
//             <div className="flex justify-center gap-2">
//               <CalendarDays />
//               <div>Started</div>
//             </div>
//             <div>{formatStartTime(startTime)}</div>
//           </div>

//           {/* Duration */}
//           <div className="flex border rounded-lg  justify-between px-2 py-4">
//             <div className="flex justify-center gap-2">
//               <Hourglass />
//               <div>Duration</div>
//             </div>
//             <div>{formatTime(workoutDuration!)}</div>
//           </div>

//           {/* Complete button */}
//           <SessionCompleteAlert setIsNavigating={setIsNavigating}/>

//           {/* Pause/Resume button */}
//           <div
//             className="flex border rounded-lg  justify-between px-2 py-4 cursor-pointer hover:bg-secondary"
//             onClick={() => {
//               if (isPaused) {
//                 dispatch(resumeSession());
//               } else {
//                 dispatch(pauseSession());
//               }
//             }}
//           >
//             <div className="flex justify-center gap-2">
//               {isPaused ? <RotateCcw /> : <Pause />}
//               <div>{isPaused ? "Resume " : "Pause"}</div>
//             </div>
//           </div>

//           {/* Cancel button */}
//           <SessionCancelAlert setIsNavigating={setIsNavigating}/>
//         </div>
//         <DrawerFooter>
//           <DrawerClose>Close</DrawerClose>
//         </DrawerFooter>
//       </DrawerContent>
//     </Drawer>
//   );
// }
