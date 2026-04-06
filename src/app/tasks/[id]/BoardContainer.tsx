"use client";
import React, { useRef, useCallback } from "react";

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
    const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        // Only run if the container actually exists on the screen
        if (!scrollRef.current) return;

        // e.deltaY gives us the amount the scroll wheel moved vertically
        // If the user scrolls up or down (deltaY is not zero), we intercept it
        if (e.deltaY !== 0) {
            // 1. Where did the scroll happen? We start at the exact deepest element hovered over.
            let target = e.target as HTMLElement | null;
            let scrollableTarget: HTMLElement | null = null;

            // 2. We walk upwards through the HTML tree to see if any parent is scrollable.
            //    We stop if we run out of parents or if we reach the main board container.
            while (target && target !== scrollRef.current) {
                const style = window.getComputedStyle(target);

                // 3. Does this element's CSS allow it to scroll vertically? (Like our columns)
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {

                    // 4. Does it actually have enough content inside of it to show a scrollbar right now?
                    // target.scrollHeight = the total hidden height of the content.
                    // target.clientHeight = the visible height of the box on the screen.
                    if (target.scrollHeight > target.clientHeight) {
                        scrollableTarget = target; // Yes! We found the nearest scrollable element.
                        break; // Stop climbing the tree.
                    }
                }

                // Move up to the next parent element to check that one.
                target = target.parentElement;
            }

            // 5. If we found a nested scroll container (card content / column),
            //    scroll it directly and stop here.
            if (scrollableTarget) {
                e.preventDefault();
                scrollableTarget.scrollTop += e.deltaY;
                return;
            }

            // Take the vertical scroll amount and apply it to the horizontal scroll position (scrollLeft) instead!
            scrollRef.current.scrollLeft += e.deltaY;
        }
    }, []);

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
