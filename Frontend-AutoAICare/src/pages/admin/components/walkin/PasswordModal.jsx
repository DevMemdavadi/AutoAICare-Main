import React from 'react';
import { Button, Modal } from '@/components/ui';
import { Check, Copy } from 'lucide-react';

const PasswordModal = ({
    isOpen,
    onClose,
    customerPassword,
    customerData,
    copyPassword,
    passwordCopied
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Customer Account Created"
        >
            <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-3">
                        A new customer account has been created. Please share these
                        credentials with the customer:
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Name:</span>
                            <span className="text-sm font-semibold text-gray-900">
                                {customerPassword?.name}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                                Email:
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                                {customerData.email || '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                                Phone:
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                                {customerPassword?.phone}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                                Password:
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-gray-900 font-mono bg-white px-3 py-1 rounded border">
                                    {customerPassword?.password}
                                </span>
                                <button
                                    onClick={copyPassword}
                                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                                    title="Copy password"
                                >
                                    {passwordCopied ? (
                                        <Check className="text-green-600" size={18} />
                                    ) : (
                                        <Copy className="text-blue-600" size={18} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> The password is generated based on the
                        customer's name and phone number. Please inform the customer to
                        change their password after first login.
                    </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-800">
                        <strong>🎁 Referral Code:</strong> A unique referral code will be automatically
                        generated for this customer after they complete their first service. They can then
                        share this code with friends to earn rewards!
                    </p>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={onClose}>Continue</Button>
            </div>
        </Modal>
    );
};

export default PasswordModal;
