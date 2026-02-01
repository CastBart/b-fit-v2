// export function SupersetDrawer({
//   exercise,
//   onClose,
//   onSelect,
//   supersetManager,
// }: SupersetDrawerProps) {
//   return (
//     exercise &&
//     supersetManager && (
//       <Drawer
//         open={!!exercise}
//         onOpenChange={onClose}
//         shouldScaleBackground={false}
//       >
//         <DrawerContent className="w-screen lg:w-[600px] justify-self-center">
//           <DrawerHeader>
//             <div className="flex flex-col gap-2">
//               <DrawerTitle className="text-center text-3xl">
//                 Super Set
//               </DrawerTitle>
//               <DrawerDescription className="hidden">
//                 Select an exercise
//               </DrawerDescription>
//               <Separator className="h-1" />
//             </div>
//           </DrawerHeader>
//           <div className="px-4 space-y-4">
//             {supersetManager.canSupersetWithPrev(exercise) && (
//               <Button
//                 variant={"secondary"}
//                 className="w-full min-h-[48px]"
//                 onClick={() => {
//                   supersetManager.supersetWithPrev(exercise);
//                   onSelect();
//                 }}
//               >
//                 Superset with Previous
//               </Button>
//             )}
//             {supersetManager.canRemoveSupersetWithPrev(exercise) && (
//               <Button
//                 variant={"secondary"}
//                 className="w-full min-h-[48px]"
//                 onClick={() => {
//                   supersetManager.removeSupersetWithPrev(exercise);
//                   onSelect();
//                 }}
//               >
//                 Remove from Previous Superset
//               </Button>
//             )}
//             {supersetManager.canSupersetWithNext(exercise) && (
//               <Button
//                 variant={"secondary"}
//                 className="w-full min-h-[48px]"
//                 onClick={() => {
//                   supersetManager.supersetWithNext(exercise);
//                   onSelect();
//                 }}
//               >
//                 Superset with Next
//               </Button>
//             )}
//             {supersetManager.canRemoveSupersetWithNext(exercise) && (
//               <Button
//                 variant={"secondary"}
//                 className="w-full min-h-[48px]"
//                 onClick={() => {
//                   supersetManager.removeSupersetWithNext(exercise);
//                   onSelect();
//                 }}
//               >
//                 Remove from Next Superset
//               </Button>
//             )}
//           </div>
//           <DrawerFooter>
//             <DrawerClose asChild>
//               <Button variant="secondary">Close</Button>
//             </DrawerClose>
//           </DrawerFooter>
//         </DrawerContent>
//       </Drawer>
//     )
//   );
// }
