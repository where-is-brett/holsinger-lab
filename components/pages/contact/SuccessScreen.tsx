import Image from 'next/image'
import successSVG from 'public/success.svg'

const SuccessScreen = ({ message }) => {
  return (
    <div
      className={`mb-16 flex flex-col items-center justify-center space-y-8 text-center`}
    >
      <Image
        src={successSVG}
        alt="Submission success - Web illustrations by Storyset"
        className="h-fit max-h-96"
      />
      <br />
      <p>{message}</p>
    </div>
  )
}

export default SuccessScreen
