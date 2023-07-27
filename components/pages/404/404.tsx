import Image from 'next/image';
import notFoundSVG from 'public/404.svg'
import Link from 'next/link';

const NotFound = () => {
    return (
        <div className="w-80 md:w-[40vw] max-w-md mx-auto space-y-6">
            <Image
                src={notFoundSVG}
                alt={'Page Not Found - Web illustrations by Storyset'}
                className=''
            />
            <p>We couldn't find the page you were looking for. Perhaps the <Link href={'/'} className='text-black hover:text-gray-600 underline'>home page</Link>?</p>
        </div>
    )
}

export default NotFound;