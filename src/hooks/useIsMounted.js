import { useEffect, useRef } from 'react';

/**
 * Custom hook to track if a component is currently mounted
 * Useful for preventing state updates after component unmount in async operations
 *
 * @returns {React.MutableRefObject<boolean>} Ref that is true when mounted, false when unmounted
 *
 * @example
 * const isMountedRef = useIsMounted();
 *
 * someAsyncOperation().then((data) => {
 *   if (isMountedRef.current) {
 *     setState(data);
 *   }
 * });
 */
const useIsMounted = () => {
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return isMountedRef;
};

export default useIsMounted;
