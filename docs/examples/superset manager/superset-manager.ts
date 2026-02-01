// import { ExerciseNode } from "./exercise-linked-list";

// export class SupersetManager {
//   groups: Record<string, { exercises: ExerciseNode[] }> = {};

//   constructor(public head: ExerciseNode) {
//     let current: ExerciseNode | null = head;
//     const visited = new Set<ExerciseNode>();
//     while (current) {
//       if (current.supersetGroupId) {
//         if (!this.groups[current.supersetGroupId]) {
//           this.groups[current.supersetGroupId] = { exercises: [] };
//         }
//         if (!visited.has(current)) {
//           this.groups[current.supersetGroupId].exercises.push(current);
//           visited.add(current);
//         }
//       }
//       current = current.next;
//     }
//   }
//   updateHeadNode(headNode: ExerciseNode) {
//     this.head = headNode;
//     let current: ExerciseNode | null = headNode;
//     const visited = new Set<ExerciseNode>();
//     while (current) {
//       if (current.supersetGroupId) {
//         if (!this.groups[current.supersetGroupId]) {
//           this.groups[current.supersetGroupId] = { exercises: [] };
//         }
//         if (!visited.has(current)) {
//           this.groups[current.supersetGroupId].exercises.push(current);
//           visited.add(current);
//         }
//       }
//       current = current.next;
//     }
//   }

//   // Helper: Create a new group
//   private createGroup(nodes: ExerciseNode[]): string {
//     const groupId = crypto.randomUUID();
//     nodes.forEach((node) => (node.supersetGroupId = groupId));
//     this.groups[groupId] = { exercises: [...nodes] };
//     return groupId;
//   }

//   reassignSupersetGroups(movedNode: ExerciseNode) {
//     const movedNodeGroup = movedNode.supersetGroupId;
//     const prev = movedNode.prev;
//     const next = movedNode.next;
//     const prevGroup = prev?.supersetGroupId || null;
//     const nextGroup = next?.supersetGroupId || null;

//     // 1. Remove from current group if no longer adjacent to any member of its original group
//     if (
//       movedNodeGroup &&
//       prev?.supersetGroupId !== movedNodeGroup &&
//       next?.supersetGroupId !== movedNodeGroup
//     ) {
//       const group = this.groups[movedNodeGroup];
//       if (group) {
//         group.exercises = group.exercises.filter((n) => n !== movedNode);
//         if (group.exercises.length < 2) {
//           group.exercises.forEach((n) => (n.supersetGroupId = null));
//           delete this.groups[movedNodeGroup];
//         }
//       }
//       movedNode.supersetGroupId = null;
//     }

//     // 2. Reassign based on adjacency
//     if (prevGroup && nextGroup && prevGroup === nextGroup) {
//       // Between two nodes in the same group
//       const group = this.groups[prevGroup];
//       movedNode.supersetGroupId = prevGroup;
//       const prevIndex = group.exercises.indexOf(prev!);
//       group.exercises.splice(prevIndex + 1, 0, movedNode);
//     } else if (prevGroup && movedNodeGroup === prevGroup) {
//       // Only previous is in a group
//       const group = this.groups[prevGroup];
//       movedNode.supersetGroupId = prevGroup;
//       const prevIndex = group.exercises.indexOf(prev!);
//       group.exercises.splice(prevIndex + 1, 0, movedNode);
//     } else if (nextGroup && movedNodeGroup === nextGroup) {
//       // Only next is in a group
//       const group = this.groups[nextGroup];
//       movedNode.supersetGroupId = nextGroup;
//       const nextIndex = group.exercises.indexOf(next!);
//       group.exercises.splice(nextIndex, 0, movedNode);
//     }
//   }

//   canSupersetWithNext(node: ExerciseNode) {
//     return (
//       node.next !== null &&
//       ((node.supersetGroupId === null && node.next.supersetGroupId === null) ||
//         node.supersetGroupId !== node.next.supersetGroupId)
//     );
//   }
//   canSupersetWithPrev(node: ExerciseNode) {
//     return (
//       node.prev !== null &&
//       ((node.supersetGroupId === null && node.prev.supersetGroupId === null) ||
//         node.supersetGroupId !== node.prev.supersetGroupId)
//     );
//   }
//   canRemoveSupersetWithPrev(node: ExerciseNode) {
//     return (
//       node.prev &&
//       node.prev.supersetGroupId &&
//       node.prev.supersetGroupId === node.supersetGroupId
//     );
//   }

//   canRemoveSupersetWithNext(node: ExerciseNode) {
//     return (
//       node.next &&
//       node.next.supersetGroupId &&
//       node.next.supersetGroupId === node.supersetGroupId
//     );
//   }

//   supersetWithNext(node: ExerciseNode) {
//     if (!node.next) return;

//     if (node.supersetGroupId && node.next.supersetGroupId) {
//       // Both nodes already in different groups — merge groups
//       const groupId = node.supersetGroupId;
//       const nextGroupId = node.next.supersetGroupId;

//       if (groupId === nextGroupId) return; // Already same group

//       const currentGroup = this.groups[groupId];
//       const nextGroup = this.groups[nextGroupId];

//       nextGroup.exercises.forEach((n) => {
//         n.supersetGroupId = groupId;
//         currentGroup.exercises.push(n);
//       });

//       delete this.groups[nextGroupId];
//     } else if (node.supersetGroupId) {
//       // Only node has a group — add next to it
//       node.next.supersetGroupId = node.supersetGroupId;
//       this.groups[node.supersetGroupId].exercises.push(node.next);
//     } else if (node.next.supersetGroupId) {
//       // Only next has a group — add node to it
//       node.supersetGroupId = node.next.supersetGroupId;
//       this.groups[node.next.supersetGroupId].exercises.push(node);
//     } else {
//       // Neither in group — create new group
//       this.createGroup([node, node.next]);
//     }
//   }

//   supersetWithPrev(node: ExerciseNode) {
//     if (!node.prev) return;
//     if (node.supersetGroupId && node.prev.supersetGroupId) {
//       // Both nodes already in different groups — merge groups
//       const groupId = node.supersetGroupId;
//       const prevGroupId = node.prev.supersetGroupId;

//       if (groupId === prevGroupId) return; // Already same group

//       const currentGroup = this.groups[groupId];
//       const prevGroup = this.groups[prevGroupId];

//       prevGroup.exercises.forEach((n) => {
//         n.supersetGroupId = groupId;
//         currentGroup.exercises.push(n);
//       });

//       delete this.groups[prevGroupId];
//     } else if (node.supersetGroupId) {
//       // Only node has a group — add prev to it
//       node.prev.supersetGroupId = node.supersetGroupId;
//       this.groups[node.supersetGroupId].exercises.push(node.prev);
//     } else if (node.prev.supersetGroupId) {
//       // Only prev has a group — add node to it
//       node.supersetGroupId = node.prev.supersetGroupId;
//       this.groups[node.prev.supersetGroupId].exercises.push(node);
//     } else {
//       // Neither in group — create new group
//       this.createGroup([node.prev, node]);
//     }
//   }

//   removeSupersetWithPrev(node: ExerciseNode) {
//     if (!node.prev || node.prev.supersetGroupId !== node.supersetGroupId)
//       return;
//     const groupId = node.supersetGroupId;
//     if (!groupId) return;

//     const group = this.groups[groupId];
//     if (!group) return;

//     // Ensure the group contains at least two nodes
//     const isOnlyTwo = group.exercises.length === 2;
//     if (isOnlyTwo) {
//       // If only two exercises in the group, remove the group entirely
//       node.supersetGroupId = null;
//       node.prev.supersetGroupId = null;
//       delete this.groups[groupId];
//     } else {
//       // Find the index of the node being removed
//       const index = group.exercises.indexOf(node);

//       if (index === -1) return; // Safety check in case the previous node isn't in the group

//       // Split the group into left and right parts
//       const leftPart = group.exercises.slice(0, index);
//       const rightPart = group.exercises.slice(index); // Skip node.prev

//       // Handle the left part (all nodes up to and including the node being removed)
//       if (leftPart.length === 1) {
//         leftPart[0].supersetGroupId = null; // Only one node, remove group ID
//       } else if (leftPart.length > 1) {
//         group.exercises = leftPart; // Retain the left part of the group
//       }

//       // Handle the right part (all nodes after the node being removed)
//       if (rightPart.length === 1) {
//         rightPart[0].supersetGroupId = null; // Only one node, remove group ID
//       } else if (rightPart.length > 1) {
//         this.createGroup(rightPart); // Create a new group for the right part
//       }

//       // If left part had only one node, delete the original group
//       if (leftPart.length === 1) {
//         delete this.groups[groupId];
//       }
//     }
//   }

//   removeSupersetWithNext(node: ExerciseNode) {
//     if (!node.next || node.next.supersetGroupId !== node.supersetGroupId)
//       return;

//     const groupId = node.supersetGroupId;
//     if (!groupId) return;
//     const group = this.groups[groupId];

//     if (!group) return;

//     const isOnlyTwo = group.exercises.length === 2;
//     if (isOnlyTwo) {
//       node.supersetGroupId = null;
//       node.next.supersetGroupId = null;
//       delete this.groups[groupId];
//     } else {
//       // More than two — split the group
//       const index = group.exercises.indexOf(node.next);

//       const leftPart = group.exercises.slice(0, index);
//       const rightPart = group.exercises.slice(index);

//       // Handle left part
//       if (leftPart.length === 1) {
//         leftPart[0].supersetGroupId = null;
//       } else {
//         group.exercises = leftPart;
//       }

//       // Handle right part
//       if (rightPart.length === 1) {
//         rightPart[0].supersetGroupId = null;
//       } else {
//         this.createGroup(rightPart);
//       }

//       // If leftPart had only one node, delete the original group
//       if (leftPart.length === 1) {
//         delete this.groups[groupId];
//       }
//     }
//   }
// }
