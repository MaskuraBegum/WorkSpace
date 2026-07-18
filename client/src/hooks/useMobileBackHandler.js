import { useEffect } from 'react';

export default function useMobileBackHandler(isOpen, onClose) {
  useEffect(() => {
    // Only run this logic if the view/window is active/open
    if (!isOpen) return;

    // Push a dummy state into the history stack when the window renders
    window.history.pushState({ modalOpen: true }, '');

    const handlePopState = (event) => {
      // Prevent standard browser navigation, fire your close callback instead
      onClose();
    };

    // Listen for the native device back action
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up the history entry if the component unmounts naturally
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}
