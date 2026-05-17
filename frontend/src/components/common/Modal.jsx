/**
 * Modal — thin wrapper around BaseModal.
 * All existing usages of <Modal> continue to work unchanged.
 * New modals should import BaseModal directly.
 */
import React from 'react';
import BaseModal from './BaseModal';

const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-3xl' }) => (
    <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        footer={footer}
        maxWidth={maxWidth}
    >
        {children}
    </BaseModal>
);

export default Modal;
