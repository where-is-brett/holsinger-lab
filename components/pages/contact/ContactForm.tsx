import React, { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import Image from 'next/image';
import successSVG from 'public/success.svg'
import ErrorDialog from './ErrorDialog';

interface Status {
    submitted: boolean;
    submitting: boolean;
    info: { error: boolean; msg: string | null };
}

interface Inputs {
    name: string;
    email: string;
    message: string;
}

const ContactForm: React.FC = () => {

    const [status, setStatus] = useState<Status>({
        submitted: false,
        submitting: false,
        info: { error: false, msg: null },
    });

    const [inputs, setInputs] = useState<Inputs>({
        name: '',
        email: '',
        message: '',
    });

    const handleServerResponse = (ok: boolean, msg: string) => {
        if (ok) {
            setStatus((prevStatus) => ({
                ...prevStatus,
                submitted: true,
                submitting: false,
                info: { error: false, msg: msg },
            }));
            setInputs({
                name: '',
                email: '',
                message: '',
            });
        } else {
            setStatus((prevStatus) => ({
                ...prevStatus,
                info: { error: true, msg: msg },
            }));
        }
    };

    const handleOnChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.persist();
        setInputs((prev) => ({
            ...prev,
            [e.target.id]: e.target.value,
        }));
        setStatus({
            submitted: false,
            submitting: false,
            info: { error: false, msg: null },
        });
    };

    const handleOnSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus((prevStatus) => ({ ...prevStatus, submitting: true }));
        axios({
            method: 'POST',
            url: `https://formspree.io/f/${process.env.FORMSPREE_ENDPOINT}`,
            data: inputs,
        })
            .then((response) => {
                handleServerResponse(true, 'Thank you for reaching out to us! Your message has been successfully submitted.');
            })
            .catch((error) => {
                handleServerResponse(false, 'Sorry, there was an issue with submitting your message. Please try again later.'); //error.response.data.error
            });
    };

    // Reset status on error dialog close
    const handleDialogClose = () => {
        setStatus((prevStatus) => ({
            ...prevStatus,
            submitting: false,
            info: { error: false, msg: null },
        }));
    };


    return (
        <>
            {
                status.submitted ? (
                    !status.info.error && status.info.msg &&
                    <div className='flex flex-col items-center text-center space-y-4'>
                        <Image
                            src={successSVG}
                            alt='Submission success - Web illustrations by Storyset'
                            className='w-1/3 max-w-md'
                        />
                        <p>{status.info.msg}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center space-y-6">
                        <h1 className="text-3xl font-semibold">Contact Us</h1>

                        <form onSubmit={handleOnSubmit} className="flex flex-col space-y-4 w-full md:w-3/4 max-w-xl">
                            <p className="text-base md:text-lg font-serif text-gray-600">
                                We would love to hear from you! Whether you have a question, suggestion, or just want to say hello, feel free to send us a message using the form below.
                            </p>
                            <div className="flex flex-col space-y-1">
                                <label htmlFor="name" className="text-lg font-medium">
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    onChange={handleOnChange}
                                    required
                                    value={inputs.name}
                                    className="border border-gray-300 px-4 py-2 w-full"
                                />
                            </div>

                            <div className="flex flex-col space-y-1">
                                <label htmlFor="email" className="text-lg font-medium">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="_replyto"
                                    onChange={handleOnChange}
                                    required
                                    value={inputs.email}
                                    className="border border-gray-300 px-4 py-2 w-full"
                                />
                            </div>

                            <div className="flex flex-col space-y-1">
                                <label htmlFor="message" className="text-lg font-medium">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    onChange={handleOnChange}
                                    required
                                    value={inputs.message}
                                    className="border border-gray-300 px-4 py-2 w-full"
                                    rows={4}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status.submitting}
                                className="bg-gray-900 text-white px-6 py-3 w-full"
                            >
                                {!status.submitting ? (!status.submitted ? 'Submit' : 'Submitted') : 'Submitting...'}
                            </button>
                        </form>

                        {/* Show the dialog if showDialog is true */}
                        <ErrorDialog 
                            handleDialogClose={handleDialogClose} 
                            showDialog={status.info.error} 
                            message={status.info.msg || ''} 
                        />

                    </div>
                )
            }

        </>


    );
};

export default ContactForm;
