// import * as React from "react";

// import { Button } from "@/components/ui/button";
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
// import ExerciseFilter from "./exercise-filter";
// import {
//   ExerciseEquipment,
//   MuscleGroup,
//   ExerciseType,
// } from "@/lib/definitions";

// import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
// import { Separator } from "../ui/separator";
// import { useSidebar } from "../ui/sidebar";
// import { useState, useEffect } from "react";

// interface ExerciseFilterDrawerProps {
//   numOfExercises: number;
//   setFilters: (filters: {
//     equipment: ExerciseEquipment[];
//     muscle: MuscleGroup[];
//     type: ExerciseType[];
//   }) => void;
// }

// export function ExerciseFilterDrawer({
//   numOfExercises,
//   setFilters,
// }: ExerciseFilterDrawerProps) {
//   const [open, setOpen] = useState(false);
//   const { state } = useSidebar();
//   const [selectedEquipment, setSelectedEquipment] = useState<
//     ExerciseEquipment[]
//   >([]);
//   const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup[]>([]);
//   const [selectedType, setSelectedType] = useState<ExerciseType[]>([]);
//   const hasFilters =
//     selectedEquipment.length > 0 ||
//     selectedMuscle.length > 0 ||
//     selectedType.length > 0;

//   useEffect(() => {
//     setFilters({
//       equipment: selectedEquipment,
//       muscle: selectedMuscle,
//       type: selectedType,
//     });
//   }, [selectedEquipment, selectedMuscle, selectedType, setFilters]);

//   const clearFilters = () => {
//     setSelectedEquipment([]);
//     setSelectedMuscle([]);
//     setSelectedType([]);
//   };
//   return (
//     <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
//       <div className="flex justify-between items-center">
//         <div className="text-muted-foreground">{`${numOfExercises} exercises`}</div>
//         <div className="flex gap-2 items-center justify-end text-primary">
//           {hasFilters && (
//             <XMarkIcon
//               onClick={clearFilters}
//               className="w-5 h-5 hover:cursor-pointer"
//             />
//           )}

//           <DrawerTrigger asChild>
//             <div className="flex gap-2 justify-end items-center hover:cursor-pointer text-primary">
//               Filters
//               <FunnelIcon className="w-5 h-5" />
//             </div>
//           </DrawerTrigger>
//         </div>
//       </div>
//       <DrawerContent className="custom-drawer justify-self-center" id="exercise-filters-drawer-content">
//         <DrawerHeader>
//           <div className="flex flex-col gap-2">
//             <DrawerTitle className="text-center text-3xl">Filters</DrawerTitle>
//             <DrawerDescription className="hidden">Exercise Filtering</DrawerDescription>
//             <Separator className="h-1"></Separator>
//           </div>
//         </DrawerHeader>
//         <div className="flex flex-col gap-4 px-4 flex-1 my-4" id="exercise-filters-filter_by">
//           <ExerciseFilter
//             title="Equipment"
//             data={Object.values(ExerciseEquipment)}
//             selectedItems={selectedEquipment}
//             setSelectedItems={setSelectedEquipment}
//           />
//           <ExerciseFilter
//             title="Muscle Group"
//             data={Object.values(MuscleGroup)}
//             selectedItems={selectedMuscle}
//             setSelectedItems={setSelectedMuscle}
//           />
//           <ExerciseFilter
//             title="Exercise Type"
//             data={Object.values(ExerciseType)}
//             selectedItems={selectedType}
//             setSelectedItems={setSelectedType}
//           />
//         </div>
//         <DrawerFooter className="pt-2 row-span-1" id="exercise-filters-drawer-footer">
//           <DrawerClose asChild id="exercise-filters-drawer-close">
//             <Button variant="secondary">Close</Button>
//           </DrawerClose>
//         </DrawerFooter>
//       </DrawerContent>
//     </Drawer>
//   );
// }
