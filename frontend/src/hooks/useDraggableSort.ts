import type React from 'react';
import { useState } from 'react';

export function useDraggableSort(onReorder: (dragIdx: number, dropIdx: number) => void) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const getDragHandlers = (index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setDraggedIdx(index);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIdx((prev) => (prev === index ? prev : index));
    },
    onDragLeave: () => {
      if (dragOverIdx === index) setDragOverIdx(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedIdx !== null && draggedIdx !== index) {
        onReorder(draggedIdx, index);
      }
      setDraggedIdx(null);
      setDragOverIdx(null);
    },
    onDragEnd: () => {
      setDraggedIdx(null);
      setDragOverIdx(null);
    },
  });

  const getIndicatorClass = (index: number) => {
    if (dragOverIdx !== index || draggedIdx === null || draggedIdx === index) return '';
    return draggedIdx < index
      ? '!border-r-primary-500 !border-r-2'
      : '!border-l-primary-500 !border-l-2';
  };

  return {
    getDragHandlers,
    getIndicatorClass,
    draggedIdx,
    dragOverIdx,
  };
}
