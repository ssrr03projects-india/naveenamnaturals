import { useState, useEffect, useCallback } from 'react';

const useLoginPopup = () => {
    const [openLoginPopup, setOpenLoginPopup] = useState(false)

    const handleLoginPopup = () => {
        setOpenLoginPopup((toggleOpen) => !toggleOpen)
    }

    const closeLoginPopup = () => {
        setOpenLoginPopup(false)
    }

    // Check if the click event occurs outside the popup.
    const handleClickOutsideLoginPopup = useCallback((event: Event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const clickedInsidePopup = Boolean(target.closest('.login-popup'));
        const clickedAccountIcon = Boolean(target.closest('.user-icon'));

        if (openLoginPopup && !clickedInsidePopup && !clickedAccountIcon) {
            setOpenLoginPopup(false)
        }
    }, [openLoginPopup])

    useEffect(() => {
        // Add a global click event to track clicks outside the popup.
        document.addEventListener('click', handleClickOutsideLoginPopup);

        // Cleanup to avoid memory leaks.
        return () => {
            document.removeEventListener('click', handleClickOutsideLoginPopup);
        };
    }, [handleClickOutsideLoginPopup, openLoginPopup])

    return {
        openLoginPopup,
        handleLoginPopup,
        closeLoginPopup,
    }
}

export default useLoginPopup
