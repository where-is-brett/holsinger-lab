import Image from 'next/image'
import successSVG from 'public/success.svg'

const SuccessScreen = ({ message }) => {
    return (
        <div className={`flex flex-col items-center justify-center text-center space-y-8 mb-16`}>
            <Image
                src={successSVG}
                alt='Submission success - Web illustrations by Storyset'
                className='h-fit max-h-96'
            />
            <br />
            <p>{message}</p>
        </div>
    )
}

export default SuccessScreen;