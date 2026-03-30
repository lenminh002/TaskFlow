"use client"; // Marks this component to run only in the browser (client-side) because it uses DOM events like scroll

import React, { useRef } from "react";

// BoardContainer wrap the components we want to apply horizontal scroll to
export default function BoardContainer({
    children, // The elements placed inside this container (such as the Columns)
    className // Additional CSS classes passed from the parent (like `styles.board`)
}: {
    children: React.ReactNode;
    className?: string;
}) {
    // 1. Create a reference to the DOM element so we can directly control its scroll position
    const scrollRef = useRef<HTMLDivElement>(null);

    // 2. This function listens for when the mouse wheel is scrolled inside this element
    const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        // Only run if the container actually exists on the screen
        if (!scrollRef.current) return;

        // e.deltaY gives us the amount the scroll wheel moved vertically
        // If the user scrolls up or down (deltaY is not zero), we intercept it
        if (e.deltaY !== 0) {
            // Check if the scroll originated from a vertically scrollable element (like a column)
            let target = e.target as HTMLElement | null;
            let isInsideScrollable = false;

            while (target && target !== scrollRef.current) {
                const style = window.getComputedStyle(target);
                // If the element is set to scroll vertically, we shouldn't translate its vertical scroll
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    // Check if it actually has content to scroll
                    if (target.scrollHeight > target.clientHeight) {
                        isInsideScrollable = true;
                        break;
                    }
                }
                target = target.parentElement;
            }

            // If we are scrolling inside a column, let the native vertical scroll happen
            if (isInsideScrollable) {
                return;
            }

            // Take the vertical scroll amount and apply it to the horizontal scroll position (scrollLeft) instead!
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    // 3. Render a div that attaches our `scrollRef` and our mouse wheel listener `onWheel`
    return (
        <div
            ref={scrollRef}
            className={className}
            onWheel={onWheel}
        >
            {children}
        </div>
    );
}
