import { createContext, useContext, useMemo, useState } from 'react';

const SOPModalContext = createContext(null);

export function SOPModalProvider({ children }) {
  const [modalState, setModalState] = useState({
    create: false,
    edit: false,
    share: false,
    publish: false,
  });

  const openModal = (name) => {
    setModalState((prev) => ({ ...prev, [name]: true }));
  };

  const closeModal = (name) => {
    setModalState((prev) => ({ ...prev, [name]: false }));
  };

  const value = useMemo(() => ({ modalState, openModal, closeModal }), [modalState]);

  return <SOPModalContext.Provider value={value}>{children}</SOPModalContext.Provider>;
}

export function useSOPModal() {
  const context = useContext(SOPModalContext);
  if (!context) {
    throw new Error('useSOPModal must be used within SOPModalProvider');
  }
  return context;
}

export default SOPModalContext;
