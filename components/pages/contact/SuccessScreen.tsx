import Image from 'next/image'
import successSVG from 'public/success.svg'

const SuccessScreen = ({ message }) => {
    return (
        <div className='flex flex-col items-center text-center space-y-4 mb-16 top-0 bottom-0'>
            <Image
                src={successSVG}
                alt='Submission success - Web illustrations by Storyset'
                className='w-1/3 max-w-md'
            />
            <br />
            <p>{message}</p>
        </div>
    )
}

export default SuccessScreen;