import { Transition, Dialog } from "@headlessui/react"
import { Fragment } from "react";

const ErrorDialog = ({ handleDialogClose, showDialog, message }) => {
    return (

        <Transition.Root show={showDialog} as={Fragment}>
            <Dialog
                as="div"
                className="fixed inset-0 z-50 overflow-y-auto"
                onClose={handleDialogClose}
            >
                <div className="flex items-center justify-center min-h-screen">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 bg-black opacity-60" />
                    </Transition.Child>

                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <div className="bg-background max-w-md mx-auto text-center p-4 space-y-5">
                            <Dialog.Title
                                as="h3"
                                className="text-lg font-semibold mb-2"
                            >
                                Submission Failed
                            </Dialog.Title>
                            <p className="text-justify px-4 text-gray-800">
                                {message}
                            </p>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={handleDialogClose}
                                    className="px-4 py-2 bg-gray-900 text-white"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default ErrorDialog;