import { useState, useEffect, useRef, useCallback } from 'react';

interface DropdownCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

interface UseDropdownPositionOptions {
  portalId: string;
  menuHeight?: number;
  minWidth?: number;
}

export function useDropdownPosition(options: UseDropdownPositionOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<DropdownCoords>({ left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = useCallback(() => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = options.menuHeight || 300;

      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        setCoords({
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: Math.max(rect.width, options.minWidth || 0),
        });
      } else {
        setCoords({
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, options.minWidth || 0),
        });
      }
    }
    setIsOpen((prev) => !prev);
  }, [isOpen, options.menuHeight, options.minWidth]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portal = document.getElementById(options.portalId);
        if (portal && portal.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      const portal = document.getElementById(options.portalId);
      if (portal && portal.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, options.portalId]);

  return {
    isOpen,
    setIsOpen,
    coords,
    containerRef,
    toggleOpen,
  };
}
