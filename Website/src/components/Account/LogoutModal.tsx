"use client";
import React from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl mx-4 w-full max-w-md relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Logout
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Icon.X size={20} />
            </button>
          </div>
          <p className="text-secondaryLegacy mb-6">
            Are you sure you want to logout? You will need to login again to
            access your account.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary bg-surface border border-white rounded-md hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-surface rounded-md transition-colors"
              style={{ backgroundColor: "var(--red)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "color-mix(in srgb, var(--red) 85%, var(--secondary))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--red)";
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
